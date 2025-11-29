import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ExpensePage from "./pages/ExpensePage";  
import DashboardPage from "./pages/DashboardPage";

function App() {
  return (
    <Router>
      <nav className="navbar navbar-expand navbar-light bg-light mb-4">
        <div className="container">
          <Link className="navbar-brand" to="/">Budget Tracker</Link>
          <div className="navbar-nav">
            <Link className="nav-link" to="/">Add Expense</Link>
            <Link className="nav-link" to="/dashboard">Dashboard</Link>
          </div>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<ExpensePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </Router>
  );
}

export default App;