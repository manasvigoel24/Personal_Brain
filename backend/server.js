import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { answerQuery } from './src/reasoner.js';
import { getGoogleAuthUrl, saveGoogleTokens, hasGoogleTokens } from './src/connectors/googleAuth.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get('/auth/google', (req, res) => {
  try {
    const { email } = req.query;
    const url = getGoogleAuthUrl(email);
    res.redirect(url);
  } catch (error) {
    console.error(error);
    res.status(500).send('Google auth setup is missing. Check your environment variables.');
  }
});

app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('Missing authorization code.');
  }

  try {
    await saveGoogleTokens(code);
    res.send('Google authorization completed. You can return to the Personal Brain app.');
  } catch (error) {
    console.error('OAuth callback failed:', error);
    res.status(500).send('Failed to save Google tokens.');
  }
});

app.get('/auth/status', (req, res) => {
  res.json({ googleAuthorized: hasGoogleTokens() });
});

app.post('/api/query', async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Question is required.' });
  }
  try {
    const answer = await answerQuery(question);
    res.json({ answer });
  } catch (error) {
    console.error('Query failed:', error);
    res.status(500).json({ error: 'Failed to answer the question.' });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Personal Brain backend listening on http://localhost:${port}`);
});
