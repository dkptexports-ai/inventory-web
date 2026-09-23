import React, { useState, useEffect } from 'react';
import { getVendors, getStyles, ensureStyle, ensureVendor, addTransaction, getRecentTransactions, getNextBatchNumber, getBatchesByExactStyle, getBatchLedger, updateTransaction, deleteTransaction } from '../lib/api';
import { Plus, Trash2, Save, Edit2, X, Check, Info } from 'lucide-react';


const BatchLedgerModal = ({ batchNo, onClose }) => {
  const [ledger, setLedger] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getBatchLedger(batchNo).then(data => {
      setLedger(data);
      setLoading(false);
    });
  }, [batchNo]);

  let totalIn = 0;
  let totalOut = 0;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-card" style={{ width: '90%', maxWidth: '700px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem' }}>Batch Details: {batchNo}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><X /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <p>Loading ledger...</p>
          ) : ledger.length === 0 ? (
            <p>No history found for this batch.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Date</th>
                  <th style={{ padding: '0.5rem' }}>Firm</th>
                  <th style={{ padding: '0.5rem' }}>Style</th>
                  <th style={{ padding: '0.5rem' }}>IN</th>
                  <th style={{ padding: '0.5rem' }}>OUT</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map(tx => {
                  const d = new Date(tx.date || tx.created_at);
                  const formattedDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                  totalIn += Number(tx.inward_qty) || 0;
                  totalOut += Number(tx.outward_qty) || 0;
                  return (
                    <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.5rem' }}>{formattedDate}</td>
                      <td style={{ padding: '0.5rem' }}>{tx.firm}</td>
                      <td style={{ padding: '0.5rem' }}>{tx.styles?.name}</td>
                      <td style={{ padding: '0.5rem', color: tx.inward_qty > 0 ? 'var(--success)' : 'inherit' }}>{tx.inward_qty || '-'}</td>
                      <td style={{ padding: '0.5rem', color: tx.outward_qty > 0 ? 'var(--danger)' : 'inherit' }}>{tx.outward_qty || '-'}</td>
                    </tr>
                  );
                })}
                <tr style={{ fontWeight: 'bold', borderTop: '2px solid var(--border-color)' }}>
                  <td colSpan="3" style={{ padding: '0.5rem', textAlign: 'right' }}>Current Stock Balance:</td>
                  <td colSpan="2" style={{ padding: '0.5rem', color: totalIn - totalOut > 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {totalIn - totalOut}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const SmartStyleDropdown = ({ item, updateStyle, styles }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef(null);
  
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredStyles = styles.filter(s => s.name.toLowerCase().includes(item.styleName.toLowerCase()));

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input 
        type="text"
        className="input-field style-input" 
        placeholder="Style Name..."
        value={item.styleName}
        onChange={(e) => {
          updateStyle(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        style={{ width: '100%', marginBottom: 0 }}
      />
      {isOpen && filteredStyles.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'var(--card-bg)', border: '1px solid var(--border-color)',
          borderRadius: '4px', maxHeight: '250px', overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)', marginTop: '4px'
        }}>
          {filteredStyles.map(s => (
            <div 
              key={s.id}
              onClick={() => { updateStyle(s.name); setIsOpen(false); }}
              style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-color)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SmartBatchDropdown = ({ item, updateBatch, onViewBatch }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input 
        className="input-field" 
        placeholder="Type or select batch..."
        value={item.batch_no}
        onChange={(e) => {
          updateBatch(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        style={{ width: '100%', marginBottom: 0 }}
      />
      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
          background: 'var(--card-bg)', border: '1px solid var(--border-color)',
          borderRadius: '4px', maxHeight: '250px', overflowY: 'auto',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)', marginTop: '4px'
        }}>
          {item.nextBatch && (
            <div
              onClick={() => { updateBatch(item.nextBatch); setIsOpen(false); }}
              style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', color: 'var(--primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-color)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Plus size={16} /> NEW ({item.nextBatch})
            </div>
          )}
          
          {item.suggestedBatches && item.suggestedBatches.length > 0 && (
            <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)' }}>
              Suggested Old Batches
            </div>
          )}

          {item.suggestedBatches?.map((b, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}
                 onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-color)'}
                 onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div 
                style={{ flex: 1, padding: '0.75rem', cursor: 'pointer' }}
                onClick={() => { updateBatch(b.batch_no); setIsOpen(false); }}
              >
                <div style={{ fontWeight: 'bold' }}>{b.batch_no}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                  <span>Style: {b.style_name}</span>
                  {b.balance !== undefined && (
                    <span style={{ color: b.balance > 0 ? 'var(--success)' : (b.balance < 0 ? 'var(--danger)' : 'inherit') }}>
                      Stock: {b.balance}
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onViewBatch(b.batch_no); setIsOpen(false); }}
                style={{ padding: '0.5rem', background: 'none', border: 'none', color: 'var(--accent-secondary)', cursor: 'pointer', marginRight: '0.5rem' }}
                title="View Batch Ledger"
              >
                <Info size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Transactions = () => {

  const [vendors, setVendors] = useState([]);
  const [styles, setStyles] = useState([]);
  const [recent, setRecent] = useState([]);
  
  const [vendorName, setVendorName] = useState('');
  const [challanNo, setChallanNo] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [firm, setFirm] = useState('MC');
  
  const [items, setItems] = useState([
    { id: 1, styleName: '', batch_no: '', inward_qty: '', outward_qty: '', suggestedBatches: [], nextBatch: '' }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewingBatch, setViewingBatch] = useState(null);
  const [success, setSuccess] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ date: '', challan_no: '', batch_no: '', inward_qty: '', outward_qty: '', firm: 'MC' });
  
  const [searchDate, setSearchDate] = useState('');
  const [searchChallan, setSearchChallan] = useState('');
  const [searchStyle, setSearchStyle] = useState('');

  const startEdit = (t) => {
    setEditingId(t.id);
    setEditForm({
      date: (t.date || t.created_at).split('T')[0],
      challan_no: t.challan_no || '',
      batch_no: t.batch_no || '',
      inward_qty: t.inward_qty || 0,
      outward_qty: t.outward_qty || 0,
      firm: t.firm || 'MC'
    });
  };

  const saveEdit = async (id) => {
    try {
      await updateTransaction(id, {
        date: editForm.date,
        challan_no: editForm.challan_no,
        batch_no: editForm.batch_no,
        inward_qty: Number(editForm.inward_qty) || 0,
        outward_qty: Number(editForm.outward_qty) || 0,
        firm: editForm.firm
      });
      setEditingId(null);
      loadInitialData();
    } catch (err) {
      console.error(err);
      alert('Failed to update transaction');
    }
  };

  const deleteTx = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await deleteTransaction(id);
        loadInitialData();
      } catch (err) {
        console.error(err);
        alert('Failed to delete transaction');
      }
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      const v = await getVendors();
      setVendors(v);
      const s = await getStyles();
      setStyles(s);
      const r = await getRecentTransactions(10000);
      setRecent(r);
    } catch (err) {
      console.error(err);
    }
  }

    const handleStyleChange = async (index, newStyleName) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index].styleName = newStyleName;
      return newItems;
    });

    if (newStyleName.length > 2) {
      const nextB = await getNextBatchNumber(newStyleName, transactionDate);
      const matchedBatches = await getBatchesByExactStyle(newStyleName);
      
      setItems(prevItems => {
        const updatedItems = [...prevItems];
        updatedItems[index].suggestedBatches = matchedBatches;
        updatedItems[index].nextBatch = nextB;
        if (!updatedItems[index].batch_no) {
          updatedItems[index].batch_no = nextB;
        }
        return updatedItems;
      });
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), styleName: '', batch_no: '', inward_qty: '', outward_qty: '', suggestedBatches: [], nextBatch: '' }]);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
      // Need a slight delay to focus the newly created input
      setTimeout(() => {
        const inputs = document.querySelectorAll('.style-input');
        if (inputs && inputs.length > index + 1) {
          inputs[index + 1].focus();
        }
      }, 50);
    }
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    if (newItems.length === 0) {
      setItems([{ id: Date.now(), styleName: '', batch_no: '', inward_qty: '', outward_qty: '', suggestedBatches: [], nextBatch: '' }]);
    } else {
      setItems(newItems);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      if (!vendorName) {
        throw new Error("Customer / Vendor is required");
      }
      
      const validItems = items.filter(i => i.styleName && (Number(i.inward_qty) > 0 || Number(i.outward_qty) > 0));
      if (validItems.length === 0) {
        throw new Error("Please add at least one valid item with quantity");
      }
      
      let vendor_id = await ensureVendor(vendorName);

      const transactionsToInsert = [];
      // Combine selected date with current time for timestamp if needed, or just send date
      const dateIso = new Date(transactionDate).toISOString();

      for (const item of validItems) {
        const styleId = await ensureStyle(item.styleName, vendor_id);
        transactionsToInsert.push({
          style_id: styleId,
          challan_no: challanNo,
          batch_no: item.batch_no || null,
          inward_qty: Number(item.inward_qty) || 0,
          outward_qty: Number(item.outward_qty) || 0,
          date: dateIso,
          firm: firm
        });
      }
      
      await addTransaction(transactionsToInsert);
      
      setSuccess(true);
      // Reset form
      setVendorName('');
      setChallanNo('');
      setItems([{ id: Date.now(), styleName: '', batch_no: '', inward_qty: '', outward_qty: '', suggestedBatches: [], nextBatch: '' }]);
      loadInitialData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Transaction Manager (Multi-Entry)</h1>
      </header>
      
      {viewingBatch && <BatchLedgerModal batchNo={viewingBatch} onClose={() => setViewingBatch(null)} />}
      
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--accent-primary)' }}>New Challan Entry</span>
        </h2>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem', padding: '0.5rem', background: 'rgba(248,81,73,0.1)', borderRadius: '4px' }}>{error}</div>}
        {success && <div style={{ color: 'var(--success)', marginBottom: '1rem', fontSize: '0.875rem', padding: '0.5rem', background: 'rgba(46,160,67,0.1)', borderRadius: '4px' }}>Transactions saved successfully!</div>}
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="input-group">
            <label className="input-label">Date *</label>
            <input 
              type="date"
              className="input-field" 
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Select Customer / Vendor *</label>
            <input 
              list="vendors-list"
              className="input-field" 
              placeholder="Type to search customer..."
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
            />
            <datalist id="vendors-list">
              {vendors.map(v => (
                <option key={v.id} value={v.name} />
              ))}
            </datalist>
          </div>
          <div className="input-group">
            <label className="input-label">Challan Number</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="CH-XXXX" 
              value={challanNo}
              onChange={(e) => setChallanNo(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Firm / Company</label>
            <select 
              className="input-field" 
              value={firm}
              onChange={(e) => setFirm(e.target.value)}
            >
              <option value="MC">MC</option>
              <option value="DKPT">DKPT</option>
              <option value="MC-TUFTING">MC-TUFTING</option>
              <option value="DKPT-TUFTING">DKPT-TUFTING</option>
            </select>
          </div>
        </div>

        <div className="items-list" style={{ border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 1.5fr 1.5fr 0.5fr', gap: '1rem', marginBottom: '0.5rem' }}>
            <label className="input-label">Style / Product *</label>
            <label className="input-label">Batch No / Lot No</label>
            <label className="input-label">IN (Qty)</label>
            <label className="input-label">OUT (Qty)</label>
            <label></label>
          </div>
          
          {items.map((item, index) => (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 1.5fr 1.5fr 0.5fr', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
              <SmartStyleDropdown 
                item={item} 
                styles={styles} 
                updateStyle={(val) => handleStyleChange(index, val)} 
              />
                            <SmartBatchDropdown 
                item={item} 
                updateBatch={(val) => updateItem(index, 'batch_no', val)} 
                onViewBatch={setViewingBatch}
              />
              <input 
                type="number" 
                className="input-field" 
                placeholder="0" 
                value={item.inward_qty}
                onChange={(e) => updateItem(index, 'inward_qty', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
              />
              <input 
                type="number" 
                className="input-field" 
                placeholder="0" 
                value={item.outward_qty}
                onChange={(e) => updateItem(index, 'outward_qty', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
              />
              <button className="btn btn-secondary" style={{ padding: '0.5rem', color: 'var(--danger)' }} onClick={() => removeItem(index)}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}


          <button className="btn btn-secondary" style={{ marginTop: '0.5rem', fontSize: '0.75rem', padding: '0.5rem 1rem' }} onClick={addItem}>
            <Plus size={14} /> Add Another Item
          </button>
        </div>
        
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={loading}
          >
            <Save size={18} /> {loading ? 'Saving...' : 'Save All Transactions'}
          </button>
        </div>
      </div>
      
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.125rem' }}>Recent Activity</h2>
          
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input 
              type="date" 
              className="input-field" 
              style={{ padding: '0.4rem', fontSize: '0.8rem' }}
              value={searchDate}
              onChange={e => setSearchDate(e.target.value)}
              title="Search by Date"
            />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search Challan..." 
              style={{ padding: '0.4rem', fontSize: '0.8rem', width: '130px' }}
              value={searchChallan}
              onChange={e => setSearchChallan(e.target.value)}
            />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search Style..." 
              style={{ padding: '0.4rem', fontSize: '0.8rem', width: '130px' }}
              value={searchStyle}
              onChange={e => setSearchStyle(e.target.value)}
            />
            {(searchDate || searchChallan || searchStyle) && (
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => { setSearchDate(''); setSearchChallan(''); setSearchStyle(''); }}>Clear</button>
            )}
          </div>
        </div>
        <div className="table-container" style={{ border: 'none', borderRadius: 0, maxHeight: '500px', overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Challan</th>
                <th>Firm</th>
                <th>Batch</th>
                <th>Style</th>
                <th>IN</th>
                <th>OUT</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recent
                .filter(t => {
                  if (searchDate && !(t.date || t.created_at).startsWith(searchDate)) return false;
                  if (searchChallan && !(t.challan_no || '').toLowerCase().includes(searchChallan.toLowerCase())) return false;
                  if (searchStyle && !(t.styles?.name || '').toLowerCase().includes(searchStyle.toLowerCase())) return false;
                  return true;
                })
                .length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center' }}>No recent activity found</td></tr>
              ) : (
                recent
                .filter(t => {
                  if (searchDate && !(t.date || t.created_at).startsWith(searchDate)) return false;
                  if (searchChallan && !(t.challan_no || '').toLowerCase().includes(searchChallan.toLowerCase())) return false;
                  if (searchStyle && !(t.styles?.name || '').toLowerCase().includes(searchStyle.toLowerCase())) return false;
                  return true;
                })
                .map(t => {
                  const d = new Date(t.date || t.created_at);
                  const formattedDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                  if (editingId === t.id) {
                    return (
                      <tr key={t.id}>
                        <td><input type="date" className="input-field" style={{ padding: '0.2rem', width: '110px' }} value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} /></td>
                        <td><input type="text" className="input-field" style={{ padding: '0.2rem', width: '80px' }} value={editForm.challan_no} onChange={e => setEditForm({...editForm, challan_no: e.target.value})} /></td>
                        <td>
                          <select className="input-field" style={{ padding: '0.2rem', width: '100px' }} value={editForm.firm} onChange={e => setEditForm({...editForm, firm: e.target.value})}>
                            <option value="MC">MC</option>
                            <option value="DKPT">DKPT</option>
                            <option value="MC-TUFTING">MC-TUFTING</option>
                            <option value="DKPT-TUFTING">DKPT-TUFTING</option>
                          </select>
                        </td>
                        <td><input type="text" className="input-field" style={{ padding: '0.2rem', width: '80px' }} value={editForm.batch_no} onChange={e => setEditForm({...editForm, batch_no: e.target.value})} /></td>
                        <td>{t.styles?.name}</td>
                        <td><input type="number" className="input-field" style={{ padding: '0.2rem', width: '60px' }} value={editForm.inward_qty} onChange={e => setEditForm({...editForm, inward_qty: e.target.value})} /></td>
                        <td><input type="number" className="input-field" style={{ padding: '0.2rem', width: '60px' }} value={editForm.outward_qty} onChange={e => setEditForm({...editForm, outward_qty: e.target.value})} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => saveEdit(t.id)}><Check size={14} /></button>
                            <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setEditingId(null)}><X size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={t.id}>
                      <td>{formattedDate}</td>
                      <td>{t.challan_no || '-'}</td>
                      <td>{t.firm || '-'}</td>
                    <td><span className="badge badge-neutral">{t.batch_no || '-'}</span></td>
                    <td>{t.styles?.name}</td>
                    <td>{t.inward_qty > 0 ? <span className="badge badge-success">{t.inward_qty}</span> : '-'}</td>
                    <td>{t.outward_qty > 0 ? <span className="badge badge-danger">{t.outward_qty}</span> : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => startEdit(t)} title="Edit"><Edit2 size={14} /></button>
                        <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', color: 'var(--danger)' }} onClick={() => deleteTx(t.id)} title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Transactions;
