import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.resolve(__dirname, '..', '.auth');
const tokenPath = path.join(authDir, 'google-token.json');

export function getOAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment.');
  }
  const redirectUri = GOOGLE_REDIRECT_URI || 'http://localhost:4000/oauth2callback';
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirectUri);
  const tokens = loadTokens();
  if (tokens) {
    auth.setCredentials(tokens);
  }
  return auth;
}

export function getGoogleAuthUrl(email) {
  const auth = getOAuthClient();
  const options = {
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
    ],
  };
  if (email) {
    options.login_hint = email;
  }
  return auth.generateAuthUrl(options);
}

export async function saveGoogleTokens(code) {
  const auth = getOAuthClient();
  const { tokens } = await auth.getToken(code);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2), 'utf8');
  auth.setCredentials(tokens);
}

export function loadTokens() {
  if (!fs.existsSync(tokenPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
}

export function hasGoogleTokens() {
  return fs.existsSync(tokenPath);
}

export async function getAuthClient() {
  return getOAuthClient();
}
