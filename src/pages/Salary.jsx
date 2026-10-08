import React, { useState, useEffect, useRef } from 'react';
import { getEmployees, getAttendance, getAttendanceByDate, getCompanies, saveSalaryPayment } from '../lib/api';

const Salary = () => {
  const [employees, setEmployees] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [companies, setCompanies] = useState([]);
  
  const [attendanceData, setAttendanceData] = useState([]);
  const [salaryDetails, setSalaryDetails] = useState(null);
  const [allSalaries, setAllSalaries] = useState([]);
  const [viewMode, setViewMode] = useState('master');
  const [filterCompanyId, setFilterCompanyId] = useState('');
  
  const [useDateRange, setUseDateRange] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState({
    date: new Date().toISOString().split('T')[0],
    cash: '',
    bank: '',
    companyId: ''
  });

  const [isManualMode, setIsManualMode] = useState(false);
  const [manualSalaries, setManualSalaries] = useState([]);
  const [showManualPopup, setShowManualPopup] = useState(false);
  const [manualForm, setManualForm] = useState({
    employee: null,
    search: '',
    isOpen: false,
    workingDays: '',
    holidays: '',
    fine: '',
    incentive: '',
    previousBalance: '',
    advance: ''
  });
  const searchInputRef = useRef(null);

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      calculateAllSalaries();
    }
  }, [employees, month, year, filterCompanyId, useDateRange, fromDate, toDate]);

  useEffect(() => {
    if (selectedEmployeeId && allSalaries.length > 0) {
      const details = allSalaries.find(s => s.employeeId === selectedEmployeeId);
      setSalaryDetails(details || null);
    } else {
      setSalaryDetails(null);
    }
  }, [selectedEmployeeId, allSalaries]);

  const loadBaseData = async () => {
    try {
      const [empData, compData] = await Promise.all([getEmployees(), getCompanies()]);
      setEmployees(empData || []);
      setCompanies(compData || []);
    } catch (err) {
      console.error(err);
    }
  };

  const calculateForEmployee = (emp, empAtt) => {
    let presentCount = 0;
    let absentCount = 0;
    let halfCount = 0;
    let doubleCount = 0;
    let fineCount = 0;
    let totalProduction = 0;
    let totalOT = 0;

    empAtt.forEach(record => {
      if (record.status === 'present') presentCount += 1;
      if (record.status === 'absent') absentCount += 1;
      if (record.status === 'half') halfCount += 1;
      if (record.status === 'double') doubleCount += 1;
      if (record.status === 'fine') fineCount += 1;
      
      totalProduction += (Number(record.production_qty) || 0);
      totalOT += (Number(record.overtime_hours) || 0);
    });

    // Auto-OT Logic
    if (emp.ot_enabled) {
      // User clarification: 1 Day (Present) = 0.5 HOUR OT. Double (D) = 1 HOUR OT.
      totalOT += (presentCount * 0.5) + (doubleCount * 1.0);
    }

    let calculatedDays = presentCount + (doubleCount * 2) + (halfCount * 0.5) - (fineCount * 0.5);

    let weeklyOffs = 0;
    if (emp.salary_type === 'plus') {
       weeklyOffs = Math.floor(presentCount / 4);
       calculatedDays += weeklyOffs;
    }

    let fullDutyAmount = 0;
    if (emp.has_full_duty_allowance) {
       const fullDays = presentCount + doubleCount;
       fullDutyAmount = fullDays * 100;
    }

    let totalIncentive = 0;
    empAtt.forEach(record => {
      const qty = Number(record.production_qty) || 0;
      const target = Number(record.production_target) || 300000;
      const threshold = target - 5000;

      if (qty > threshold) {
         const steps = Math.floor((qty - threshold - 1) / 10000);
         const dailyIncentive = 50 + (steps * 10);
         totalIncentive += dailyIncentive;
      }
    });

    const perDaySalary = (emp.basic_salary || 0) / 30;
    const totalBasicEarned = perDaySalary * calculatedDays;

    const otRate = perDaySalary / 8;
    const totalOTEarned = otRate * totalOT;

    const previousBalance = emp.opening_balance || 0;
    // Assume advance is 0 for now unless fetched from ledger
    const advance = 0; 
    
    const totalEarnings = totalBasicEarned + fullDutyAmount + totalIncentive + totalOTEarned;
    const netSalary = totalEarnings + previousBalance - advance;

    return {
      employeeId: emp.id,
      name: emp.name,
      presentCount, absentCount, halfCount, doubleCount, fineCount,
      calculatedDays, weeklyOffs, fullDutyAmount, totalIncentive,
      totalBasicEarned, totalOTEarned, totalOT,
      previousBalance, advance,
      netSalary
    };
  };

  const calculateAllSalaries = async () => {
    try {
      let allAttRaw = [];
      if (useDateRange && fromDate && toDate) {
        allAttRaw = await getAttendanceByDate(fromDate, toDate);
      } else {
        allAttRaw = await getAttendance(month, year);
      }
      
      const allAtt = filterCompanyId ? allAttRaw.filter(a => a.company_id === filterCompanyId) : allAttRaw;
      
      const computed = employees.map(emp => {
        const empAtt = (allAtt || []).filter(a => a.employee_id === emp.id);
        if (filterCompanyId && empAtt.length === 0) return null; // Hide if they didn't work here
        
        const hasData = empAtt.length > 0;
        const hasBalance = (emp.opening_balance || 0) !== 0;
        
        // Hide employee if they have no attendance data this month AND no opening balance
        if (!hasData && !hasBalance) return null;

        return calculateForEmployee(emp, empAtt);
      }).filter(Boolean);
      
      setAllSalaries(computed);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMakePayment = async () => {
    try {
      await saveSalaryPayment({
        employee_id: salaryDetails.employeeId,
        company_id: paymentData.companyId || null,
        payment_date: paymentData.date,
        amount_cash: Number(paymentData.cash) || 0,
        amount_bank: Number(paymentData.bank) || 0,
        is_advance: false,
        month_year: `${year}-${String(month).padStart(2, '0')}`
      });
      alert('Payment saved successfully!');
      setShowPayment(false);
      // Ideally refresh ledger here
    } catch (err) {
      console.error(err);
      alert('Failed to save payment');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Salary Processing & Ledger</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          
          <div>
            <label style={{ fontSize: '0.8rem', display: 'block', color: 'var(--text-light)' }}>
              <input type="checkbox" checked={useDateRange} onChange={e => setUseDateRange(e.target.checked)} style={{ marginRight: '0.3rem' }} />
              Use Custom Period (Date Range)
            </label>
            {useDateRange ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input-field" style={{ padding: '0.4rem' }} />
                <span style={{ alignSelf: 'center' }}>to</span>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input-field" style={{ padding: '0.4rem' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="input-field" style={{ padding: '0.4rem' }}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>
                  ))}
                </select>
                <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="input-field" style={{ padding: '0.4rem', width: '80px' }} />
              </div>
            )}
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', display: 'block', color: 'var(--text-light)' }}>Company Filter</label>
            <select className="input-field" style={{ padding: '0.4rem', minWidth: '150px' }} value={filterCompanyId} onChange={e => setFilterCompanyId(e.target.value)}>
              <option value="">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
            <button className={`btn ${viewMode === 'master' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('master')}>Master Sheet</button>
            <button className={`btn ${viewMode === 'single' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('single')}>Single View</button>
            <button className="btn btn-secondary" onClick={() => window.print()}>Print / Save PDF</button>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', marginLeft: '1rem', color: 'var(--accent-primary)' }}>
              <input type="checkbox" checked={isManualMode} onChange={e => setIsManualMode(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
              Manual Mode
            </label>
            {isManualMode && (
              <button className="btn btn-primary" onClick={() => {
                setManualSalaries([]); // Clear previous entries when starting fresh bulk? Or let them append. Let's let them append, or they can clear it. Actually, I won't clear it.
                setShowManualPopup(true);
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }}>+ Bulk Manual Entry</button>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'master' ? (
        <div className="glass-card" style={{ padding: '1rem', overflowX: 'auto' }}>
          <h3 style={{ marginBottom: '1rem' }}>
            {isManualMode ? 'Manual Salary Sheet' : `Consolidated Salary Sheet - ${month}/${year}`}
          </h3>
          <table className="table-container" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Working Days</th>
                <th>Holidays/Offs</th>
                <th>Fines (₹)</th>
                {!isManualMode && <th>OT Hrs</th>}
                {!isManualMode && <th>OT (₹)</th>}
                <th>Incentive (₹)</th>
                {!isManualMode && <th>Full Duty (₹)</th>}
                <th>Prev Bal (₹)</th>
                <th>Advance (₹)</th>
                <th>Net Payable (₹)</th>
              </tr>
            </thead>
            <tbody>
              {(isManualMode ? manualSalaries : allSalaries).map(sal => (
                <tr key={sal.employeeId}>
                  <td style={{ fontWeight: 600 }}>{sal.name}</td>
                  <td>{sal.calculatedDays}</td>
                  <td>{sal.weeklyOffs}</td>
                  <td>{isManualMode ? sal.fineAmount : sal.fineCount}</td>
                  {!isManualMode && <td>{sal.totalOT}</td>}
                  {!isManualMode && <td>{sal.totalOTEarned.toFixed(0)}</td>}
                  <td>{sal.totalIncentive.toFixed(0)}</td>
                  {!isManualMode && <td>{sal.fullDutyAmount.toFixed(0)}</td>}
                  <td>{sal.previousBalance.toFixed(0)}</td>
                  <td>{sal.advance.toFixed(0)}</td>
                  <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>{sal.netSalary.toFixed(0)}</td>
                </tr>
              ))}
              {(isManualMode ? manualSalaries : allSalaries).length === 0 && (
                <tr>
                  <td colSpan={isManualMode ? "8" : "11"} style={{ textAlign: 'center' }}>No records found.</td>
                </tr>
              )}
            </tbody>
            {(isManualMode ? manualSalaries : allSalaries).length > 0 && (
              <tfoot style={{ background: 'var(--bg-main)', fontWeight: 'bold' }}>
                <tr>
                  <td>Total</td>
                  <td>{(isManualMode ? manualSalaries : allSalaries).reduce((sum, s) => sum + s.calculatedDays, 0)}</td>
                  <td>{(isManualMode ? manualSalaries : allSalaries).reduce((sum, s) => sum + s.weeklyOffs, 0)}</td>
                  <td>{(isManualMode ? manualSalaries : allSalaries).reduce((sum, s) => sum + (isManualMode ? s.fineAmount : s.fineCount), 0)}</td>
                  {!isManualMode && <td>{allSalaries.reduce((sum, s) => sum + s.totalOT, 0)}</td>}
                  {!isManualMode && <td>{allSalaries.reduce((sum, s) => sum + s.totalOTEarned, 0).toFixed(0)}</td>}
                  <td>{(isManualMode ? manualSalaries : allSalaries).reduce((sum, s) => sum + s.totalIncentive, 0).toFixed(0)}</td>
                  {!isManualMode && <td>{allSalaries.reduce((sum, s) => sum + s.fullDutyAmount, 0).toFixed(0)}</td>}
                  <td>{(isManualMode ? manualSalaries : allSalaries).reduce((sum, s) => sum + s.previousBalance, 0).toFixed(0)}</td>
                  <td>{(isManualMode ? manualSalaries : allSalaries).reduce((sum, s) => sum + s.advance, 0).toFixed(0)}</td>
                  <td style={{ color: 'var(--success)' }}>{(isManualMode ? manualSalaries : allSalaries).reduce((sum, s) => sum + s.netSalary, 0).toFixed(0)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : (
        <>
          <div className="glass-card" style={{ marginBottom: '2rem' }}>
            <div className="input-group" style={{ maxWidth: '400px' }}>
              <label className="input-label">Select Employee to Generate Salary</label>
              <select className="input-field" value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}>
                <option value="">-- Choose Employee --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.salary_type})</option>
                ))}
              </select>
            </div>
          </div>

      {salaryDetails && (
        <div className="dashboard-grid">
          <div className="glass-card">
            <h3>Attendance Summary</h3>
            <ul style={{ listStyle: 'none', marginTop: '1rem', lineHeight: '2' }}>
              <li><strong>Present:</strong> {salaryDetails.presentCount} days</li>
              <li><strong>Absent:</strong> {salaryDetails.absentCount} days</li>
              <li><strong>Half Days:</strong> {salaryDetails.halfCount}</li>
              <li><strong>Double Days:</strong> {salaryDetails.doubleCount}</li>
              <li><strong>Fines:</strong> {salaryDetails.fineCount}</li>
              <li style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}><strong>Calculated Paid Days:</strong> {salaryDetails.calculatedDays}</li>
            </ul>
          </div>

          <div className="glass-card">
            <h3>Earnings & Incentives</h3>
            <ul style={{ listStyle: 'none', marginTop: '1rem', lineHeight: '2' }}>
              <li><strong>Basic Salary Earned:</strong> ₹{salaryDetails.totalBasicEarned.toFixed(2)}</li>
              <li><strong>Overtime Earned:</strong> ₹{salaryDetails.totalOTEarned.toFixed(2)} ({salaryDetails.totalOT} hrs)</li>
              <li><strong>Production Incentive:</strong> ₹{salaryDetails.totalIncentive.toFixed(2)}</li>
              <li><strong>Full Duty Allowance:</strong> ₹{salaryDetails.fullDutyAmount.toFixed(2)}</li>
              <li style={{ color: 'var(--success)', fontWeight: 'bold' }}><strong>Total Earnings:</strong> ₹{(salaryDetails.totalBasicEarned + salaryDetails.totalOTEarned + salaryDetails.totalIncentive + salaryDetails.fullDutyAmount).toFixed(2)}</li>
            </ul>
          </div>

          <div className="glass-card" style={{ border: '2px solid var(--accent-primary)' }}>
            <h3>Final Ledger</h3>
            <ul style={{ listStyle: 'none', marginTop: '1rem', lineHeight: '2' }}>
              <li><strong>Total Current Earnings:</strong> ₹{(salaryDetails.totalBasicEarned + salaryDetails.totalOTEarned + salaryDetails.totalIncentive + salaryDetails.fullDutyAmount).toFixed(2)}</li>
              <li><strong>Previous Balance:</strong> ₹{salaryDetails.previousBalance.toFixed(2)}</li>
              <hr style={{ margin: '1rem 0', borderColor: 'var(--border-color)' }} />
              <li style={{ fontSize: '1.25rem', color: 'var(--text-main)', fontWeight: 'bold' }}><strong>Net Payable:</strong> ₹{salaryDetails.netSalary.toFixed(2)}</li>
            </ul>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowPayment(true)}>Make Payment</button>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => window.print()}>Print Slip</button>
            </div>
          </div>
        </div>
      )}

      {showPayment && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ width: '400px', background: '#fff' }}>
            <h3 style={{ marginBottom: '1rem' }}>Payment Entry</h3>
            
            <div className="input-group">
              <label className="input-label">Payment Date</label>
              <input type="date" className="input-field" value={paymentData.date} onChange={e => setPaymentData({...paymentData, date: e.target.value})} />
            </div>

            <div className="input-group">
              <label className="input-label">Company Account</label>
              <select className="input-field" value={paymentData.companyId} onChange={e => setPaymentData({...paymentData, companyId: e.target.value})}>
                <option value="">-- Select --</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Cash Amount (₹)</label>
              <input type="number" className="input-field" value={paymentData.cash} onChange={e => setPaymentData({...paymentData, cash: e.target.value})} />
            </div>

            <div className="input-group">
              <label className="input-label">Bank Transfer Amount (₹)</label>
              <input type="number" className="input-field" value={paymentData.bank} onChange={e => setPaymentData({...paymentData, bank: e.target.value})} />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowPayment(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleMakePayment}>Save</button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {showManualPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div className="glass-card" style={{ width: '600px', background: 'var(--bg-main)', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent-primary)' }}>Bulk Manual Salary Entry</h3>
            
            <div style={{ marginBottom: '1rem', color: 'var(--text-light)', fontSize: '0.9rem' }}>
              Added in this session: <strong style={{ color: 'var(--success)' }}>{manualSalaries.length} employees</strong>
            </div>

            <div className="input-group" style={{ position: 'relative' }}>
              <label className="input-label">Employee Name</label>
              <input 
                type="text" 
                ref={searchInputRef}
                className="input-field" 
                placeholder="Type to search..." 
                value={manualForm.search}
                onChange={e => setManualForm({ ...manualForm, search: e.target.value, isOpen: true })}
                onFocus={() => setManualForm({ ...manualForm, isOpen: true })}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    // Auto-select first if open
                    const filtered = employees.filter(emp => emp.name.toLowerCase().includes(manualForm.search.toLowerCase()));
                    if (manualForm.isOpen && filtered.length > 0) {
                      setManualForm({ 
                        ...manualForm, 
                        employee: filtered[0], 
                        search: filtered[0].name, 
                        isOpen: false,
                        previousBalance: filtered[0].opening_balance || ''
                      });
                    }
                  }
                }}
              />
              {manualForm.isOpen && (
                <ul style={{ 
                  position: 'absolute', top: '100%', left: 0, right: 0, 
                  background: '#1a1a1a', color: '#fff', 
                  maxHeight: '150px', overflowY: 'auto', zIndex: 10,
                  listStyle: 'none', padding: 0, margin: 0, borderRadius: '4px', border: '1px solid #333'
                }}>
                  {employees.filter(e => e.name.toLowerCase().includes(manualForm.search.toLowerCase())).map(emp => (
                    <li 
                      key={emp.id} 
                      style={{ padding: '0.8rem', cursor: 'pointer', borderBottom: '1px solid #333' }}
                      onClick={() => {
                        setManualForm({ 
                          ...manualForm, 
                          employee: emp, 
                          search: emp.name, 
                          isOpen: false,
                          previousBalance: emp.opening_balance || ''
                        });
                      }}
                    >
                      {emp.name} ({emp.salary_type})
                    </li>
                  ))}
                  {employees.filter(e => e.name.toLowerCase().includes(manualForm.search.toLowerCase())).length === 0 && (
                    <li style={{ padding: '0.8rem', color: '#888' }}>No employees found</li>
                  )}
                </ul>
              )}
            </div>

            {(() => {
              const handleInputEnter = (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!manualForm.employee) return;
                  
                  const emp = manualForm.employee;
                  const perDay = (emp.basic_salary || 0) / 30;
                  const days = Number(manualForm.workingDays) || 0;
                  const hols = Number(manualForm.holidays) || 0;
                  const f = Number(manualForm.fine) || 0;
                  const inc = Number(manualForm.incentive) || 0;
                  const prev = Number(manualForm.previousBalance) || 0;
                  const adv = Number(manualForm.advance) || 0;

                  const basicEarned = perDay * days;
                  const net = basicEarned + inc - f + prev - adv;

                  setManualSalaries(prevSal => [...prevSal, {
                    employeeId: emp.id,
                    name: emp.name,
                    calculatedDays: days,
                    weeklyOffs: hols,
                    fineAmount: f,
                    totalIncentive: inc,
                    previousBalance: prev,
                    advance: adv,
                    totalBasicEarned: basicEarned,
                    netSalary: net,
                    fineCount: 0, totalOT: 0, totalOTEarned: 0, fullDutyAmount: 0
                  }]);
                  
                  setManualForm({
                    employee: null, search: '', isOpen: false, workingDays: '', holidays: '', fine: '', incentive: '', previousBalance: '', advance: ''
                  });
                  
                  setTimeout(() => {
                    searchInputRef.current?.focus();
                  }, 100);
                }
              };

              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label className="input-label">Working Days</label>
                    <input type="number" className="input-field" value={manualForm.workingDays} onChange={e => setManualForm({...manualForm, workingDays: e.target.value})} onKeyDown={handleInputEnter} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Holidays</label>
                    <input type="number" className="input-field" value={manualForm.holidays} onChange={e => setManualForm({...manualForm, holidays: e.target.value})} onKeyDown={handleInputEnter} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Fine (₹)</label>
                    <input type="number" className="input-field" value={manualForm.fine} onChange={e => setManualForm({...manualForm, fine: e.target.value})} onKeyDown={handleInputEnter} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Incentive (₹)</label>
                    <input type="number" className="input-field" value={manualForm.incentive} onChange={e => setManualForm({...manualForm, incentive: e.target.value})} onKeyDown={handleInputEnter} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Previous Balance (₹)</label>
                    <input type="number" className="input-field" value={manualForm.previousBalance} onChange={e => setManualForm({...manualForm, previousBalance: e.target.value})} onKeyDown={handleInputEnter} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Advance (₹)</label>
                    <input type="number" className="input-field" value={manualForm.advance} onChange={e => setManualForm({...manualForm, advance: e.target.value})} onKeyDown={handleInputEnter} />
                  </div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => {
                setManualForm({
                  employee: null, search: '', isOpen: false, workingDays: '', holidays: '', fine: '', incentive: '', previousBalance: '', advance: ''
                });
                setManualSalaries([]);
                setShowManualPopup(false);
              }}>Cancel (Clear All)</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowManualPopup(false)}>Save & Finish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Salary;
