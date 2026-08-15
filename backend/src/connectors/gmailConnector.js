import { google } from 'googleapis';
import { getOAuthClient } from './googleAuth.js';

/**
 * List Gmail messages.
 * @param {object} opts
 * @param {string} [opts.q]          Gmail search query (e.g. "stripe payment")
 * @param {number} [opts.maxResults] Max messages to return (default 50)
 * @param {string} [opts.labelIds]   Label filter (default 'INBOX')
 */
export async function listGmailMessages({ q = '', maxResults = 50, labelIds } = {}) {
  const auth = getOAuthClient();
  const gmail = google.gmail({ version: 'v1', auth });

  const params = { userId: 'me', maxResults };
  if (q) params.q = q;
  if (labelIds) params.labelIds = labelIds;

  const res = await gmail.users.messages.list(params);
  return res.data.messages || [];
}

export async function getGmailMessage(id) {
  const auth = getOAuthClient();
  const gmail = google.gmail({ version: 'v1', auth });
  const res = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
  return res.data;
}

/**
 * Search Gmail using its native search syntax and return fully-hydrated messages.
 * Falls back to a broad inbox fetch when no query is given.
 */
export async function searchGmailMessages(q = '', maxResults = 30) {
  const auth = getOAuthClient();
  const gmail = google.gmail({ version: 'v1', auth });
  const inboxFetch = gmail.users.messages.list({
    userId: 'me',
    maxResults: 30,
    q: 'in:inbox',
  });

  const searches = [inboxFetch];

  if (q && q.trim()) {
    searches.push(
      gmail.users.messages.list({ userId: 'me', maxResults, q: q.trim() })
    );
  }

  const results = await Promise.all(searches);

  // Merge unique message IDs from both result sets.
  const seen = new Set();
  const ids = [];
  for (const res of results) {
    for (const msg of res.data.messages || []) {
      if (!seen.has(msg.id)) {
        seen.add(msg.id);
        ids.push(msg.id);
      }
    }
  }

  // Fetch full message details in parallel (cap at 50 to avoid rate limits).
  const capped = ids.slice(0, 50);
  const messages = await Promise.all(capped.map((id) => getGmailMessage(id)));
  return messages;
}
