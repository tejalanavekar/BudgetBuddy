import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import React from 'react';
import ExpensePage from "./pages/ExpensePage";  
import DashboardPage from "./pages/DashboardPage";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Home from "./pages/Home";
import ExpenseModal from "./components/ExpenseModal";
import Profile from "./pages/Profile";
import './styles/auth.css';
// Simple Error Boundary

// 1. Protected Route Wrapper -> Bouncer that guards  the  entrance
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth(); //pulls from the Context

  if (loading) return <div>Loading...</div>; // loading -> user Refresh or initial check then it should read the localstorage
  
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
            </Route>

            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />

            <Route path="/" element={<Navigate to="/signin" replace />} />
            <Route path="*" element={<Navigate to="/signin" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;