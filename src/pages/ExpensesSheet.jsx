import React, { useState, useEffect, useRef } from 'react';
import { getPartnerLedger, addPartnerLedgerEntry, deletePartnerLedgerEntry, getUniquePartners } from '../lib/api';
import { Plus, Trash2, Save, IndianRupee, Search } from 'lucide-react';

// Custom Smart Dropdown Component
const ExpensesSheet = () => {
  const [uniquePartners, setUniquePartners] = useState([]);
  const [filterPerson, setFilterPerson] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Multi-entry form state
  const [rows, setRows] = useState([
    { id: Date.now(), date: new Date().toISOString().split('T')[0], person: '', description: '', expense: '', receipt: '' }
  ]);

  useEffect(() => {
    fetchPartners();
  }, []);

  useEffect(() => {
    if (filterPerson) {
      loadLedger(filterPerson);
    } else {
      setEntries([]);
    }
  }, [filterPerson]);

  const fetchPartners = async () => {
    try {
      const partners = await getUniquePartners();
      setUniquePartners(partners);
    } catch (err) {
      console.error('Failed to load partners', err);
    }
  };

  const loadLedger = async (personName) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPartnerLedger(personName);
      
      let currentBalance = 0;
      const dataWithBalance = data.map(item => {
        const exp = Number(item.expense) || 0;
        const rec = Number(item.receipt) || 0;
        currentBalance = currentBalance + rec - exp;
        return {
          ...item,
          calculatedBalance: currentBalance
        };
      });
      
      setEntries(dataWithBalance);
    } catch (err) {
      console.error(err);
      setError('Failed to load ledger data');
    } finally {
      setLoading(false);
    }
  };

  const handleRowChange = (id, field, value) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const addRow = () => {
    const lastRow = rows[rows.length - 1];
    setRows([
      ...rows,
      { 
        id: Date.now(), 
        date: lastRow ? lastRow.date : new Date().toISOString().split('T')[0], 
        person: lastRow ? lastRow.person : '', 
        description: '', 
        expense: '', 
        receipt: '' 
      }
    ]);
  };

  const removeRow = (id) => {
    if (rows.length === 1) return; // keep at least one row
    setRows(rows.filter(row => row.id !== id));
  };

  const handleKeyDown = (e, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'expense' || field === 'receipt') {
        addRow();
      }
    }
  };

  const handleSubmitAll = async (e) => {
    e.preventDefault();
    
    // Filter out rows that are completely empty
    const validRows = rows.filter(r => r.person.trim() || r.description.trim() || r.expense || r.receipt);
    
    if (validRows.length === 0) {
      setError('Please fill in at least one entry');
      return;
    }
    
    // Validate rows
    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      if (!r.person.trim()) return setError(`Row ${i+1}: Person name is required`);
      if (!r.date) return setError(`Row ${i+1}: Date is required`);
      if (!r.description.trim()) return setError(`Row ${i+1}: Description is required`);
    }

    try {
      setLoading(true);
      setError(null);
      
      const payloads = validRows.map(r => ({
        partner_name: r.person.trim(),
        date: r.date,
        description: r.description.trim(),
        expense: Number(r.expense) || 0,
        receipt: Number(r.receipt) || 0,
        balance: 0
      }));
      
      await addPartnerLedgerEntry(payloads);
      
      // Reset form to a single empty row keeping the last date/person for convenience
      const lastRow = validRows[validRows.length - 1];
      setRows([
        { id: Date.now(), date: lastRow.date, person: lastRow.person, description: '', expense: '', receipt: '' }
      ]);
      
      await fetchPartners();
      if (filterPerson) {
        await loadLedger(filterPerson);
      }
      
    } catch (err) {
      console.error(err);
      setError('Failed to add entries');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      setLoading(true);
      await deletePartnerLedgerEntry(id);
      if (filterPerson) {
        await loadLedger(filterPerson);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to delete entry');
      setLoading(false);
    }
  };

  const totalExpense = entries.reduce((sum, item) => sum + (Number(item.expense) || 0), 0);
  const totalReceipt = entries.reduce((sum, item) => sum + (Number(item.receipt) || 0), 0);
  const finalBalance = entries.length > 0 ? entries[entries.length - 1].calculatedBalance : 0;

  return (
    <div>
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Expenses Sheet</h1>
      </header>
      
      {/* Multi-Entry Form */}
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>Add New Expenses</h2>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(248,81,73,0.1)', borderRadius: '4px' }}>{error}</div>}
        
        <form onSubmit={handleSubmitAll}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Table Header for Form */}
            <div style={{ display: 'grid', gridTemplateColumns: '150px 200px 1fr 120px 120px 50px', gap: '0.5rem', fontWeight: 'bold', color: 'var(--text-secondary)', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>Date *</div>
              <div>Person (Expense By) *</div>
              <div>Description *</div>
              <div>Expense (Dr)</div>
              <div>Receipt (Cr)</div>
              <div></div>
            </div>
            
            {/* Rows */}
            {rows.map((row, index) => (
              <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '150px 200px 1fr 120px 120px 50px', gap: '0.5rem', alignItems: 'start' }}>
                <input 
                  type="date" 
                  className="input-field" 
                  value={row.date}
                  onChange={(e) => handleRowChange(row.id, 'date', e.target.value)}
                  style={{ marginBottom: 0 }}
                  required
                />
                
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text"
                    className="input-field"
                    list={`person-list-${row.id}`}
                    value={row.person}
                    onChange={(e) => handleRowChange(row.id, 'person', e.target.value)}
                    placeholder="Type or select Person"
                    style={{ width: '100%', marginBottom: 0 }}
                    required
                  />
                  <datalist id={`person-list-${row.id}`}>
                    {uniquePartners.map((p, idx) => <option key={idx} value={p} />)}
                  </datalist>
                </div>

                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Details..." 
                  value={row.description}
                  onChange={(e) => handleRowChange(row.id, 'description', e.target.value)}
                  style={{ marginBottom: 0 }}
                  required
                />

                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="0.00" 
                  value={row.expense}
                  onChange={(e) => handleRowChange(row.id, 'expense', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'expense')}
                  min="0"
                  step="0.01"
                  style={{ marginBottom: 0 }}
                />

                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="0.00" 
                  value={row.receipt}
                  onChange={(e) => handleRowChange(row.id, 'receipt', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'receipt')}
                  min="0"
                  step="0.01"
                  style={{ marginBottom: 0 }}
                />

                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '0.5rem', color: rows.length === 1 ? 'var(--text-muted)' : 'var(--danger)', height: '42px' }}
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length === 1}
                  title="Remove Row"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={18} /> Submit All Entries
            </button>
          </div>
        </form>
      </div>

      {/* Ledger Viewer */}
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', margin: 0 }}>View Ledger</h2>
          <div style={{ width: '300px' }}>
            <div style={{ position: 'relative' }}>
              <input 
                type="text"
                className="input-field"
                list="filter-person-list"
                value={filterPerson}
                onChange={(e) => setFilterPerson(e.target.value)}
                placeholder="Search person to view ledger..."
                style={{ width: '100%', marginBottom: 0 }}
              />
              <datalist id="filter-person-list">
                {uniquePartners.map((p, idx) => <option key={idx} value={p} />)}
              </datalist>
            </div>
          </div>
        </div>

        {!filterPerson ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <Search size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>Select a person from the dropdown above to view their ledger.</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Expense</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <IndianRupee size={20} /> {totalExpense.toFixed(2)}
                </div>
              </div>
              <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Receipt</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <IndianRupee size={20} /> {totalReceipt.toFixed(2)}
                </div>
              </div>
              <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Net Balance</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: finalBalance >= 0 ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <IndianRupee size={20} /> {Math.abs(finalBalance).toFixed(2)} {finalBalance >= 0 ? '(Cr)' : '(Dr)'}
                </div>
              </div>
            </div>

            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Expense (Dr)</th>
                    <th style={{ textAlign: 'right' }}>Receipt (Cr)</th>
                    <th style={{ textAlign: 'right' }}>Balance</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && entries.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading data...</td></tr>
                  ) : entries.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No entries found for {filterPerson}</td></tr>
                  ) : (
                    entries.map(entry => {
                      const d = new Date(entry.date);
                      const formattedDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                      const exp = Number(entry.expense) || 0;
                      const rec = Number(entry.receipt) || 0;
                      const bal = entry.calculatedBalance;
                      
                      return (
                        <tr key={entry.id}>
                          <td>{formattedDate}</td>
                          <td>{entry.description}</td>
                          <td style={{ textAlign: 'right', color: exp > 0 ? 'var(--danger)' : 'inherit' }}>
                            {exp > 0 ? exp.toFixed(2) : '-'}
                          </td>
                          <td style={{ textAlign: 'right', color: rec > 0 ? 'var(--success)' : 'inherit' }}>
                            {rec > 0 ? rec.toFixed(2) : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: bal >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {Math.abs(bal).toFixed(2)} {bal >= 0 ? 'Cr' : 'Dr'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button className="btn btn-secondary" style={{ padding: '0.3rem', color: 'var(--danger)' }} onClick={() => handleDelete(entry.id)} title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExpensesSheet;
