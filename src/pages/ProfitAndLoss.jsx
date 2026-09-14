import React, { useState, useEffect } from 'react';
import { 
  getCustomerReceipts, 
  getPurchaseRegister, 
  getPartnerLedger, 
  getSalaryPayments, 
  getPnlManualExpenses, 
  updatePnlManualExpense 
} from '../lib/api';
import { TrendingUp, TrendingDown, IndianRupee, Save } from 'lucide-react';

const ProfitAndLoss = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingManual, setSavingManual] = useState(false);

  // Data States
  const [receipts, setReceipts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [anilExpenses, setAnilExpenses] = useState(0);
  const [karambirExpenses, setKarambirExpenses] = useState(0);
  const [dkptSalary, setDkptSalary] = useState(0);
  const [malikSalary, setMalikSalary] = useState(0);
  
  // Manual Expenses State
  const [manualExpenses, setManualExpenses] = useState({
    'RENT PANIPAT FACTORY': 0,
    'RENT GANAUR FACTORY': 0,
    'MALIK GST PAID EXP': 0,
    'DKPT GST PAID EXP': 0,
    'ELECTRICITY': 0
  });

  useEffect(() => {
    fetchPnlData();
  }, []);

  const fetchPnlData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [
        recData, 
        purData, 
        anilData, 
        karambirData, 
        salaryData, 
        manualData
      ] = await Promise.all([
        getCustomerReceipts(),
        getPurchaseRegister(),
        getPartnerLedger('Anil'),
        getPartnerLedger('Karambir'),
        getSalaryPayments(),
        getPnlManualExpenses()
      ]);

      // Income (Receipts)
      setReceipts(recData);

      // Purchases
      setPurchases(purData);

      // Partner Expenses (Sum of 'expense' column)
      setAnilExpenses(anilData.reduce((sum, item) => sum + (Number(item.expense) || 0), 0));
      setKarambirExpenses(karambirData.reduce((sum, item) => sum + (Number(item.expense) || 0), 0));

      // Salaries (Filter by company name from the joined table if it exists, otherwise fallback to logic)
      let dkptSum = 0;
      let malikSum = 0;
      
      salaryData.forEach(sal => {
        const amt = (Number(sal.amount_cash) || 0) + (Number(sal.amount_bank) || 0);
        // Assuming companies(name) is available via the join
        const compName = sal.companies?.name?.toLowerCase() || '';
        if (compName.includes('dkpt')) {
          dkptSum += amt;
        } else if (compName.includes('malik')) {
          malikSum += amt;
        }
      });
      setDkptSalary(dkptSum);
      setMalikSalary(malikSum);

      // Manual Expenses
      if (manualData && manualData.length > 0) {
        const manualMap = { ...manualExpenses };
        manualData.forEach(item => {
          if (manualMap[item.head_name] !== undefined) {
            manualMap[item.head_name] = Number(item.amount) || 0;
          }
        });
        setManualExpenses(manualMap);
      }

    } catch (err) {
      console.error(err);
      setError('Failed to fetch P&L data or Manual Expenses table is missing. Did you run the SQL script?');
    } finally {
      setLoading(false);
    }
  };

  const handleManualExpenseChange = (key, value) => {
    setManualExpenses(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveManualExpense = async (key) => {
    try {
      setSavingManual(true);
      await updatePnlManualExpense(key, Number(manualExpenses[key]) || 0);
      // alert(`Saved ${key}`);
    } catch (err) {
      console.error(err);
      alert(`Failed to save ${key}`);
    } finally {
      setSavingManual(false);
    }
  };

  // Calculations
  const totalIncome = receipts.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  
  const totalPurchases = purchases.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalManual = Object.values(manualExpenses).reduce((sum, val) => sum + (Number(val) || 0), 0);
  const totalExpenses = totalPurchases + totalManual + dkptSalary + malikSalary + anilExpenses + karambirExpenses;
  
  const netProfit = totalIncome - totalExpenses;
  
  // Profit Sharing
  const anilShare = netProfit * (2 / 3);
  const karambirShare = netProfit * (1 / 3);
  const isProfit = netProfit >= 0;

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Profit & Loss...</div>;
  }

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Profit & Loss Statement</h1>
        <button className="btn btn-secondary" onClick={fetchPnlData}>Refresh Data</button>
      </header>
      
      {error && <div style={{ color: 'var(--danger)', padding: '1rem', background: 'rgba(248,81,73,0.1)', marginBottom: '1rem', borderRadius: '4px' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem', alignItems: 'start' }}>
        
        {/* Income Side */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} /> Income
          </h2>
          
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>Receipts</h3>
            {receipts.length === 0 ? (
              <div style={{ padding: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No receipts found</div>
            ) : (
              receipts.map(rec => {
                const amt = Number(rec.amount) || 0;
                if (amt === 0) return null; // Hide 0 balance
                
                const d = new Date(rec.date);
                const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                
                return (
                  <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.875rem' }}>
                    <span>{rec.description} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({dateStr})</span></span>
                    <span>₹ {amt.toFixed(2)}</span>
                  </div>
                );
              })
            )}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', marginTop: 'auto', borderTop: '2px solid var(--border-color)' }}>
            <span style={{ fontWeight: 'bold' }}>Total Income</span>
            <span style={{ fontWeight: 'bold', color: 'var(--success)', fontSize: '1.25rem' }}>₹ {totalIncome.toFixed(2)}</span>
          </div>
        </div>

        {/* Expense Side */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingDown size={20} /> Expenses
          </h2>
          
          {/* Manual Fixed Expenses */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>Fixed & Manual Expenses</h3>
            
            {Object.keys(manualExpenses).map(key => {
              // We show inputs for all manual expenses so they can edit them, even if 0.
              // If requirement strictly says "hide if 0", then we couldn't edit them. We'll show them.
              return (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0' }}>
                  <span style={{ fontSize: '0.875rem' }}>{key}</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="number" 
                      className="input-field" 
                      style={{ padding: '0.2rem', width: '100px', textAlign: 'right' }} 
                      value={manualExpenses[key] === 0 ? '' : manualExpenses[key]}
                      placeholder="0"
                      onChange={(e) => handleManualExpenseChange(key, e.target.value)}
                      onBlur={() => handleSaveManualExpense(key)}
                    />
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.2rem 0.5rem' }} 
                      onClick={() => handleSaveManualExpense(key)}
                      disabled={savingManual}
                      title="Save"
                    >
                      <Save size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Auto Salaries & Partners */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>Salaries & Partner Expenses</h3>
            
            {dkptSalary > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.875rem' }}>
                <span>DKPT SALARY PANIPAT</span>
                <span>₹ {dkptSalary.toFixed(2)}</span>
              </div>
            )}
            {malikSalary > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.875rem' }}>
                <span>MALIK SALARY GANAUR</span>
                <span>₹ {malikSalary.toFixed(2)}</span>
              </div>
            )}
            {anilExpenses > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.875rem' }}>
                <span>ANIL EXPENSE</span>
                <span>₹ {anilExpenses.toFixed(2)}</span>
              </div>
            )}
            {karambirExpenses > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.875rem' }}>
                <span>KARAMBIR EXPENSES</span>
                <span>₹ {karambirExpenses.toFixed(2)}</span>
              </div>
            )}
            
            {dkptSalary === 0 && malikSalary === 0 && anilExpenses === 0 && karambirExpenses === 0 && (
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No salary or partner expenses yet.</div>
            )}
          </div>

          {/* Detailed Purchases */}
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>Purchases (Supplier Invoices)</h3>
            
            {purchases.length === 0 ? (
              <div style={{ padding: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No purchases found</div>
            ) : (
              purchases.map(pur => {
                const amt = Number(pur.amount) || 0;
                if (amt === 0) return null; // Hide 0 balance
                
                return (
                  <div key={pur.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.875rem' }}>
                    <span>{pur.supplier_name} {pur.invoice_no ? `(${pur.invoice_no})` : ''}</span>
                    <span>₹ {amt.toFixed(2)}</span>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', marginTop: 'auto', borderTop: '2px solid var(--border-color)' }}>
            <span style={{ fontWeight: 'bold' }}>Total Expenses</span>
            <span style={{ fontWeight: 'bold', color: 'var(--danger)', fontSize: '1.25rem' }}>₹ {totalExpenses.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Net Result */}
      <div className="glass-card" style={{ marginBottom: '2rem', background: isProfit ? 'rgba(46, 160, 67, 0.05)' : 'rgba(248, 81, 73, 0.05)' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>
          Net {isProfit ? 'Profit' : 'Loss'}
        </h2>
        <div style={{ fontSize: '3rem', fontWeight: 'bold', textAlign: 'center', color: isProfit ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <IndianRupee size={40} /> {Math.abs(netProfit).toFixed(2)}
        </div>
      </div>

      {/* Profit Sharing */}
      <div className="glass-card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>{isProfit ? 'Profit' : 'Loss'} Sharing Distribution</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Anil</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Share: 2/3 (66.67%)</p>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: isProfit ? 'var(--success)' : 'var(--danger)' }}>
              ₹ {Math.abs(anilShare).toFixed(2)}
            </div>
          </div>
          <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Karambir</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Share: 1/3 (33.33%)</p>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: isProfit ? 'var(--success)' : 'var(--danger)' }}>
              ₹ {Math.abs(karambirShare).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ProfitAndLoss;
