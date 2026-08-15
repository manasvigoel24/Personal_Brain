import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, 'data');

function loadJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, filename), 'utf8'));
}

export function loadData() {
  const gmail = loadJson('gmail.json');
  const drive = loadJson('drive.json');
  return { gmail, drive };
}

export function findEmailById(id, data) {
  return data.gmail.find((e) => e.id === id);
}

export function findFileById(id, data) {
  return data.drive.find((f) => f.id === id);
}

function extractKeywords(query) {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'i', 'me', 'my', 'we', 'our',
    'you', 'your', 'he', 'she', 'it', 'they', 'them', 'their', 'this',
    'that', 'these', 'those', 'and', 'or', 'but', 'not', 'of', 'in', 'on',
    'at', 'to', 'for', 'with', 'about', 'from', 'by', 'as', 'if', 'so',
    'find', 'what', 'which', 'who', 'how', 'when', 'where', 'list', 'show',
    'get', 'give', 'tell', 'send', 'sent', 'ever', 'any', 'all', 'each',
    'email', 'emails', 'mail', 'message', 'messages', 'received', 'regarding',
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
  return data.gmail.filter((email) => {
    const haystack = [email.subject, email.body, ...(email.participants || [])].join(' ').toLowerCase();
    return keywords.some((kw) => haystack.includes(kw));
  });
}

export function findDriveFiles(query, data) {
  const keywords = extractKeywords(query);
  if (!keywords.length) return data.drive;
  return data.drive.filter((file) => {
    const haystack = [file.name, file.description || ''].join(' ').toLowerCase();
    return keywords.some((kw) => haystack.includes(kw));
  });
}

export function getUnreadEmails(data) {
  return data.gmail.filter((email) => email.status === 'unread');
}

export function getEmailsInThread(threadId, data) {
  return data.gmail.filter((email) => email.threadId === threadId);
}
