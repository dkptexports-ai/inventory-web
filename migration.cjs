const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/sample_git/inventory-web/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log("Reading Excel file...");
  const filePath = 'd:/sample_git/Inventory 2026.xlsx';
  const workbook = xlsx.readFile(filePath);
  
  // 1. Process "Summary" sheet to get Vendors and Styles
  const summarySheet = workbook.Sheets['Summary'];
  const summaryData = xlsx.utils.sheet_to_json(summarySheet, { range: 1, defval: "" }); // Range 1 to skip the "SUMMARY" title row, assuming headers are on row 2
  
  const vendorsMap = {}; // name -> id
  const stylesMap = {}; // name -> { vendor_name, unit, id }
  
  for (const row of summaryData) {
    const vendorName = row['Vendor'] || row['__EMPTY'];
    const styleName = row['Style'] || row['__EMPTY_1'];
    const unit = row['Unit'] || row['__EMPTY_3'];
    
    if (vendorName && vendorName !== 'Vendor') {
      vendorsMap[vendorName] = null;
    }
    if (styleName && styleName !== 'Style') {
      stylesMap[styleName] = { vendorName, unit, id: null };
    }
  }

  // Insert Vendors
  console.log(`Found ${Object.keys(vendorsMap).length} unique vendors.`);
  for (const vendorName of Object.keys(vendorsMap)) {
    const { data, error } = await supabase.from('vendors').upsert({ name: vendorName, place: 'Unknown' }, { onConflict: 'name' }).select();
    if (error) console.error("Error inserting vendor", vendorName, error);
    else if (data && data.length > 0) vendorsMap[vendorName] = data[0].id;
  }
  
  // Insert Styles
  console.log(`Found ${Object.keys(stylesMap).length} unique styles.`);
  for (const [styleName, info] of Object.entries(stylesMap)) {
    const vendorId = vendorsMap[info.vendorName];
    if (!vendorId) continue;
    
    const { data, error } = await supabase.from('styles').upsert({ name: styleName, vendor_id: vendorId, unit: info.unit }, { onConflict: 'name' }).select();
    if (error) console.error("Error inserting style", styleName, error);
    else if (data && data.length > 0) stylesMap[styleName].id = data[0].id;
  }

  // 2. Process Individual Sheets for Transactions
  console.log("Processing individual style sheets for transactions...");
  for (const sheetName of workbook.SheetNames) {
    if (sheetName === 'Summary' || sheetName === 'Report') continue;
    
    const styleInfo = stylesMap[sheetName];
    if (!styleInfo || !styleInfo.id) {
      console.log(`Style ${sheetName} not found in Summary, skipping.`);
      continue;
    }
    
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    
    // Transactions typically start around row 9 (index 8)
    for (let i = 8; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 5) continue;
      
      const dateVal = row[0];
      const challanNo = row[1];
      const size = row[2];
      const inwardQty = parseFloat(row[3]) || 0;
      const outwardQty = parseFloat(row[4]) || 0;
      
      if (!dateVal && !challanNo && inwardQty === 0 && outwardQty === 0) continue;
      
      const transaction = {
        style_id: styleInfo.id,
        date: dateVal ? new Date((dateVal - (25567 + 2)) * 86400 * 1000).toISOString() : null, // Excel date conversion roughly
        challan_no: challanNo ? String(challanNo) : null,
        size: size ? String(size) : null,
        inward_qty: inwardQty,
        outward_qty: outwardQty,
      };
      
      // We are just inserting, if they run this multiple times they should wipe the DB first.
      const { error } = await supabase.from('transactions').insert([transaction]);
      if (error) {
        console.error(`Error inserting transaction for ${sheetName}:`, error);
      }
    }
  }
  
  console.log("Migration completed!");
}

runMigration().catch(console.error);
