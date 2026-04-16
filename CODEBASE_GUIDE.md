# Budget Buddy Codebase Guide

This guide explains how the project is organized, how data flows through it, what each app-owned file does, and where the important logic lives.

It is written as a learning document for reading the codebase from scratch.

## 1. Project Shape

The repo has two main folders:

- `backend/`: Express + MongoDB API server
- `frontend/`: React + Vite client app

The app is a personal finance tracker. Users can:

- sign up and sign in
- add expenses manually or from a scanned receipt
- upload receipt images
- view dashboard and history
- set monthly budgets
- ask an AI budget assistant questions

## 2. High-Level Architecture

The full flow looks like this:

1. The React frontend collects user input.
2. The frontend calls an API service function.
3. The API service uses the shared Axios instance.
4. Axios sends requests to the Express backend.
5. Express routes forward the request to a controller.
6. Controllers validate input and talk to MongoDB models.
7. Some controllers also use Redis cache, Google Vision OCR, or OpenAI through LangChain.
8. The backend returns JSON.
9. The frontend stores data in component state and renders the UI.

## 3. Backend Setup

### `backend/package.json`

Purpose:

- defines backend dependencies
- marks the backend as ESM with `"type": "module"`
- provides the start script

Important dependencies:

- `express`: HTTP server and routing
- `mongoose`: MongoDB ORM
- `dotenv`: loads environment variables
- `cors`: cross-origin frontend/backend communication
- `jsonwebtoken`: JWT auth
- `bcryptjs`: password hashing
- `multer`: file uploads
- `axios`: external API calls
- `redis`: caching
- `@langchain/openai` and `langchain`: AI integration
- `nodemon`: auto-restart during development

### `backend/server.js`

Purpose:

- main backend entry point
- initializes environment variables
- connects to MongoDB and Redis
- configures middleware
- mounts routes
- starts the server

Flow, top to bottom:

1. Imports Express, dotenv, cors, the DB connector, and route modules.
2. Calls `dotenv.config()` so `process.env` is populated from `.env`.
3. Imports `./config/redisClient.js` for side effects.
   The Redis client connects as soon as this file is imported.
4. Calls `connectDB()` to connect to MongoDB.
5. Creates the Express app and reads `PORT`.
6. Enables CORS for `http://localhost:5173`, which is the Vite frontend.
7. Enables `express.json()` so JSON request bodies can be read with `req.body`.
8. Logs startup sanity checks in development.
9. Recreates `__dirname` for ESM using `fileURLToPath`.
10. Serves `backend/uploads` as static files under `/uploads`.
11. Mounts:
    - `/api/users`
    - `/api/expenses`
    - `/api/budgets`
12. Adds `/api/health` for a quick server status check.
13. Starts listening.

### `backend/config/db.js`

Purpose:

- creates the MongoDB connection with Mongoose

Flow:

1. Imports `mongoose`.
2. Defines `connectDB`.
3. Uses `mongoose.connect(process.env.ATLAS_URI)`.
4. Logs the connected database name.
5. If connection fails, logs the error and exits the Node process.

### `backend/config/redisClient.js`

Purpose:

- creates and connects the Redis client
- allows caching to be optional instead of fatal

Flow:

1. Loads env variables.
2. Creates the Redis client with `REDIS_URL`.
3. Adds listeners for `error` and `connect`.
4. Tries to connect immediately with `await client.connect()`.
5. If Redis is unavailable, the app still runs without cache.

Important detail:

- this file is imported in `server.js` only for its side effects
- that means connecting to Redis happens automatically at startup

## 4. Backend Data Models

### `backend/models/User.js`

Purpose:

- stores registered users

Schema fields:

- `firstName`
- `lastName`
- `phone`
- `email`
- `password`

Notes:

- `email` is unique
- `timestamps: true` adds `createdAt` and `updatedAt`
- passwords are stored hashed, not plain text

### `backend/models/Expense.js`

Purpose:

- stores each expense record

Nested schema:

- `itemSchema`
  - `name`
  - `price`
  - `category`

Main expense fields:

- `userId`: Mongo ObjectId reference to `User`
- `description`: expense title or merchant
- `amount`: total expense amount
- `category`: overall category
- `date`: stored as a string like `YYYY-MM-DD`
- `receiptPath`: uploaded filename
- `items`: parsed receipt line items

Important note:

- line items use `{ _id: false }`, so each receipt item does not get its own Mongo `_id`

### `backend/models/Budget.js`

Purpose:

- stores one monthly budget per user

Nested schema:

- `categoryBudgetSchema`
  - `category`
  - `amount`

Main fields:

- `userId`
- `monthYear`: must match `YYYY-MM`
- `totalMonthlyBudget`
- `categoryBudgets`

Important rule:

- `budgetSchema.index({ userId: 1, monthYear: 1 }, { unique: true })`
- this enforces only one budget per user per month

### `backend/models/DashboardPage.js`

Purpose:

- currently unused and incomplete

Important note:

- it uses CommonJS `require` instead of ESM imports
- the schema is empty
- nothing else in the backend imports it

This is effectively a placeholder file right now.

## 5. Backend Middleware

### `backend/middleware/authMiddleware.js`

Purpose:

- protects routes with JWT authentication

How it works:

1. Reads `req.headers.authorization`.
2. Checks that it starts with `Bearer `.
3. Splits out the token.
4. Verifies the token with `jwt.verify(..., process.env.JWT_SECRET)`.
5. Stores `decoded.userId` on `req.userId`.
6. Calls `next()` if valid.
7. Returns `401` if the token is missing or invalid.

This middleware is what turns the saved frontend token into backend identity.

### `backend/middleware/uploadMiddleware.js`

Purpose:

- handles receipt image uploads with Multer

How it works:

1. Recreates `__dirname` for ESM.
2. Uses `multer.diskStorage`.
3. Saves uploaded files into `backend/uploads`.
4. Names files as `Date.now() + '-' + originalname`.
5. Uses `fileFilter` to accept only images.
6. Exports the configured `upload` middleware.

Routes use this with `upload.single('receipt')`.

## 6. Backend Routes

### `backend/routes/userRoutes.js`

Endpoints:

- `POST /api/users` -> register
- `POST /api/users/login` -> login
- `GET /api/users` -> list users
- `GET /api/users/:userId` -> protected profile fetch
- `PUT /api/users/:userId/password` -> protected password change

### `backend/routes/expenseRoutes.js`

Endpoints:

- `POST /api/expenses/scan-receipt` -> OCR scan
- `POST /api/expenses` -> create expense
- `GET /api/expenses` -> get expenses by `userId` query param
- `GET /api/expenses/receipts` -> only expenses with receipts
- `PUT /api/expenses/:id` -> update expense
- `DELETE /api/expenses/:id` -> delete expense

All routes are protected and most use upload middleware where needed.

### `backend/routes/budgetRoutes.js`

Endpoints:

- `GET /api/budgets/:userId/snapshot/:monthYear`
- `POST /api/budgets/:userId/chat`
- `POST /api/budgets/:userId/summary`
- `GET /api/budgets/:userId/all`
- `POST /api/budgets/:userId`
- `GET /api/budgets/:userId/:monthYear`
- `DELETE /api/budgets/:userId/:monthYear`

Important routing detail:

- specific routes are placed before generic ones so Express matches correctly

## 7. Backend Controllers

### `backend/controllers/userController.js`

This file handles registration, login, profile reading, and password change.

#### `registerUser`

Flow:

1. Reads `firstName`, `lastName`, `phone`, `email`, `password` from `req.body`.
2. Rejects if any required field is missing.
3. Validates password strength with a regex.
4. Checks whether the email is already registered.
5. Generates a bcrypt salt.
6. Hashes the password.
7. Creates and saves the `User`.
8. Returns `201` and the new `userId`.

#### `loginUser`

Flow:

1. Reads `email` and `password`.
2. Finds the user by email.
3. Compares the submitted password against the stored hash.
4. Signs a JWT containing `{ userId: user._id }`.
5. Returns the token and a small user payload.

#### `getUsers`

Purpose:

- debug/admin style endpoint that returns all users except passwords

#### `getUserProfile`

Purpose:

- fetches a single user by `req.params.userId`
- excludes password from the response

#### `changePassword`

Flow:

1. Reads `currentPassword` and `newPassword`.
2. Loads the user including the hashed password.
3. Verifies the current password.
4. Hashes the new password.
5. Saves the user.

Important issue:

- it does not verify that `req.userId` matches `req.params.userId`
- so route protection exists, but ownership enforcement is weaker than it should be

### `backend/controllers/expenseController.js`

This is one of the most important files in the project.

It contains:

- receipt parsing helpers
- receipt OCR endpoint
- expense CRUD
- cache invalidation

#### Helper: `extractMerchantName`

Purpose:

- tries to guess the merchant/store name from OCR text lines

Strategies:

- line before a phone number
- lines near ZIP code patterns
- a clean top line that does not look like boilerplate

#### Helper: `inferCategoryFromItems`

Purpose:

- tries to infer the expense category from extracted receipt item names

How:

- category keyword map
- scores matches across items
- returns the highest-scoring category

#### Helper: `detectCategory`

Purpose:

- determines the overall category using merchant name or items

How:

- first checks for major brands
- then checks regex patterns for Food, Transport, Shopping, and others
- finally falls back to item-based inference

#### Helper: `parseReceiptText`

Purpose:

- turns raw OCR text into structured data

It extracts:

- `amount`
- `date`
- `description`
- `items`
- `category`

Amount logic:

- first looks for lines containing total-like phrases
- then payment-method lines
- then falls back to the largest detected price

Date logic:

- supports multiple formats:
  - `YYYY-MM-DD`
  - `MM/DD/YYYY`
  - month names like `Mar 25 2026`

Description logic:

- prefers merchant extraction
- otherwise searches early receipt lines and skips noise

Items logic:

- looks for lines ending in prices
- skips totals, taxes, card info, and similar non-item lines
- builds editable line-item data

#### `scanReceipt`

Purpose:

- OCR endpoint using Google Vision

Flow:

1. Verifies that a file exists.
2. Reads the uploaded file from disk.
3. Converts it to base64.
4. Calls Google Vision `DOCUMENT_TEXT_DETECTION`.
5. Reads the OCR text.
6. Parses it with `parseReceiptText`.
7. Returns both raw text and parsed structured data.

#### `createExpense`

Purpose:

- creates a new expense document

Flow:

1. Reads body values and `userId`.
2. Parses `items` from JSON if provided.
3. Creates the `Expense`.
4. Saves it.
5. Deletes cache keys for:
   - `expenses:${userId}`
   - `receipts:${userId}`
6. Returns the new expense.

#### `getExpenses`

Purpose:

- fetches all expenses for a user

Flow:

1. Reads `userId` from `req.query`.
2. Checks Redis cache first.
3. If cache hit, returns cached data.
4. If cache miss, queries Mongo sorted by date descending.
5. Stores results in cache.
6. Returns the data.

Important issue:

- there is unreachable code after an early `return` in the cache hit block

#### `updateExpense`

Purpose:

- updates an existing expense

Flow:

1. Finds the expense by ID.
2. Updates fields if new values are provided.
3. Parses updated `items` if present.
4. Replaces receipt image if a new file was uploaded.
5. Saves the document.
6. Invalidates relevant caches.

Important issue:

- it checks that the expense exists, but it does not verify ownership with `req.userId`

#### `deleteExpense`

Purpose:

- deletes an expense safely

Flow:

1. Finds the expense.
2. Confirms `expense.userId.toString() === req.userId`.
3. Deletes the document.
4. Clears related caches.

This function has stronger authorization handling than `updateExpense`.

#### `getAllReceipts`

Purpose:

- returns only expenses that have receipt images

Flow:

1. Reads `userId` query param.
2. Checks cache key `receipts:${userId}`.
3. On miss, queries expenses where `receiptPath` exists and is not null.
4. Caches the result.
5. Returns the receipts.

### `backend/controllers/budgetController.js`

This file handles monthly budgets, analytics snapshots, and AI budget chat.

#### Helper: `getCurrentMonthYear`

Returns the current month in `YYYY-MM` format.

#### `createOrUpdateBudget`

Flow:

1. Reads `userId` from route params.
2. Reads `monthYear`, `totalMonthlyBudget`, `categoryBudgets` from the body.
3. Validates amount and month format.
4. Converts `userId` to `ObjectId`.
5. Finds an existing budget for that month.
6. Updates it if found, otherwise creates it.
7. Saves and returns the result.

#### `getBudget`

Purpose:

- returns one specific monthly budget

If none exists, it returns `budget: null` instead of an error.

#### `getUserBudgets`

Purpose:

- returns all budgets for a user, sorted by most recent month first

#### `getDailySpentSnapshot`

Purpose:

- creates the analytics payload for the budget dashboard

It combines:

- budget data from `Budget`
- spending stats from `calculateDailySpentStats`
- safe daily budget math
- previous month comparison
- category budget status

Response includes:

- total budget
- current spending
- remaining budget
- percentage spent
- avg daily spend
- safe daily budget
- days elapsed and remaining
- category breakdown
- recent expenses
- previous month comparison

#### `chatWithBudgetAI`

Purpose:

- lets the user ask AI questions about their budget

Flow:

1. Validates the question.
2. Resolves the target month.
3. Loads the budget.
4. Loads expense stats.
5. Calculates safe daily budget.
6. Packages data for the AI prompt.
7. Calls `budgetAIChat`.
8. Returns the AI response.

#### `getBudgetSummary`

Purpose:

- generates a brief AI summary instead of chat-style Q&A

#### `deleteBudget`

Purpose:

- removes a budget for a given user and month

## 8. Backend Utilities

### `backend/utils/cache.js`

Purpose:

- wraps Redis operations behind safe helper functions

Functions:

- `getCache(key)`
- `setCache(key, value, ttl)`
- `deleteCache(key)`
- `deleteCachePatterns(pattern)`

Important behavior:

- every function checks `redis.isReady`
- if Redis is down, app behavior falls back without crashing

### `backend/utils/budgetAnalytics.js`

Purpose:

- computes budget-related metrics from expenses

#### `calculateDailySpentStats`

Returns:

- `currentSpending`
- `avgDailySpend`
- `daysElapsed`
- `daysRemaining`
- `totalDaysInMonth`
- `categoryBreakdown`
- `recentExpenses`

Important detail:

- expense dates are filtered using string comparison on `YYYY-MM-DD`
- that works only because the date strings are normalized

#### `calculateSafeDailyBudget`

Formula:

- `(remaining budget) / (remaining days)`

#### `compareWithPreviousMonth`

Purpose:

- calculates previous-month spending totals and count

#### `getCategoryBudgetStatus`

Purpose:

- compares configured category budgets with actual category spending

### `backend/utils/langchainService.js`

Purpose:

- connects the app to OpenAI via LangChain

Key parts:

- creates `ChatOpenAI`
- defines two prompt templates
- exports:
  - `budgetAIChat`
  - `generateBudgetSummary`

How `budgetAIChat` works:

1. Formats recent expenses.
2. Formats category budgets.
3. Injects values into a prompt string.
4. Calls `model.invoke(prompt)`.
5. Returns the LLM result.

How `generateBudgetSummary` works:

1. Finds top categories.
2. Computes percentage spent.
3. Builds a shorter prompt.
4. Calls the model and returns the result.

Important note:

- `PromptTemplate` is imported but not actually used
- the file manually does string replacement instead

## 9. Frontend Setup

### `frontend/package.json`

Purpose:

- defines React, router, charting, Axios, and Bootstrap dependencies

Important libraries:

- `react`
- `react-dom`
- `react-router-dom`
- `axios`
- `bootstrap`
- `react-bootstrap`
- `chart.js`
- `react-chartjs-2`
- `vite`

### `frontend/vite.config.js`

Purpose:

- enables the React SWC plugin for Vite

### `frontend/index.html`

Purpose:

- HTML shell for the Vite app
- contains `<div id="root"></div>` where React mounts

### `frontend/src/main.jsx`

Purpose:

- frontend entry point

Flow:

1. Imports React runtime.
2. Imports `createRoot`.
3. Loads global CSS and Bootstrap CSS.
4. Renders `<App />` into `#root`.

### `frontend/src/config.js`

Purpose:

- stores the base backend API URL

Current value:

- `http://localhost:5000/api`

## 10. Frontend Auth and Routing

### `frontend/src/context/AuthContext.jsx`

Purpose:

- central authentication state for the frontend

State:

- `user`
- `loading`

Behavior:

1. On mount, it checks `localStorage.getItem('bt_user')`.
2. If a user exists, it restores that into state.
3. `login(userData, token)` stores:
   - `bt_user`
   - `bt_auth`
   - `bt_token`
4. `logout()` removes those values.
5. Provides `user`, `isAuthenticated`, `login`, `logout`, and `loading`.

This is the main reason the app remembers the user across refreshes.

### `frontend/src/App.jsx`

Purpose:

- global app router and route protection

Main ideas:

- `ProtectedRoute` checks `useAuth()`
- redirects unauthenticated users to `/signin`
- `ErrorBoundary` stops a crash from taking down the whole UI

Routes:

- `/signin`
- `/signup`
- `/home`
  - `/home/dashboard`
  - `/home/expense`
  - `/home/past-expenses`
  - `/home/receipts`
  - `/home/budget`
  - `/home/subscriptions`
- `/profile`

Important note:

- `EditExpensePage` route exists in code but is commented out

## 11. Frontend API Layer

### `frontend/src/api/axiosInstance.js`

Purpose:

- creates one shared Axios client for the whole frontend

Behavior:

1. Sets `baseURL` from `config.js`.
2. Adds a 10-second timeout.
3. Adds default `Accept: application/json`.
4. Request interceptor:
   - reads `bt_token`
   - adds `Authorization: Bearer ...`
   - adds `Content-Type: application/json` unless the body is `FormData`
5. Response interceptor:
   - if a non-login request gets `401`, clears local storage and redirects to `/signin`

This file is the bridge between auth state and every API call.

### `frontend/src/api/services/authService.js`

Purpose:

- wraps auth endpoints

Functions:

- `loginUser(credentials)`
- `registerUser(userData)`

### `frontend/src/api/services/expenseService.js`

Purpose:

- wraps expense and receipt endpoints

Functions:

- `getExpenses(userId)`
- `scanReceiptWithVision(imageFile)`
- `addExpense(formData)`
- `updateExpense(id, updates)`
- `deleteExpense(id)`
- `getAllReceipts(userId)`

### `frontend/src/api/services/budgetService.js`

Purpose:

- wraps budget CRUD, analytics, and AI endpoints

Functions:

- `setBudget`
- `getBudget`
- `getUserBudgets`
- `deleteBudget`
- `getDailySpentSnapshot`
- `chatWithBudgetAI`
- `getBudgetSummary`

### `frontend/src/api/services/userService.js`

Purpose:

- wraps user-related endpoints

Functions used by the app:

- `getUserProfile`
- `changePassword`

Functions present but not backed by the current server:

- `updateUserProfile`
- `deleteUserAccount`

### `frontend/src/api/services/dashboardService.js`

Purpose:

- intended dashboard endpoint wrappers

Important issue:

- the backend does not currently expose:
  - `/expenses/dashboard`
  - `/expenses/summary`

So this file is currently unused / stale.

### `frontend/src/api/services/index.js`

Purpose:

- barrel file that re-exports service functions

## 12. Frontend Pages

### `frontend/src/pages/SignIn.jsx`

Purpose:

- login screen

State:

- `email`
- `password`
- `remember`
- `error`
- `isSubmitting`

Submit flow:

1. Prevent form refresh.
2. Validate that email and password are filled.
3. Call `loginUser`.
4. On success, call `login(...)` from `AuthContext`.
5. Navigate to `/home`.

Important issue:

- there are a lot of debug `console.log` statements still in the file

### `frontend/src/pages/SignUp.jsx`

Purpose:

- registration screen

Flow:

1. Tracks form fields in `formData`.
2. Calls `registerUser`.
3. Immediately calls `login({ userId, firstName })`.
4. Navigates to `/home`.

Important issue:

- backend registration does not return a JWT token
- but `AuthContext.login` expects `(userData, token)`
- this means signup does not set a valid `bt_token`
- protected API requests after signup may fail until the user signs in properly

### `frontend/src/pages/Home.jsx`

Purpose:

- main layout page after login

What it does:

- renders top navigation
- shows profile dropdown
- renders nested pages through `<Outlet />`

Important note:

- this file checks `bt_auth` from storage directly in addition to using auth context

### `frontend/src/pages/DashboardPage.jsx`

Purpose:

- monthly dashboard overview

Main responsibilities:

- fetches expenses
- filters by selected month
- compares current month vs previous month
- shows top stats
- shows recent expenses
- renders category doughnut chart
- allows edit and delete inline

Important pieces:

- helper functions for month formatting
- URL query param `?month=...`
- local edit modal state

Important issue:

- `getYearMonth` is declared twice, once at component scope and again inside an effect

### `frontend/src/pages/ExpensePage.jsx`

Purpose:

- create a new expense
- optionally OCR-scan a receipt image

This is another core file.

Major responsibilities:

- manual form entry
- image upload preview
- OCR request to backend
- parsed item editing
- category inference
- `FormData` submission with text + image

Important internal helpers:

- `categorizeItem`
- `guessCategory`
- `extractAmount`
- `extractDate`
- `extractDescription`
- `extractItems`

Important note:

- several of these parsing helpers are no longer needed on the frontend because the backend already returns parsed OCR data
- some remain as fallback / older logic

### `frontend/src/pages/PastExpensesPage.jsx`

Purpose:

- yearly expense history and drill-down analytics

Features:

- yearly monthly bar chart
- monthly drill-down
- category doughnut chart
- sorting and filtering
- inline edit/delete

This page is the more advanced history explorer.

### `frontend/src/pages/ReceiptVaultPage.jsx`

Purpose:

- gallery view of uploaded receipts grouped by category

Features:

- category folder view
- inside-folder receipt gallery
- search
- sort
- month filter
- image lightbox with next/previous navigation

### `frontend/src/pages/BudgetPage.jsx`

Purpose:

- budget dashboard shell

What it does:

- picks the selected month
- renders `DailySpentSnapshot`
- renders `FloatingChatbot`
- opens `BudgetManager` inside a modal

Important issue:

- `budgetRefresh` is updated after saving but not actually passed down to children, so saving a budget may not force a snapshot refetch

### `frontend/src/pages/Profile.jsx`

Purpose:

- user profile and account dashboard

Tabs:

- overview
- my expenses
- change password

What it fetches:

- profile from `/api/users/:userId`
- expenses from `/api/expenses?userId=...`

What it computes:

- total spent
- latest expense
- top category
- current month total

Important issue:

- imports `getExpenses` from the barrel file, but `index.js` does not export `budgetService`, only some services
- here it still works because `expenseService` is re-exported, but it is easy to lose track of what comes from where

### `frontend/src/pages/EditExpensePage.jsx`

Purpose:

- standalone edit page for expenses

Status:

- implemented, but route is commented out in `App.jsx`
- currently the app uses inline modals instead

## 13. Frontend Components

### `frontend/src/components/CategoryChart.jsx`

Purpose:

- reusable doughnut chart for expense totals by category

How it works:

1. Defines category color map.
2. Aggregates totals with `useMemo`.
3. Removes categories with zero spend.
4. Renders `Doughnut`.

### `frontend/src/components/ExpenseModal.jsx`

Purpose:

- modal wrapper that renders `ExpensePage` via a React portal

Status:

- appears unused by the current routing setup

### `frontend/src/components/DailySpentSnapshot.jsx`

Purpose:

- budget analytics card on the budget page

Flow:

1. Accepts `userId` and `monthYear` props.
2. Calls `getDailySpentSnapshot`.
3. Shows loading, error, or analytics view.
4. Displays:
   - current spend
   - previous month comparison
   - avg daily spend
   - safe daily budget
   - remaining budget
   - progress bar
   - day counts

Important issue:

- month labels inside the UI are hardcoded as `APRIL 2026` and `MARCH 2026`
- they should be derived from `monthYear` and previous-month data

### `frontend/src/components/BudgetManager.jsx`

Purpose:

- create or update a budget

Flow:

1. Loads existing budget on mount.
2. Allows total monthly budget input.
3. Optionally enables category budgets.
4. Validates that category sums do not exceed total budget.
5. Saves through `setBudget`.

### `frontend/src/components/FloatingChatbot.jsx`

Purpose:

- toggles the floating budget AI window

Simple behavior:

- open/close chat window
- pass `userId` and `monthYear` to `BudgetAI`

### `frontend/src/components/BudgetAI.jsx`

Purpose:

- chat UI for budget AI

Features:

- welcome message
- user/AI message thread
- loading state
- quick suggestion buttons
- summary request button
- enter-to-send behavior

Flow:

1. Adds the user message to local state.
2. Calls `chatWithBudgetAI`.
3. Appends the AI reply.
4. Separate button calls `getBudgetSummary`.

## 14. Styling Files

These files mostly contain presentation only. Their logic role is:

- `frontend/src/styles/auth.css`: sign-in/sign-up styles and some modal styles
- `frontend/src/styles/dashboard.css`: home layout, dashboard, nav, cards
- `frontend/src/styles/expense.css`: add-expense page and form layout
- `frontend/src/styles/editExpensePage.css`: standalone edit page polish
- `frontend/src/styles/pastExpenses.css`: history charts and drill-down page
- `frontend/src/styles/profile.css`: profile hero, tabs, cards
- `frontend/src/styles/receiptVault.css`: receipt folder/gallery/lightbox UI
- `frontend/src/styles/budgetPage.css`: budget page shell and modal
- `frontend/src/styles/dailySpentSnapshot.css`: budget analytics cards
- `frontend/src/styles/budgetManager.css`: budget form
- `frontend/src/styles/budgetAI.css`: chat UI
- `frontend/src/styles/floatingChatbot.css`: floating chat launcher
- `frontend/src/index.css`: global app styles
- `frontend/src/App.css`: app-wide styles, likely mostly legacy

## 15. Assets and Other Files

### `frontend/src/assets/*`

Purpose:

- image assets used by the UI

### `frontend/public/vite.svg`

Purpose:

- default Vite asset, likely not important to app behavior

### `frontend/eslint.config.js`

Purpose:

- linting rules for frontend JavaScript and JSX

### `backend/README.md`

Important note:

- this README appears stale
- it mentions `POST /api/chat`, but the current code uses budget routes like `/api/budgets/:userId/chat`

### `frontend/README.md`

Purpose:

- still the default Vite template README
- not specific to this app

## 16. Real Request Flows

### Sign In Flow

1. User submits `SignIn.jsx`.
2. `loginUser` in `authService.js` sends `POST /api/users/login`.
3. `userController.loginUser` verifies credentials and signs a JWT.
4. Frontend stores token in `localStorage`.
5. Protected routes become accessible.

### Add Expense Flow

1. User fills `ExpensePage.jsx`.
2. Frontend builds `FormData`.
3. `expenseService.addExpense` sends `POST /api/expenses`.
4. `uploadMiddleware` stores the receipt image.
5. `expenseController.createExpense` saves MongoDB data.
6. Redis cache for expenses/receipts is cleared.
7. Dashboard/history pages later refetch updated data.

### Scan Receipt Flow

1. User uploads a receipt image in `ExpensePage.jsx`.
2. Frontend calls `scanReceiptWithVision`.
3. Backend `scanReceipt` reads the image and calls Google Vision.
4. OCR text is parsed into amount/date/merchant/items/category.
5. Frontend fills the form automatically.
6. User reviews and submits the final expense.

### Budget Snapshot Flow

1. User opens Budget page.
2. `DailySpentSnapshot.jsx` calls `/api/budgets/:userId/snapshot/:monthYear`.
3. Backend loads budget + expenses.
4. `budgetAnalytics.js` computes metrics.
5. Frontend renders cards, progress bar, and comparisons.

### Budget AI Flow

1. User opens `FloatingChatbot`.
2. `BudgetAI.jsx` sends a question.
3. Backend `chatWithBudgetAI` loads budget data and spending stats.
4. `langchainService.js` builds an AI prompt.
5. OpenAI response is returned and shown as chat text.

## 17. Main Codebase Gaps and Mismatches

These are useful to know while learning the code because they explain confusing behavior:

- `backend/models/DashboardPage.js` is incomplete and unused.
- `frontend/src/api/services/dashboardService.js` points to endpoints that do not exist.
- `frontend/src/api/services/userService.js` includes update/delete functions that do not exist on the backend.
- `frontend/src/pages/SignUp.jsx` logs in without receiving a JWT, which can break protected calls after signup.
- `frontend/src/components/DailySpentSnapshot.jsx` hardcodes month labels.
- `backend/controllers/expenseController.js` update route lacks ownership verification.
- `backend/controllers/userController.js` password change route should verify the authenticated user matches the target user.
- `backend/README.md` is outdated.

## 18. Best Order to Learn the Code

If you want to understand this project from scratch, read in this order:

1. `frontend/src/main.jsx`
2. `frontend/src/App.jsx`
3. `frontend/src/context/AuthContext.jsx`
4. `frontend/src/api/axiosInstance.js`
5. `backend/server.js`
6. `backend/routes/*.js`
7. `backend/controllers/userController.js`
8. `backend/controllers/expenseController.js`
9. `backend/models/*.js`
10. `frontend/src/pages/SignIn.jsx`
11. `frontend/src/pages/ExpensePage.jsx`
12. `frontend/src/pages/DashboardPage.jsx`
13. `frontend/src/pages/BudgetPage.jsx`
14. `backend/controllers/budgetController.js`
15. `backend/utils/budgetAnalytics.js`
16. `backend/utils/langchainService.js`

## 19. How to Use This Guide With the Code

When you open a file, ask three questions:

1. Is this file defining data, UI, transport, or business logic?
2. What inputs come in?
3. What outputs or side effects go out?

For example:

- `routes` receive URLs and choose controllers
- `controllers` receive requests and choose business logic
- `models` define MongoDB document shape
- `services` define frontend HTTP calls
- `pages` coordinate UI + state + service calls
- `components` render reusable chunks of UI

## 20. Suggested Next Step

The fastest way to truly master this codebase is to do a guided walkthrough one feature at a time:

1. authentication
2. add expense and receipt OCR
3. dashboard and history
4. budgets and AI chat

That approach is easier to retain than trying to memorize every file at once.
