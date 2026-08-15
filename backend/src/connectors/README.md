# Google Connectors

## Set up Google OAuth

1. Create a Google Cloud project.
2. Enable the Gmail API and Drive API.
3. Create OAuth 2.0 credentials.
4. Set the authorized redirect URI to `http://localhost:4000/oauth2callback`.

## Required .env values

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

## Local token storage

Tokens are stored in `backend/src/.auth/google-token.json` after authorization.
