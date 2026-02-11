import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import React from 'react';
// Simple Error Boundary
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
import ExpensePage from "./pages/ExpensePage";  
import DashboardPage from "./pages/DashboardPage";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Home from "./pages/Home";
import ExpenseModal from "./components/ExpenseModal";
import Profile from "./pages/Profile";
import './styles/auth.css';

function App() {
  const isAuth = () => {
    return localStorage.getItem('bt_auth') === 'true' || sessionStorage.getItem('bt_auth') === 'true';
  };

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          <Route
            path="/home"
            element={isAuth() ? <Home /> : <Navigate to="/signin" replace />}
          >
            <Route index element={<DashboardPage />} />
            <Route path="expense" element={<ExpenseModal />} />
            <Route path="dashboard" element={<DashboardPage />} />
          </Route>

          <Route path="/profile" element={isAuth() ? <Profile /> : <Navigate to="/signin" replace />} />

          {/* Always show sign-in first on root and unknown routes */}
          <Route path="/" element={<Navigate to="/signin" replace />} />
          <Route path="*" element={<Navigate to="/signin" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;