# Personal Brain

A prototype conversational agent that reasons across connected personal tools (Gmail + Drive) with a React frontend and Node.js backend.

## Features

- Chat UI in React
- Backend query API in Node.js + Express
- Local connector data for Gmail and Drive
- Cross-source reasoning across email threads and drive files
- SDD-driven design with traceability via `SDD.md`

## Run locally

1. Create a `.env` file in `backend/` with the following values:
   ```bash
   OPENAI_API_KEY=your_openai_api_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:4000/oauth2callback
   ```
2. Install dependencies:
   ```bash
   npm run install-all
   ```
3. Start the app:
   ```bash
   npm run dev
   ```
4. Open the frontend at `http://localhost:5174/`

## Notes

- The current prototype uses sample Gmail and Drive data stored locally in `backend/data/` until you authorize Google access.
- The home page email field is used to hint the Google login, but the actual connection is completed through OAuth.
- To connect a real inbox/Drive, click the "Connect Google account" button after entering an email.
- Keep `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` secret; they belong in `backend/.env` only.
