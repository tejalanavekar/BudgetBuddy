import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import React from 'react';
import ExpensePage from "./pages/ExpensePage";  
import DashboardPage from "./pages/DashboardPage";
import BudgetPage from "./pages/BudgetPage";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Home from "./pages/Home";
import ExpenseModal from "./components/ExpenseModal";
import Profile from "./pages/Profile";
import SettingsPage from "./pages/SettingsPage";
import './styles/auth.css';
import PastExpensesPage from './pages/PastExpensesPage';
import ReceiptVaultPage from './pages/ReceiptVaultPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
// Simple Error Boundary
// 1. Protected Route Wrapper -> Bouncer that guards  the  entrance
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth(); //pulls from the Context

  if (loading) return (
    <div style={{ minHeight: '100vh', width: '100vw', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-on-page)' }}>
      Loading...
    </div>
  ); // loading -> user Refresh or initial check then it should read the localstorage
  
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
          <Routes>
          
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />

            
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
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;