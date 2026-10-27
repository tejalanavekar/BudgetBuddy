import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import React, { lazy, Suspense, useEffect } from 'react';
import Home from "./pages/Home";
import PageLoader from './components/PageLoader';
import './styles/auth.css';

// Every page below is its own separate file the browser only fetches when a user
// actually navigates there, instead of all of them being part of one bundle every
// user downloads on first load regardless of which pages they ever visit.
// Home is NOT lazy — it's the layout shell (navbar, FloatingChatbot) rendered on
// every /home/* route, so it belongs in the main bundle like the router itself does.
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ExpensePage = lazy(() => import("./pages/ExpensePage"));
const PastExpensesPage = lazy(() => import('./pages/PastExpensesPage'));
const ReceiptVaultPage = lazy(() => import('./pages/ReceiptVaultPage'));
const BudgetPage = lazy(() => import("./pages/BudgetPage"));
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage'));
const Profile = lazy(() => import("./pages/Profile"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

// Simple Error Boundary
// 1. Protected Route Wrapper -> Bouncer that guards  the  entrance
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth(); //pulls from the Context

  if (loading) return <PageLoader />; // loading -> user Refresh or initial check then it should read the localstorage

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return children; //user logged in -> component says go ahead.
};

// Vite builds every lazy-loaded page as its own file, named with a content hash
// (e.g. profile-Dssz-sTD.css). After a new deploy, those old-hash files are gone —
// a browser tab that was already open before the deploy still references them, and
// navigating to a not-yet-visited lazy page throws exactly this error. It isn't a
// real app bug, just a stale tab; reloading picks up the current deployment.
const isStaleChunkError = (error) => {
  const msg = String(error?.message || '');
  return /Unable to preload CSS|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(msg);
};

//If app crashed the  whole website wont crash instead it will show the error message and the error details in the console.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    // Reload once automatically for a stale-chunk error — the sessionStorage guard
    // stops an infinite reload loop if this doesn't actually fix it (a genuinely
    // broken deploy, not a stale one).
    if (isStaleChunkError(error) && !sessionStorage.getItem('bt_reloaded_for_stale_chunk')) {
      sessionStorage.setItem('bt_reloaded_for_stale_chunk', 'true');
      window.location.reload();
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, color: 'red' }}>
          <h2>Something went wrong.</h2>
          <pre>{this.state.error && this.state.error.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}


function App() {
  // Successfully rendering means any earlier stale-chunk reload (if one happened)
  // actually fixed things — clear the guard so a later deployment in this same
  // browser session can also trigger one auto-reload instead of being suppressed.
  useEffect(() => {
    sessionStorage.removeItem('bt_reloaded_for_stale_chunk');
  }, []);

  return (
    <ErrorBoundary>
      
      <AuthProvider>
        <Router>
          <Suspense fallback={<PageLoader />}>
          <Routes>

            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

            
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="expense" element={<ExpensePage />} />
              <Route path="past-expenses" element={<PastExpensesPage />} />
              <Route path="receipts" element={<ReceiptVaultPage />} />
              <Route path="budget" element={<BudgetPage />} />
              <Route path="subscriptions" element={<SubscriptionsPage />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* <Route
              path="/edit-expense/:id"
              element={
                <ProtectedRoute>
                  <EditExpensePage />
                </ProtectedRoute>
              }
            /> */}

            <Route path="/" element={<Navigate to="/signin" replace />} />
            <Route path="*" element={<Navigate to="/signin" replace />} />
          </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;