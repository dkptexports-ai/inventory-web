import React, { useState, useEffect } from 'react';
import { getBatchesForBilling, markAsBilled } from '../lib/api';
import { Link } from 'react-router-dom';

const Billing = () => {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterFirm, setFilterFirm] = useState('');
  const [filterVendor, setFilterVendor] = useState('');
  const [filterStyle, setFilterStyle] = useState('');
  const [filterBalance, setFilterBalance] = useState('ZeroOrNegative'); // 'All', 'ZeroOrNegative', 'Zero', 'Negative'
  const [filterStatus, setFilterStatus] = useState('All'); // 'All', 'Pending', 'Billed'
  
  // A simple state for popup
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadChallans();
  }, []);

  async function loadChallans() {
    try {
      const data = await getBatchesForBilling();
      setChallans(data);
    } catch (err) {
      console.error(err);
    }
  }

  const handleMarkBilled = async () => {
    if (!activeInvoice || !invoiceNo) return;
    try {
      setLoading(true);
      await markAsBilled(activeInvoice.transaction_ids, invoiceNo, invoiceDate);
      setActiveInvoice(null);
      setInvoiceNo('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      loadChallans();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Generate unique lists for datalists
  const uniqueFirms = [...new Set(challans.map(c => c.firm).filter(Boolean))].sort();
  const uniqueVendors = [...new Set(challans.map(c => c.styles?.vendors?.name).filter(Boolean))].sort();
  const uniqueStyles = [...new Set(challans.map(c => c.styles?.name).filter(Boolean))].sort();

  const filteredChallans = challans
    .filter(c => {
      // General Search
      if (search) {
        const searchLower = search.toLowerCase();
        if (!c.batch_no?.toLowerCase().includes(searchLower) && !c.styles?.name?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      // Date Filter
      const cDate = (c.date || c.created_at).split('T')[0];
      if (dateFrom && !dateTo) {
        if (cDate !== dateFrom) return false;
      } else if (dateFrom && dateTo) {
        if (cDate < dateFrom || cDate > dateTo) return false;
      }
      
      // Firm Filter
      if (filterFirm && c.firm !== filterFirm) return false;
      
      // Vendor Filter
      if (filterVendor && c.styles?.vendors?.name !== filterVendor) return false;
      
      // Style Filter
      if (filterStyle && c.styles?.name !== filterStyle) return false;
      
      // Balance Filter
      if (filterBalance === 'Zero' && c.balance !== 0) return false;
      if (filterBalance === 'Negative' && c.balance >= 0) return false;
      if (filterBalance === 'ZeroOrNegative' && c.balance > 0) return false;
      
      // Status Filter
      if (filterStatus !== 'All' && c.bill_status !== filterStatus) return false;
      
      return true;
    })
    .sort((a, b) => {
      // Priority 1: Status (Pending first, Billed last)
      if (a.bill_status === 'Pending' && b.bill_status !== 'Pending') return -1;
      if (b.bill_status === 'Pending' && a.bill_status !== 'Pending') return 1;
      
      // Priority 2: Balance = 0 first
      const aIsZero = a.balance === 0;
      const bIsZero = b.balance === 0;
      if (aIsZero && !bIsZero) return -1;
      if (!aIsZero && bIsZero) return 1;
      
      // Priority 3: Firm alphabetically
      const firmA = (a.firm || '').toLowerCase();
      const firmB = (b.firm || '').toLowerCase();
      if (firmA < firmB) return -1;
      if (firmA > firmB) return 1;
      
      // Priority 4: Vendor alphabetically
      const vendorA = (a.styles?.vendors?.name || '').toLowerCase();
      const vendorB = (b.styles?.vendors?.name || '').toLowerCase();
      if (vendorA < vendorB) return -1;
      if (vendorA > vendorB) return 1;
      
      // Priority 5: Style alphabetically
      const styleA = (a.styles?.name || '').toLowerCase();
      const styleB = (b.styles?.name || '').toLowerCase();
      if (styleA < styleB) return -1;
      if (styleA > styleB) return 1;
      
      // Priority 6: Batch alphabetically
      const batchA = (a.batch_no || '').toLowerCase();
      const batchB = (b.batch_no || '').toLowerCase();
      if (batchA < batchB) return -1;
      if (batchA > batchB) return 1;
      
      return 0;
    });

  // Calculate stats for pending only
  const pendingOnly = challans.filter(c => c.bill_status === 'Pending' && c.balance <= 0);

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Billing & Invoices</h1>
      </header>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card stat-card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Pending Vendors</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: '0.5rem', color: 'var(--accent-primary)' }}>
            {new Set(pendingOnly.map(c => c.styles?.vendors?.name).filter(Boolean)).size}
          </p>
        </div>
        <div className="glass-card stat-card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Pending Firms</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: '0.5rem', color: 'var(--warning)' }}>
            {new Set(pendingOnly.map(c => c.firm).filter(Boolean)).size}
          </p>
        </div>
        <div className="glass-card stat-card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Pending Styles</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: '0.5rem', color: 'var(--success)' }}>
            {new Set(pendingOnly.map(c => c.styles?.name).filter(Boolean)).size}
          </p>
        </div>
      </div>
      
      {activeInvoice && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="glass-card" style={{ width: '400px' }}>
            <h2>Generate Bill</h2>
            <p style={{ margin: '1rem 0', color: 'var(--text-muted)' }}>
              Mark Challan <b>{activeInvoice.challan_no}</b> as Billed.
            </p>
            <div className="input-group">
              <label className="input-label">Invoice Number</label>
              <input 
                type="text" 
                className="input-field" 
                value={invoiceNo}
                onChange={e => setInvoiceNo(e.target.value)}
                placeholder="INV-XXXX"
              />
            </div>
            <div className="input-group" style={{ marginTop: '1rem' }}>
              <label className="input-label">Invoice Date</label>
              <input 
                type="date" 
                className="input-field" 
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={handleMarkBilled} disabled={loading || !invoiceNo}>
                {loading ? 'Saving...' : 'Confirm'}
              </button>
              <button className="btn btn-secondary" onClick={() => setActiveInvoice(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={{ fontSize: '0.75rem' }}>Search</label>
              <input type="text" className="input-field" placeholder="Search..." style={{ padding: '0.4rem', width: '150px' }} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={{ fontSize: '0.75rem' }}>From Date (or Single)</label>
              <input type="date" className="input-field" style={{ padding: '0.4rem' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={{ fontSize: '0.75rem' }}>To Date (Optional)</label>
              <input type="date" className="input-field" style={{ padding: '0.4rem' }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={{ fontSize: '0.75rem' }}>Firm</label>
              <input list="firm-list" className="input-field" placeholder="All Firms..." style={{ padding: '0.4rem', width: '130px' }} value={filterFirm} onChange={e => setFilterFirm(e.target.value)} />
              <datalist id="firm-list">{uniqueFirms.map(f => <option key={f} value={f} />)}</datalist>
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={{ fontSize: '0.75rem' }}>Vendor</label>
              <input list="vendor-list" className="input-field" placeholder="All Vendors..." style={{ padding: '0.4rem', width: '140px' }} value={filterVendor} onChange={e => setFilterVendor(e.target.value)} />
              <datalist id="vendor-list">{uniqueVendors.map(v => <option key={v} value={v} />)}</datalist>
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={{ fontSize: '0.75rem' }}>Style</label>
              <input list="style-list" className="input-field" placeholder="All Styles..." style={{ padding: '0.4rem', width: '140px' }} value={filterStyle} onChange={e => setFilterStyle(e.target.value)} />
              <datalist id="style-list">{uniqueStyles.map(s => <option key={s} value={s} />)}</datalist>
            </div>
            
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={{ fontSize: '0.75rem' }}>Balance</label>
              <select className="input-field" style={{ padding: '0.4rem', width: '130px' }} value={filterBalance} onChange={e => setFilterBalance(e.target.value)}>
                <option value="All">All Balances</option>
                <option value="ZeroOrNegative">Zero & Negative</option>
                <option value="Zero">Zero Only</option>
                <option value="Negative">Negative Only</option>
              </select>
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={{ fontSize: '0.75rem' }}>Action / Status</label>
              <select className="input-field" style={{ padding: '0.4rem', width: '160px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="All">All Statuses</option>
                <option value="Pending">Pending (Generate Bill)</option>
                <option value="Billed">Billed (Generated Bill)</option>
              </select>
            </div>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 1rem' }} onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setFilterFirm(''); setFilterVendor(''); setFilterStyle(''); setFilterBalance('ZeroOrNegative'); setFilterStatus('All'); }}>Clear</button>
          </div>
        </div>
        
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Batch / Lot No.</th>
                <th>Firm</th>
                <th>Vendor</th>
                <th>Style</th>
                <th>Closing Balance</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredChallans.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>No bills found matching criteria.</td></tr>
              ) : (
                filteredChallans.map(c => {
                  const d = new Date(c.date || c.created_at);
                  const formattedDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                  
                  const isPending = c.bill_status === 'Pending';
                  // Adding subtle row highlights based on status
                  const rowStyle = isPending 
                    ? { backgroundColor: 'rgba(255, 171, 0, 0.05)' } // Very subtle warning/orange for pending
                    : { backgroundColor: 'rgba(46, 160, 67, 0.05)' }; // Very subtle green for billed

                  return (
                  <tr key={c.id} style={rowStyle}>
                    <td>{formattedDate}</td>
                    <td>
                      <Link to={`/batch/${c.batch_no}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
                        {c.batch_no || '-'}
                      </Link>
                    </td>
                    <td>{c.firm || '-'}</td>
                    <td>{c.styles?.vendors?.name}</td>
                    <td>{c.styles?.name}</td>
                    <td>
                      <span className={`badge ${c.balance === 0 ? 'badge-primary' : 'badge-danger'}`}>
                        {c.balance}
                      </span>
                    </td>
                    <td>
                      {isPending ? (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', borderColor: 'var(--warning)', color: 'var(--warning)' }}
                          onClick={() => setActiveInvoice(c)}
                        >
                          Generate Bill
                        </button>
                      ) : (
                        <span className="badge badge-success" style={{ padding: '0.35rem 0.75rem' }}>Generated</span>
                      )}
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

export default Billing;
