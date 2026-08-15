import { callLLM } from './llm.js';
import {
  findEmails,
  findDriveFiles,
  getUnreadEmails,
  getEmailsInThread,
  loadData,
} from './dataProvider.js';

// ─── Formatting helpers ──────────────────────────────────────────────────────

function formatEmail(e, index) {
  const attachInfo = e.attachments?.length
    ? `\n   Attachments: ${e.attachments.join(', ')}`
    : '';
  const body = (e.body || e.snippet || '').trim().substring(0, 600);
  return (
    `${index + 1}. Subject: "${e.subject}"` +
    `\n   From: ${e.from || '—'}` +
    `\n   To: ${e.to || '—'}` +
    (e.cc ? `\n   CC: ${e.cc}` : '') +
    `\n   Date: ${e.date || '—'}` +
    `\n   Status: ${e.status}` +
    `\n   Thread ID: ${e.threadId}` +
    attachInfo +
    `\n   Body preview:\n   ${body.replace(/\n/g, '\n   ')}`
  );
}

function formatDriveFile(f, index) {
  const parts = [
    `${index + 1}. "${f.name}" (${f.mimeType})`,
    f.modifiedTime ? `   Modified: ${f.modifiedTime}` : '',
    f.size ? `   Size: ${f.size}` : '',
    f.owners?.length ? `   Owner: ${f.owners.join(', ')}` : '',
    f.description ? `   Description: ${f.description}` : '',
    f.webViewLink ? `   Link: ${f.webViewLink}` : '',
  ].filter(Boolean);
  return parts.join('\n');
}

function groupByThread(emails) {
  const threads = {};
  for (const e of emails) {
    const tid = e.threadId || e.id;
    if (!threads[tid]) threads[tid] = [];
    threads[tid].push(e);
  }
  return threads;
}

// ─── Main entry point ────────────────────────────────────────────────────────

export async function answerQuery(question) {
  // Pass question to loadData so it uses Gmail's native search
  const data = await loadData(question);

  // ── Gmail data ──
  // Top relevant emails (scored by keyword match, already sorted)
  const topEmails = findEmails(question, data).slice(0, 25);

  // If no keyword match, still include recent inbox emails for broad questions
  const baseEmails =
    topEmails.length > 0 ? topEmails : data.gmail.slice(0, 15);

  // Unread summary
  const unread = getUnreadEmails(data);

  // Thread context: for each unique thread in topEmails, include all messages
  const threadIds = [...new Set(baseEmails.map((e) => e.threadId).filter(Boolean))];
  const threadMessages = threadIds
    .flatMap((tid) => getEmailsInThread(tid, data))
    .filter((e) => !baseEmails.find((be) => be.id === e.id)); // don't duplicate

  // All emails to show LLM (top matches + their thread siblings)
  const allEmails = [...baseEmails, ...threadMessages].slice(0, 30);

  // ── Drive data ──
  const topFiles = findDriveFiles(question, data).slice(0, 15);
  const baseFiles = topFiles.length > 0 ? topFiles : data.drive.slice(0, 10);

  // ── Build context strings ──
  const emailsContext = allEmails.length
    ? allEmails.map(formatEmail).join('\n\n')
    : 'No emails available.';

  const driveContext = baseFiles.length
    ? baseFiles.map(formatDriveFile).join('\n\n')
    : 'No Drive files available.';

  const statsContext = [
    `Total emails loaded: ${data.gmail.length}`,
    `Total unread: ${unread.length}`,
    `Total Drive files loaded: ${data.drive.length}`,
    `Data source: ${data.source || 'local sample'}`,
  ].join('\n');

  // ── Prompt ──
  const systemPrompt = `You are Personal Brain — a smart assistant with full access to the user's Gmail and Google Drive.

Your job:
- Answer the user's question using ONLY the data provided below. 
- Be specific: quote subjects, names, dates, and file names from the actual data.
- For email threads, reason across all messages in a thread (same Thread ID).
- For cross-source questions (email + Drive), connect the dots explicitly.
- If the data doesn't contain the answer, say clearly what you did find and what's missing. Never fabricate.
- Format responses in clear, readable markdown (bold key terms, use bullet lists for multiple items).
- Never output the characters ** in your response.
- Be conversational, not robotic. Write like a knowledgeable assistant, not a search dump.`;

  const userPrompt = `## User Question
${question}

## Data Statistics
${statsContext}

## Relevant Emails (${allEmails.length} emails, sorted by relevance)
${emailsContext}

## Drive Files (${baseFiles.length} files)
${driveContext}

## Unread Emails Summary (${unread.length} total unread)
${unread.slice(0, 10).map((e) => `- "${e.subject}" from ${e.from || '—'} on ${e.date || '—'}`).join('\n') || 'None'}

---
Please answer the question above using the data provided. Be specific and cite actual email subjects, senders, dates, and file names.`;

  const answer = await callLLM(systemPrompt, userPrompt);
  return (
    answer ||
    "I couldn't find a confident answer in your connected Gmail and Drive data. Try rephrasing your question or connecting your Google account."
  );
}
