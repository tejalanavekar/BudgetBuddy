# Backend — BudgetBuddy

Quick setup notes for the new AI assistant endpoint:

- Copy `.env.example` to `.env` and fill values (`ATLAS_URI`, `OPENAI_API_KEY`, `PORT`).
- The chat endpoint is available at `POST /api/chat` and expects JSON `{ message: "..." }`.
- The endpoint uses the OpenAI Chat Completions API. Ensure `OPENAI_API_KEY` is set.
- The implementation uses the global `fetch` API (Node 18+). If your Node runtime is older, install a fetch polyfill.

Start the server:

```bash
cd backend
npm install
npm run start
```

Then open the frontend and use the floating assistant on the Dashboard page.
