import React, { useState, useEffect } from 'react';
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
          </div>
        </div>
      </div>

      {viewMode === 'master' ? (
        <div className="glass-card" style={{ padding: '1rem', overflowX: 'auto' }}>
          <h3 style={{ marginBottom: '1rem' }}>Consolidated Salary Sheet - {month}/{year}</h3>
          <table className="table-container" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Working Days</th>
                <th>Holidays/Offs</th>
                <th>Fines</th>
                <th>OT Hrs</th>
                <th>OT (₹)</th>
                <th>Incentive (₹)</th>
                <th>Full Duty (₹)</th>
                <th>Prev Bal (₹)</th>
                <th>Advance (₹)</th>
                <th>Net Payable (₹)</th>
              </tr>
            </thead>
            <tbody>
              {allSalaries.map(sal => (
                <tr key={sal.employeeId}>
                  <td style={{ fontWeight: 600 }}>{sal.name}</td>
                  <td>{sal.calculatedDays}</td>
                  <td>{sal.weeklyOffs}</td>
                  <td>{sal.fineCount}</td>
                  <td>{sal.totalOT}</td>
                  <td>{sal.totalOTEarned.toFixed(0)}</td>
                  <td>{sal.totalIncentive.toFixed(0)}</td>
                  <td>{sal.fullDutyAmount.toFixed(0)}</td>
                  <td>{sal.previousBalance.toFixed(0)}</td>
                  <td>{sal.advance.toFixed(0)}</td>
                  <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>{sal.netSalary.toFixed(0)}</td>
                </tr>
              ))}
              {allSalaries.length === 0 && (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center' }}>No records found.</td>
                </tr>
              )}
            </tbody>
            {allSalaries.length > 0 && (
              <tfoot style={{ background: 'var(--bg-main)', fontWeight: 'bold' }}>
                <tr>
                  <td>Total</td>
                  <td>{allSalaries.reduce((sum, s) => sum + s.calculatedDays, 0)}</td>
                  <td>{allSalaries.reduce((sum, s) => sum + s.weeklyOffs, 0)}</td>
                  <td>{allSalaries.reduce((sum, s) => sum + s.fineCount, 0)}</td>
                  <td>{allSalaries.reduce((sum, s) => sum + s.totalOT, 0)}</td>
                  <td>{allSalaries.reduce((sum, s) => sum + s.totalOTEarned, 0).toFixed(0)}</td>
                  <td>{allSalaries.reduce((sum, s) => sum + s.totalIncentive, 0).toFixed(0)}</td>
                  <td>{allSalaries.reduce((sum, s) => sum + s.fullDutyAmount, 0).toFixed(0)}</td>
                  <td>{allSalaries.reduce((sum, s) => sum + s.previousBalance, 0).toFixed(0)}</td>
                  <td>{allSalaries.reduce((sum, s) => sum + s.advance, 0).toFixed(0)}</td>
                  <td style={{ color: 'var(--success)' }}>{allSalaries.reduce((sum, s) => sum + s.netSalary, 0).toFixed(0)}</td>
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
    </div>
  );
};

export default Salary;
