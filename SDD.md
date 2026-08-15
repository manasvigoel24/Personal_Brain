# Software Design Document (SDD)

## 1. Purpose

Build a Personal Brain prototype that answers natural-language questions by retrieving facts from connected personal tools and reasoning across them.

## 2. Scope

- React frontend chat interface.
- Node.js backend API.
- Two connected data sources: Gmail and Drive.
- Cross-source reasoning for queries that require correlation.
- Local sample data for working prototype and demo.

## 3. Requirements

### Functional

- `Q1`: Accept natural-language questions from a user.
- `Q2`: Answer queries conversationally, not as raw search dumps.
- `Q3`: Retrieve facts from Gmail and Drive.
- `Q4`: Support at least one cross-source query that combines Gmail and Drive data.
- `Q5`: Clearly identify evidence used in answers.

### Non-functional

- `N1`: Runs locally with `npm run dev`.
- `N2`: Fast response to user questions.
- `N3`: Easy to extend with real connectors.

## 4. Architecture

- Frontend: React app using Vite.
- Backend: Express server exposing `/api/query`.
- Data layer: local JSON files modeled as a graph store in `backend/src/gbrainStore.js`.
- Reasoning layer: query parser and answer generator in `backend/src/reasoner.js`.

## 5. Data Model

- Gmail thread
  - `id`, `subject`, `participants`, `body`, `labels`, `status`
- Drive file
  - `id`, `name`, `mimeType`, `description`, `linkedEmails`
- Graph edges connect emails to attached or referenced Drive files.

## 6. Traceability

| Requirement | Implementation |
|---|---|
| Q1 | `frontend/src/App.jsx`, `backend/server.js` |
| Q2 | `backend/src/reasoner.js` |
| Q3 | `backend/src/connectors/*`, `backend/data/*` |
| Q4 | `backend/src/reasoner.js` query patterns |
| N1 | `package.json`, `backend/package.json`, `frontend/package.json` |

## 7. Test Plan

- Manual test: ask "Find the email from Stripe about the failed payment."
- Manual test: ask "What jobs have I applied to, and what's my status on each, including my take-home submission?"
- Manual test: ask a generic unsupported question to verify honest fallback.
