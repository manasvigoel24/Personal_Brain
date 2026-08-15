import { hasGoogleTokens } from './connectors/googleAuth.js';
import { searchGmailMessages } from './connectors/gmailConnector.js';
import { listDriveFiles, searchDriveFiles } from './connectors/driveConnector.js';
import { loadData as loadLocalData } from './gbrainStore.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function decodeBody(payload) {
  if (!payload) return '';
  if (payload.parts) {
    return payload.parts.map(decodeBody).filter(Boolean).join('\n');
  }
  if (payload.body?.data) {
    try {
      return Buffer.from(payload.body.data, 'base64url').toString('utf8');
    } catch {
      return Buffer.from(payload.body.data, 'base64').toString('utf8');
    }
  }
  return '';
}

function getHeader(headers, name) {
  return (
    headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ||
    ''
  );
}

function extractAttachments(payload) {
  if (!payload) return [];
  const results = [];
  if (payload.filename && payload.filename.trim()) {
    results.push(payload.filename.trim());
  }
  if (payload.parts) {
    payload.parts.forEach((p) => results.push(...extractAttachments(p)));
  }
  return results;
}

function normaliseMessage(message) {
  const headers = message.payload?.headers || [];
  const internalDate = Number(message.internalDate || 0);
  const decodedBody = decodeBody(message.payload);
  const body = decodedBody.trim() || message.snippet || '';

  return {
    id: message.id,
    threadId: message.threadId,
    subject: getHeader(headers, 'Subject') || '(No subject)',
    from: getHeader(headers, 'From'),
    to: getHeader(headers, 'To'),
    cc: getHeader(headers, 'Cc'),
    participants: [
      getHeader(headers, 'From'),
      getHeader(headers, 'To'),
      getHeader(headers, 'Cc'),
    ].filter(Boolean),
   
    body: body.substring(0, 2000),
    snippet: message.snippet || '',
    labels: message.labelIds || [],
    status: (message.labelIds || []).includes('UNREAD') ? 'unread' : 'read',
    attachments: extractAttachments(message.payload),
    internalDate,
    date: internalDate
      ? new Date(internalDate).toISOString()
      : getHeader(headers, 'Date'),
  };
}

function normaliseDriveFile(file) {
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    description: file.description || '',
    webViewLink: file.webViewLink || '',
    modifiedTime: file.modifiedTime || '',
    size: file.size ? `${Math.round(Number(file.size) / 1024)} KB` : '',
    owners: (file.owners || []).map((o) => o.displayName || o.emailAddress || '').filter(Boolean),
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Build a Gmail search query string from a natural-language question.
 * Uses the most relevant keywords so Gmail's own search engine filters results.
 */
export function buildGmailQuery(question) {
  const stopWords = new Set([
    'a','an','the','is','are','was','were','be','been','being','have','has',
    'had','do','does','did','will','would','could','should','may','might',
    'shall','can','i','me','my','we','our','you','your','he','she','it',
    'they','them','their','this','that','these','those','and','or','but',
    'not','of','in','on','at','to','for','with','about','from','by','as',
    'if','so','find','what','which','who','how','when','where','list','show',
    'get','give','tell','send','sent','ever','any','all','each','email',
    'emails','mail','message','messages','received','regarding','latest',
    'recent','last','first','new','old','please','want','need',
  ]);

  const keywords = question
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  return keywords.slice(0, 5).join(' OR ');
}

/**
 * Load data from Google (Gmail + Drive) using query-aware search,
 * or fall back to local sample data if not authenticated.
 *
 * @param {string} [question] The user's question — used to build the Gmail/Drive search query
 */
export async function loadData(question = '') {
  if (!hasGoogleTokens()) {
    return loadLocalData();
  }
  try {
    const gmailQuery = buildGmailQuery(question);

    // Run Gmail search and Drive listing in parallel
    const [rawMessages, rawFiles, searchedFiles] = await Promise.all([
      searchGmailMessages(gmailQuery, 30),
      listDriveFiles(),
      // Also run a targeted Drive search if we have keywords
      gmailQuery
        ? searchDriveFiles(question.substring(0, 100)).catch(() => [])
        : Promise.resolve([]),
    ]);

    const gmail = rawMessages.map(normaliseMessage);

    // Merge Drive results — searched files first (most relevant), then all files
    const seenIds = new Set();
    const driveAll = [...searchedFiles, ...rawFiles].filter((f) => {
      if (seenIds.has(f.id)) return false;
      seenIds.add(f.id);
      return true;
    });
    const drive = driveAll.map(normaliseDriveFile);

    return { gmail, drive, source: 'google' };
  } catch (error) {
    console.error('Failed to load Google data, falling back to local store.', error);
    return loadLocalData();
  }
}

// ─── Search helpers (used by reasoner) ─────────────────────────────────────

/** Extract meaningful keywords from a natural-language query. */
function extractKeywords(query) {
  const stopWords = new Set([
    'a','an','the','is','are','was','were','be','been','being','have','has',
    'had','do','does','did','will','would','could','should','may','might',
    'shall','can','i','me','my','we','our','you','your','he','she','it',
    'they','them','their','this','that','these','those','and','or','but',
    'not','of','in','on','at','to','for','with','about','from','by','as',
    'if','so','find','what','which','who','how','when','where','list','show',
    'get','give','tell','send','sent','ever','any','all','each','email',
    'emails','mail','message','messages','received','regarding',
  ]);
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

export function findEmails(query, data) {
  const keywords = extractKeywords(query);
  if (!keywords.length) return data.gmail;
  const scored = data.gmail.map((email) => {
    const haystack = [
      email.subject,
      email.body,
      email.from,
      email.to,
      ...(email.participants || []),
    ].join(' ').toLowerCase();
    const score = keywords.filter((kw) => haystack.includes(kw)).length;
    return { email, score };
  });

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ email }) => email);
}

export function findDriveFiles(query, data) {
  const keywords = extractKeywords(query);
  if (!keywords.length) return data.drive;
  const scored = data.drive.map((file) => {
    const haystack = [file.name, file.description || ''].join(' ').toLowerCase();
    const score = keywords.filter((kw) => haystack.includes(kw)).length;
    return { file, score };
  });
  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ file }) => file);
}

export function getUnreadEmails(data) {
  return data.gmail.filter((email) => email.status === 'unread');
}

export function getEmailsInThread(threadId, data) {
  return data.gmail.filter((email) => email.threadId === threadId);
}
