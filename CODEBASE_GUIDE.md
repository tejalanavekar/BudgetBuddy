# Budget Buddy Codebase Guide

This guide explains how the project is organized, how data flows through it, what each file does, and where the important logic and design decisions live. It's written both as a learning document for reading the codebase from scratch, and as interview prep material — it calls out *why* things are built the way they are, not just *what* they do.

## 1. Project Shape

The repo has two main folders:

- `backend/`: Express + MongoDB API server
- `frontend/`: React + Vite client app

The app is a personal finance tracker. Users can:

- sign up and sign in
- add expenses manually or from a scanned receipt (OCR)
- upload and browse receipt images
- view a monthly dashboard and a full yearly history
- set an overall monthly budget and per-category budgets
- ask an AI budget assistant questions about their spending

## 2. Tech Stack

**Backend**: Express, Mongoose/MongoDB Atlas, JWT auth, bcrypt password hashing, Multer file uploads, Google Cloud Vision (OCR), LangChain + OpenAI (budget AI chat).

**Frontend**: React 18, Vite, React Router v6, Axios, React-Bootstrap (form primitives only — the app has its own custom design system on top), Chart.js / react-chartjs-2.

## 3. High-Level Architecture

1. The React frontend collects user input.
2. The frontend calls an API service function (`src/api/services/*.js`).
3. The service uses the shared Axios instance (`axiosInstance.js`), which attaches the JWT.
4. Axios sends the request to the Express backend.
5. Express routes forward the request to a controller.
6. Controllers validate input and talk to MongoDB models.
7. Some controllers also call Google Vision (OCR) or OpenAI through LangChain.
8. The backend returns JSON.
9. The frontend stores the response in component state and renders the UI.

## 4. Backend Setup

### `backend/package.json`

Marks the backend as ESM (`"type": "module"`). Key dependencies: `express`, `mongoose`, `dotenv`, `cors`, `jsonwebtoken`, `bcryptjs`, `multer`, `axios`, `@langchain/openai`, `langchain`, `nodemon`.

### `backend/server.js`

Entry point. Flow, top to bottom:

1. Imports Express, dotenv, cors, the DB connector, and route modules.
2. `dotenv.config()` loads `.env` into `process.env`.
3. `connectDB()` connects to MongoDB Atlas.
4. Creates the Express app, reads `PORT`.
5. Enables CORS for `http://localhost:5173` (the Vite dev server) via an explicit `allowedOrigins` array.
6. Enables `express.json()` for parsing JSON bodies.
7. Serves `backend/uploads` as static files under `/uploads` (this is how receipt images get served back to the frontend).
8. Mounts `/api/users`, `/api/expenses`, `/api/budgets`, `/api/subscriptions`.
9. Exposes `/api/health` for a quick liveness check.
10. Starts listening.

**A real bug that lived here and got fixed**: the CORS config was once changed to `origin: allowedOrigins` while `allowedOrigins` was never declared — a `ReferenceError` that silently killed the whole server before it could call `app.listen()`, which from the frontend just looked like `ERR_CONNECTION_REFUSED`. Good interview story about how a one-line typo in middleware setup can look like a totally unrelated frontend networking problem.

### `backend/config/db.js`

Connects Mongoose to `process.env.ATLAS_URI`. On failure, logs the error and calls `process.exit(1)` — a hard, deliberate failure rather than letting the server limp along without a database.

## 5. Backend Data Models

### `backend/models/User.js`

Fields: `firstName`, `lastName`, `phone`, `email` (unique), `password` (bcrypt-hashed, never stored plain). `timestamps: true` adds `createdAt`/`updatedAt`.

### `backend/models/Expense.js`

- `userId`: ObjectId ref to `User`
- `description`, `amount`, `category`
- `date`: stored as a plain `YYYY-MM-DD` string (not a `Date` type) — this makes string-comparison month filtering straightforward elsewhere in the analytics code, at the cost of losing native date operators.
- `receiptPath`: uploaded filename
- `items`: nested `itemSchema` (`name`, `price`, `category`) for OCR-extracted line items, with `{ _id: false }` so line items don't get their own Mongo `_id`.

### `backend/models/Budget.js`

- `userId`, `monthYear` (`YYYY-MM`), `totalMonthlyBudget`, `categoryBudgets` (nested `{ category, amount }`)
- `budgetSchema.index({ userId: 1, monthYear: 1 }, { unique: true })` — a compound unique index enforcing exactly one budget document per user per month at the database level, not just in application logic.

### `backend/models/Subscription.js`

- `userId`: ObjectId ref to `User`
- `name`, `cost`, `billingCycle` (`'Monthly' | 'Annual'`, enum-constrained), `category`
- `status`: `'Active' | 'Paused' | 'Cancelled'` (enum-constrained) — this is a **soft state**, not a deletion flag; a cancelled subscription is still a row in the database, just filtered differently by the UI.
- `purchaseDate`: `YYYY-MM-DD` string — the actual date the user started paying (user-entered, required). This is the one fact the user provides; everything else about billing timing is derived from it.
- `nextBillingDate`: `YYYY-MM-DD` string, same convention as `Expense.date` — **derived, never user-entered**. Computed as the next occurrence on/after today in the recurring schedule `purchaseDate, +1 cycle, +2 cycles, ...`, recomputed fresh (not incrementally advanced) every time it's read or the subscription is saved, so it can never drift out of sync with `purchaseDate`.

### `backend/models/DashboardPage.js`

Dead file — empty schema, uses CommonJS `require` instead of ESM, and nothing imports it. Worth knowing about so you don't waste time thinking it does something.

## 6. Backend Middleware

### `backend/middleware/authMiddleware.js`

Classic JWT bearer-token middleware:

1. Reads `req.headers.authorization`.
2. Confirms it starts with `Bearer `.
3. Verifies the token with `jwt.verify(token, process.env.JWT_SECRET)`.
4. Attaches `decoded.userId` to `req.userId`.
5. `401` if missing/invalid.

This is what turns "the frontend has a token in localStorage" into "the backend knows who's making this request."

### `backend/middleware/uploadMiddleware.js`

Multer disk storage — saves receipt images into `backend/uploads`, names files `Date.now() + '-' + originalname`, filters to images only.

## 7. Backend Routes

- `userRoutes.js`: register, login, get profile (protected + ownership-checked), change password (protected + ownership-checked). The old unauthenticated "list all users" debug endpoint (`GET /`) was removed — it had no `protect` middleware at all and nothing in the frontend called it.
- `expenseRoutes.js`: scan-receipt (OCR), create/get/update/delete expense, get-receipts-only — all protected
- `budgetRoutes.js`: snapshot, AI chat, AI summary, get-all, create/update, get-one, delete — specific routes (`/snapshot/:monthYear`) are registered before the generic `/:monthYear` route so Express's first-match routing doesn't misfire
- `subscriptionRoutes.js`: `POST /`, `GET /`, `PUT /:id`, `DELETE /:id` — all protected. Straightforward REST CRUD, no special ordering concerns since there's no route-shape ambiguity like the budget routes have.

## 8. Backend Controllers

### `userController.js`

- `registerUser`: validates required fields + password strength regex, checks email uniqueness, bcrypt-hashes the password, saves, returns `201` + `userId`.
- `loginUser`: finds by email, compares bcrypt hash, signs a JWT `{ userId }`, returns token + a small user payload.
- `getUserProfile`: fetches by `req.params.userId`, excludes password. Now checks `req.params.userId !== req.userId → 403` before returning anything — the URL param is user input; `req.userId` (from the verified JWT) is the only value that can't be spoofed, so it's the one the check has to be anchored on.
- `changePassword`: same `req.params.userId !== req.userId → 403` check added before touching the database, verifies current password, hashes and saves the new one.
  - This was a classic **auth vs. authz** gap: `protect` middleware confirms *who you are* (authentication), but neither endpoint used to confirm *you're allowed to act on this specific resource* (authorization) — they trusted the URL's `:userId` as if it were self-verifying. Both are fixed now by comparing it against the token-derived `req.userId`, the same pattern `expenseController.deleteExpense` already used correctly.

### `expenseController.js`

The most feature-dense controller. Two parts: OCR text-parsing helpers, and expense CRUD.

**OCR parsing helpers** (`extractMerchantName`, `inferCategoryFromItems`, `detectCategory`, `parseReceiptText`): turn raw Google Vision text into structured `{ amount, date, description, items, category }`. Amount extraction tries three strategies in order — a "total"-labeled line, a payment-method line, then falls back to the largest price found anywhere. Date extraction supports `YYYY-MM-DD`, `MM/DD/YYYY`, and `"Mar 25 2026"`-style formats.

**`scanReceipt`**: reads the uploaded file, base64-encodes it, calls Google Vision's `DOCUMENT_TEXT_DETECTION`, parses the result, returns both raw OCR text and the structured data for the frontend to prefill the form with.

**`createExpense` / `getExpenses` / `updateExpense` / `deleteExpense` / `getAllReceipts`**: standard CRUD against MongoDB. `updateExpense` and `deleteExpense` both check `expense.userId.toString() !== req.userId → 403` before mutating anything — `updateExpense` used to skip this (a stale comment even claimed it "ensures it belongs to the user" while the code never checked), so the two sibling endpoints were inconsistent in how strictly they enforced ownership; now they match.

### `budgetController.js`

- `createOrUpdateBudget`: upsert-by-`(userId, monthYear)`, validates amount and month format.
- `getDailySpentSnapshot`: the analytics engine for the Budget page — combines the stored budget with computed spending stats (via `budgetAnalytics.js`) to produce total/remaining/percentage spent, avg daily spend, a "safe daily budget" recommendation, days elapsed/remaining, category breakdown, recent expenses, and a previous-month comparison, all in one payload.
- `chatWithBudgetAI` / `getBudgetSummary`: package budget + spending data into a prompt and call `langchainService.js`.

### `subscriptionController.js`

The newest, and simplest, controller — plain CRUD, no OCR/AI involved.

- `createSubscription`: requires `userId`, `name`, `cost`, `purchaseDate`. `nextBillingDate` is never accepted from the client — it's always computed server-side from `purchaseDate` + `billingCycle` via `computeNextBillingDate`.
- `getSubscriptions`: fetch-all by `userId` (query param), sorted newest-first.
- `updateSubscription`: a single generic patch endpoint — every field (`name`, `cost`, `billingCycle`, `category`, `status`, `purchaseDate`) is independently optional, so the same endpoint backs three different frontend actions: full edits, pause/resume, and cancel. That's a deliberate simplification (one route instead of three narrower ones) that works because none of these operations need different validation or side effects. `nextBillingDate` is unconditionally recomputed from `purchaseDate`/`billingCycle` at the end regardless of which fields changed — cheap, idempotent, and it means there's no branch that could forget to keep it in sync.
- `deleteSubscription`: a genuine hard delete — only ever called on a subscription that's already `Cancelled` (see the frontend section below for why that distinction matters).

## 9. Backend Utilities

### `budgetAnalytics.js`

- `calculateDailySpentStats`: current spend, avg daily spend, days elapsed/remaining, category breakdown, recent expenses. Uses plain string comparison on the `YYYY-MM-DD` date field, which only works because that field is normalized consistently at write time.
- `calculateSafeDailyBudget`: `remaining budget / remaining days`.
- `compareWithPreviousMonth`, `getCategoryBudgetStatus`: exactly what they sound like.

### `langchainService.js`

Wraps `ChatOpenAI` from `@langchain/openai`. Builds a prompt string (manually, via string interpolation — `PromptTemplate` is imported but not actually used) and calls `model.invoke(prompt)`. Exports `budgetAIChat` and `generateBudgetSummary`.

## 10. Frontend Setup

### `frontend/src/main.jsx`

Entry point. Order of imports matters here: `index.css` loads first, then Bootstrap's CSS. Bootstrap's reset sets `body { background-color: #fff }`, which — without a counter-rule — silently wins over the app's own `body` background regardless of import order, because the app's own `index.css` originally never declared a `body` background at all. The fix was to give `body` an explicit `background-color: var(--bg-page) !important` in `index.css`, so it can't be clobbered by a later stylesheet. (This is a great "CSS cascade / import order" interview anecdote.)

### `frontend/src/config.js`

Single source of truth for the backend base URL (`http://localhost:5000/api`).

## 11. Frontend Auth & Route Protection

### `frontend/src/context/AuthContext.jsx`

Central auth state: `user`, `loading`, `isAuthenticated` (derived as `!!user`), `login`, `logout`.

- On mount, checks `localStorage.getItem('bt_user')` **then** `sessionStorage.getItem('bt_user')`, and restores whichever is found into state; sets `loading` to `false` once that check is done.
- `login(userData, token, remember = true)`: if `remember` is true, writes `bt_user`/`bt_auth`/`bt_token` to `localStorage` (survives closing the browser, until the 7-day JWT expires); if false, writes to `sessionStorage` instead (cleared the moment the tab/browser closes) — and clears whichever storage it *didn't* use, so a stale session can't linger in the other one. This is what the sign-in page's "Remember me" checkbox actually controls; it used to be a decorative checkbox wired to nothing.
- `logout()` clears both storages entirely.
- Renders `{!loading && children}` — nothing in the app tree mounts until the initial auth check resolves, so there's no flash of protected content before the redirect logic runs.
- `axiosInstance.js`'s request interceptor and its `401` handler both check `localStorage` **or** `sessionStorage` for the token, for the same reason — the token could legitimately be in either one.

### `frontend/src/App.jsx` — `ProtectedRoute`

```jsx
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  return children;
};
```

Every authenticated route is wrapped in this: `/home` (and by extension every nested child route — dashboard, expense, budget, past-expenses, receipts, subscriptions, since they all render through `<Outlet />` inside `Home`) and `/profile`. Any unmatched URL (`*`) also redirects to `/signin`. **This means typing a protected URL directly while logged out already redirects you** — there's no gap here, which is worth being able to state confidently in an interview rather than assuming it's broken.

One thing that *was* a real (harmless but sloppy) issue: `Home.jsx` used to do its own **separate** raw `localStorage.getItem('bt_auth')` check in addition to `ProtectedRoute`'s context-based check — two code paths checking the same underlying fact, which could in theory drift out of sync. Cleaned up to rely on `ProtectedRoute` + `AuthContext` as the single source of truth.

### `frontend/src/api/axiosInstance.js`

One shared Axios client:
- Request interceptor attaches `Authorization: Bearer <bt_token>` from `localStorage`, and skips forcing `Content-Type: application/json` when the body is `FormData` (so multipart file uploads aren't broken).
- Response interceptor: on a `401` from any non-login request, clears `localStorage` and hard-redirects to `/signin` — this is what handles an *expired* token, as opposed to `ProtectedRoute`, which handles *no* token.

## 12. Frontend Design System / Theming

The whole app uses a two-color theme defined once as CSS custom properties in `frontend/src/index.css`:

```css
:root {
  --bg-page: #BDD9D7;          /* light teal — the page canvas */
  --bg-container: #03363D;     /* dark navy — every card/panel/modal */
  --text-on-container: #ffffff;
  --text-on-page: #03363D;
  --hover-on-container: rgba(255, 255, 255, 0.12);
}
```

The pattern: the page background is light, every "container" (card, navbar, modal, dropdown, pill) is dark with white text, and hover states brighten rather than swap to a lighter fill color — hovering never changes a dark container to a light one, it just lifts/highlights it (brighter border, subtle shadow, sometimes a small `translateY` lift). This was a deliberate choice after an earlier version made hover states lighten the background so much they became washed out and low-contrast.

**A recurring bug pattern worth knowing for interviews**: this app has no CSS Modules or scoping — every stylesheet in `src/styles/*.css` is imported by its own page/component, but Vite bundles them all into one global stylesheet. Multiple files reused the *same class names* (`.expense-item`, `.stat-card`, `.form-label`, `.btn-primary`) for visually different things on different pages. Whichever file happens to be imported later in the module graph wins the cascade for shared properties — so a rule written for the Budget page could silently reskin an element on the Dashboard. This bit the theme rollout more than once (e.g. a `.stat-card:hover` rule left in `profile.css` kept re-lightening the Dashboard's stat cards even after that hover effect was removed from `dashboard.css` itself). The fix each time was either to scope the selector more specifically (e.g. `.expenses-list .expense-item` instead of bare `.expense-item`) or to make the colliding rules identical everywhere so the collision stopped mattering. This is a genuinely good "what would you do differently" interview answer: introduce CSS Modules, or at minimum a BEM-style naming convention, to prevent global class collisions.

## 13. Mobile Responsiveness

- **Navbar**: `Home.jsx` renders a hamburger toggle (`☰`/`✕`) that's hidden on desktop and shown under a `768px` breakpoint; toggling it applies an `.open` class that switches `.nav-links` from `display: none` to a full-width dropdown positioned below the navbar.
- **Profile dropdown**: originally opened on CSS `:hover` — which doesn't exist as a concept on a touchscreen, so it was completely unreachable on mobile. Converted to a click-toggled `.open` class with a `useRef` + `mousedown` listener to close it on outside click. This is a good example of a bug that's invisible in desktop testing and only shows up the moment you actually try the app on a phone.
- **Auth pages**: the sign-in card's side-by-side branding/form layout (`.auth-left` / `.auth-right`) had zero media queries; added a breakpoint that stacks it vertically under `700px`.
- Per-page breakpoints exist across `dashboard.css`, `profile.css`, `budgetPage.css`, `receiptVault.css`, `pastExpenses.css`, `expense.css`, `budgetManager.css`, `budgetAI.css`, `floatingChatbot.css` — mostly at `900px`/`768px`/`480px`, collapsing multi-column grids to a single column and reducing padding.

## 14. Frontend Pages (what's notable on each)

- **`SignIn.jsx` / `SignUp.jsx`**: the branding column now has the small teal logo badge (an inline SVG, sized in `em` units so it always scales with the heading's font-size) next to "Budget Buddy". `SignUp` calls `login(userData)` immediately after registering — but the backend's register endpoint doesn't return a JWT, only login does, so a fresh signup doesn't get a real `bt_token`. This can make protected API calls fail until the user explicitly signs in. Worth knowing as a "found but not yet fixed" gap.
- **`DashboardPage.jsx`**: monthly overview — stat cards (current/previous month, transaction count), a Recent Expenses list with Category/Sort filters and a "View all →" link to Past Expenses, and a `CategoryChart` doughnut. The doughnut's legend label color is set explicitly in `CategoryChart.jsx` (not CSS) since Chart.js renders its own canvas — a good "why didn't my CSS fix it" story: canvas-rendered text isn't reachable by CSS at all, it has to be set in the Chart.js `options` object.
- **`ExpensePage.jsx`**: the add-expense form. Notable pieces:
  - A custom drag-and-drop–styled upload "dropzone" built from a real `<input type="file">` hidden via `opacity:0`/`position:absolute` and a sibling `<label htmlFor>` doing the visible styling — the standard accessible pattern for restyling native file inputs, since you can't restyle the native control's own chrome directly.
  - A category picker rendered as a grid of emoji pill buttons instead of a `<select>` dropdown.
  - The date field defaults to *today*, computed via local `getFullYear()/getMonth()/getDate()` rather than `new Date().toISOString()` — the ISO/UTC version can show the wrong day for users in timezones behind/ahead of UTC right around midnight, since `toISOString()` converts to UTC first.
  - Labels use `controlId` on `Form.Group` so React-Bootstrap auto-generates matching `id`/`htmlFor` pairs (fixes a real "label not associated with a form field" accessibility warning); the two labels that don't correspond to one native field (Upload Receipt, Category) render as plain `<span>` instead of `<Form.Label>`, since a `<label>` needs something concrete to point to.
- **`PastExpensesPage.jsx`**: yearly bar chart + monthly drill-down + category breakdown, more advanced history explorer than the dashboard.
- **`ReceiptVaultPage.jsx`**: category-folder gallery view of receipts. Had a stats summary bar (Total Receipts / Total Recorded / Categories) that was fully commented out in the JSX — restored it, and added an "+ Upload Receipt" button that routes to the Expense page, since that's actually where receipts get attached to a record (there's no standalone receipt-only upload endpoint).
- **`BudgetPage.jsx`**: shell that renders `DailySpentSnapshot` (analytics) + `FloatingChatbot` (AI) + a `BudgetManager` modal.
- **`Profile.jsx`**: overview / my-expenses / change-password tabs.
- **`EditExpensePage.jsx`**: implemented but its route is commented out in `App.jsx` — the app currently edits expenses via an inline modal instead.
- **`SubscriptionsPage.jsx`**: tracks recurring payments (Netflix, Spotify, etc.) — the newest full feature, and it reuses every pattern established by the rest of the app rather than inventing new ones. Worth reading end-to-end as a "how do I add a whole new feature to this codebase" reference.
  - **Data flow**: on mount, calls `subscriptionService.getSubscriptions(user.userId)` → `GET /api/subscriptions?userId=...` → renders from local component state afterward (every mutation — add/edit/pause/cancel/delete — updates that same local array in place via the returned document, rather than refetching the whole list).
  - **Derived numbers, not stored ones**: monthly vs. annual totals are computed client-side from each subscription's `cost`/`billingCycle` (`monthlyEquivalent` divides an annual cost by 12; `annualEquivalent` multiplies a monthly cost by 12) — nothing about "total spend" is persisted in the database, it's recalculated from the raw records every render via `useMemo`. Same category-color/percentage-bar pattern as `DailySpentSnapshot.jsx`'s budget breakdown, and the same `CATEGORY_META = { emoji, color }` map pattern used by `CategoryChart.jsx` and `DailySpentSnapshot.jsx`'s `CATEGORY_COLOR` — three separate features, same small convention, copied rather than shared from one file (there's no shared `constants.js` for this yet — a reasonable thing to extract if a fourth feature needed it).
  - **A real bug that got fixed**: the ✕ button on each row originally called `deleteSubscription` (a hard delete) directly. But the UI has a whole "Cancelled" filter tab and a Cancelled count in the stats bar — both of which require the record to still exist with `status: 'Cancelled'`. Hard-deleting on click meant a "cancelled" subscription just vanished instead of ever appearing as cancelled. The fix: the ✕ button now calls `updateSubscription(id, { status: 'Cancelled' })` — a soft state change — and a real, separate "Delete" button (only shown once a subscription is already `Cancelled`) is what triggers the actual `DELETE` request. This is a good "state machine vs. destructive action" story: two buttons that look similar (both red, both about "getting rid of" something) need to do genuinely different things, and conflating them is an easy, non-obvious mistake to make.
  - **Add/Edit share one modal**: `editingSub` state (`null` = adding, otherwise the subscription object being edited) drives a single modal — same form fields, same submit handler, branching only on whether to call `addSubscription` or `updateSubscription`, rather than maintaining two near-identical modals.
  - **The date field**: the form asks for **Purchase Date** (when the user actually started paying), not "next billing date" — a plain `<input type="date">`, defaulted to today but fully editable so a subscription that actually started months ago can be back-dated. The backend derives `nextBillingDate` from that: `computeNextBillingDate(purchaseDate, billingCycle)` walks the recurring schedule (`purchaseDate`, `+1 cycle`, `+2 cycles`, ...) and returns the first occurrence on/after today. It's recomputed fresh — not incrementally advanced from a stored value — every time a subscription is created, updated, *or read* (`getSubscriptions` refreshes and re-saves it for every Active subscription on each fetch), so there's no cron/scheduled job needed and no way for it to drift out of sync with `purchaseDate`. The one subtlety worth being able to explain: this uses local date components (`getFullYear()`/`getMonth()`/`getDate()`), not `toISOString()`, for exactly the same UTC-offset reason `ExpensePage`'s date field does — `toISOString()` first converts to UTC, which can shift "today" by a day for users behind/ahead of UTC right around midnight.
  - Wired into the router at `/home/subscriptions`, replacing what used to be a static `<ComingSoon title="Subscriptions" />` placeholder in `App.jsx`.

## 15. Frontend Components (what's notable)

- **`DailySpentSnapshot.jsx`**: the budget analytics card. The **per-category budget breakdown** was rewritten from stacked "Spent / Total / Remaining" label rows into a horizontal progress-bar-per-category layout (icon, name, `$spent / $budget`, percentage, colored progress bar) — each category gets a consistent accent color from a small `CATEGORY_COLOR` map.
  - **Known remaining gap**: the top-level month-comparison headers are still literally hardcoded strings (`"APRIL 2026"`, `"MARCH 2026"`) instead of being derived from the `monthYear` prop — this is a different part of the file from the category breakdown that got fixed, and it's still open.
- **`CategoryChart.jsx`**: Chart.js doughnut, category → color map, legend text color set via chart options (see note above about canvas text).
- **`BudgetManager.jsx`**: create/update a budget, with a total-vs-category-sum validation.
- **`BudgetAI.jsx` / `FloatingChatbot.jsx`**: chat UI + floating launcher for the budget AI assistant.

## 16. Key Request Flows

**Sign In**: `SignIn.jsx` → `authService.loginUser` → `POST /api/users/login` → `userController.loginUser` verifies + signs JWT → frontend stores it via `AuthContext.login` → protected routes unlock.

**Add Expense (with OCR)**: user uploads a receipt in `ExpensePage.jsx` → `scanReceiptWithVision` → backend reads the file, calls Google Vision, parses the OCR text into structured fields → frontend prefills the form → user reviews/edits → submits `FormData` → `POST /api/expenses` → `uploadMiddleware` stores the image, `createExpense` saves the document.

**Budget Snapshot**: `BudgetPage` → `DailySpentSnapshot` calls `GET /api/budgets/:userId/snapshot/:monthYear` → `budgetController.getDailySpentSnapshot` combines the stored `Budget` with `budgetAnalytics.calculateDailySpentStats` → returns one payload → rendered as stat cards, progress bar, and the per-category breakdown.

**Budget AI Chat**: `FloatingChatbot` → `BudgetAI` sends a question → `chatWithBudgetAI` loads budget + spending stats → `langchainService.budgetAIChat` builds a prompt and calls OpenAI → response rendered as a chat bubble.

**Manage a Subscription**: `SubscriptionsPage` loads the list via `GET /api/subscriptions`. Adding/editing goes through one shared modal → `POST` or `PUT` → the returned document replaces/prepends the local array (no refetch). Clicking ✕ sends `PUT /:id { status: 'Cancelled' }` (soft state change, stays visible under the Cancelled tab); clicking Pause/Resume toggles `status` between `Active`/`Paused` the same way; clicking Delete (only available once already Cancelled) sends `DELETE /:id` and removes it from local state.

## 17. Known Gaps (accurate as of the latest pass)

Still open:

- No CSS scoping (CSS Modules / BEM) — see the class-name-collision discussion in section 12. This is the single biggest "what would you refactor" answer available in this codebase, and deliberately *not* patched in the same pass as the items below: it means touching class names across every page/component and every `.css` file, which is a large-blast-radius refactor that needs its own careful, visually-verified pass rather than being bundled in with smaller fixes.
- `SubscriptionsPage.jsx`'s `CATEGORY_META` (emoji + color for Software/Streaming/Music/etc.) is intentionally its **own** map, not pulled from the new shared `constants/categoryMeta.js` — it's a different domain (subscription categories) that only coincidentally shares a couple of names (`Health`, `Other`) with expense categories, not the same data.

Fixed since the last pass (don't repeat these as if they're still bugs):

- `SignUp.jsx` now logs in with a real JWT — `registerUser` issues one on `201` the same way `loginUser` does on success, and `SignUp.jsx` passes `res.data.token` through to `AuthContext.login`.
- `DailySpentSnapshot.jsx`'s hardcoded `"APRIL 2026"` / `"MARCH 2026"` labels are gone — both the current-month and previous-month cards (and the "vs March" / "than March" comparison text) are now derived from the `monthYear` prop via `formatMonthYearUpper`/`getPreviousMonthYear`/`monthNameOnly`.
- `backend/models/DashboardPage.js` (dead/empty file) deleted.
- `frontend/src/api/services/dashboardService.js` (pointed at nonexistent backend endpoints, called from nowhere) deleted, along with its barrel export.
- `frontend/src/api/services/userService.js`'s unused `updateUserProfile`/`deleteUserAccount` exports removed — neither had a backend route behind them, and nothing called them.
- `Subscription.nextBillingDate` no longer just sits stale in the past, and is no longer user-entered at all — the form now asks for `purchaseDate` (when the user actually started paying), and `nextBillingDate` is always derived from it (`computeNextBillingDate`), recomputed fresh on every create/update/read. Self-healing by construction instead of needing real cron infrastructure.
- The duplicated category `{ emoji, color }` maps — turned out to exist in **8** files, not 3, and had actually drifted (`Entertainment` was silently missing from several copies, meaning an Entertainment expense got the wrong emoji/color depending on which page rendered it). Consolidated into `frontend/src/constants/categoryMeta.js` (`CATEGORIES`, `CATEGORY_EMOJI`, `CATEGORY_COLOR`), imported everywhere that needs it. `ReceiptVaultPage.jsx` keeps its own richer `{bg, accent, text}` color map (a genuinely different shape for its folder-card styling) but now sources its emoji from the shared file too.
- The CORS `allowedOrigins` `ReferenceError` that silently prevented the server from starting.
- `Home.jsx`'s duplicate raw-`localStorage` auth check (now relies solely on `AuthContext`/`ProtectedRoute`).
- The profile dropdown being hover-only (unusable on touch) — now click-toggled.
- `BudgetPage`'s `budgetRefresh` state *is* correctly wired to `DailySpentSnapshot` via the `refreshTrigger` prop (an earlier version of this guide claimed it wasn't — verify current code before repeating old claims).
- The expense date field's timezone bug (`toISOString()` → local-date computation).
- The `<label>`-without-`htmlFor` accessibility warning on the Expense form.
- The Subscriptions ✕ button hard-deleting instead of cancelling (see section 14 for the full story).
- The decorative, non-functional "Remember me" checkbox on Sign In — now genuinely switches between `localStorage` (persisted) and `sessionStorage` (cleared on browser close).
- Redis/caching removed entirely (`redisClient.js`, `utils/cache.js`, the `redis` dependency, and every `getCache`/`setCache`/`deleteCache` call in `expenseController.js`) — the app now hits MongoDB directly for every read.
- The auth-vs-authz gap in `getUserProfile` and `changePassword` — both now check `req.params.userId !== req.userId → 403` before doing anything. Also removed the fully-unauthenticated `GET /api/users` "list everyone" debug endpoint entirely (no `protect` middleware, unused by the frontend, returned every user's PII to anyone).
- `expenseController.updateExpense` didn't verify the requester owned the expense before mutating it — its sibling `deleteExpense` already checked `expense.userId.toString() !== req.userId`; `updateExpense` now uses the identical check. (A stale comment there had claimed the code "ensures it belongs to the user" while nothing actually enforced that.)

## 19. Interview Talking Points

Questions you should be able to answer fluently from having built this:

- **"Walk me through your auth flow."** JWT issued on login, stored in `localStorage`, attached via an Axios request interceptor, verified by Express middleware on every protected route; a response interceptor catches `401`s (expired/invalid token) and force-logs-out; client-side route guards (`ProtectedRoute`) prevent even rendering a protected page without a session, redirecting to `/signin`.
- **"How did you approach theming?"** Two CSS custom properties (page background, container background) plus two paired text-color variables, so the whole app's palette is changeable from one place. Talk about the light-page/dark-container pattern and why hover states brighten instead of swapping fill colors.
- **"What's a bug you found and fixed?"** Two strong options: (1) the CSS class-collision issue (section 12) — subtle, a real architectural gap, and you can explain both symptom and long-term fix; (2) the auth-vs-authz gap in `getUserProfile`/`changePassword` (section 8) — a security-flavored answer: middleware confirmed *who* you were but not that you were touching *your own* resource, meaning any logged-in user could target another user's ID in the URL. Fixed by comparing the token-derived `req.userId` against the URL's `:userId` before doing anything, mirroring a pattern (`deleteExpense`) that already existed correctly elsewhere in the same codebase — also removed an entirely unauthenticated "list all users" debug endpoint discovered while fixing it.
- **"How did you make it mobile responsive?"** Talk about the hover-only dropdown being invisible on touchscreens — a bug you can *only* find by actually testing on a phone/emulator, not by reading code — and the hamburger nav pattern.
- **"What would you do differently with more time?"** CSS Modules or a naming convention to kill class collisions — the one gap left deliberately unfixed, because it's a large, blast-radius refactor that deserves its own careful pass rather than being bundled in with smaller bug fixes.
- **"Walk me through the Subscriptions feature."** Full CRUD (model → controller → routes → service → page), with a soft-delete/state-machine detail worth highlighting: `status` (`Active`/`Paused`/`Cancelled`) is a field, not a deletion — cancelling has to *keep* the record so the Cancelled tab and count still work, and only an already-cancelled item gets a true hard-delete option. Also a good spot to explain why you chose manual entry over reading the user's email to auto-detect subscriptions (see the "Interview Talking Points" reasoning already captured when that feature was built: trust/privacy, attack surface, parsing fragility, compliance, and effort-vs-payoff for a project this size).
