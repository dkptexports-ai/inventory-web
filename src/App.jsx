import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Billing from './pages/Billing';
import Styles from './pages/Styles';
import StyleLedger from './pages/StyleLedger';
import BatchLedger from './pages/BatchLedger';
import Vendors from './pages/Vendors';
import MasterData from './pages/MasterData';
import Login from './pages/Login';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Salary from './pages/Salary';
import ExpensesSheet from './pages/ExpensesSheet';
import ReceiptSheet from './pages/ReceiptSheet';
import PurchaseRegister from './pages/PurchaseRegister';
import ProfitAndLoss from './pages/ProfitAndLoss';
import PartnerSheet from './pages/PartnerSheet';

function App() {
  // Simplified auth state for now
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="app-container">
        <Sidebar onLogout={handleLogout} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/salary" element={<Salary />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/styles" element={<Styles />} />
            <Route path="/styles/:id" element={<StyleLedger />} />
            <Route path="/batch/:batchNo" element={<BatchLedger />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/master" element={<MasterData />} />
            <Route path="/expenses" element={<ExpensesSheet />} />
            <Route path="/receipts" element={<ReceiptSheet />} />
            <Route path="/purchases" element={<PurchaseRegister />} />
            <Route path="/pnl" element={<ProfitAndLoss />} />
            <Route path="/partner" element={<PartnerSheet />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
