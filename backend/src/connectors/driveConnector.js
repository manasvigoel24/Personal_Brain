import { google } from 'googleapis';
import { getAuthClient } from './googleAuth.js';

export async function listDriveFiles() {
  const auth = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth });
  const res = await drive.files.list({
    pageSize: 100,
    orderBy: 'modifiedTime desc',
    fields: 'files(id,name,mimeType,description,webViewLink,modifiedTime,owners,size)',
  });
  return res.data.files || [];
}

export async function searchDriveFiles(query) {
  const auth = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth });

  const safe = (query || '').replace(/'/g, "\\'");
  const q = `fullText contains '${safe}' or name contains '${safe}'`;

  const res = await drive.files.list({
    q,
    pageSize: 30,
    orderBy: 'modifiedTime desc',
    fields: 'files(id,name,mimeType,description,webViewLink,modifiedTime,owners,size)',
  });
  return res.data.files || [];
}
