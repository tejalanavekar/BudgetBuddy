import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import React, { lazy, Suspense } from 'react';
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
    // You can log errorInfo here if needed
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