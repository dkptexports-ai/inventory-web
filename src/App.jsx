import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Billing from './pages/Billing';
import Styles from './pages/Styles';
import StyleLedger from './pages/StyleLedger';
import Vendors from './pages/Vendors';
import MasterData from './pages/MasterData';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/styles" element={<Styles />} />
            <Route path="/styles/:id" element={<StyleLedger />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/master" element={<MasterData />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
