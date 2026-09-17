const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching all transactions with a batch_no...");
  // We need style names too to generate the prefix
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id, batch_no, date, created_at, styles(name)')
    .not('batch_no', 'is', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Error fetching transactions:", error);
    return;
  }

  console.log(`Found ${transactions.length} transactions to update.`);

  const prefixCounters = {}; // prefix -> current max seq
  const updates = [];

  for (const t of transactions) {
    if (!t.styles || !t.styles.name) continue;

    const d = t.date ? new Date(t.date) : new Date(t.created_at);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const mmyy = `${mm}${yy}`;
    
    const cleanStyle = t.styles.name.replace(/\s+/g, '').toUpperCase();
    const first4 = cleanStyle.substring(0, 4);
    const last4 = cleanStyle.length > 4 ? cleanStyle.substring(cleanStyle.length - 4) : '';
    const styleCode = `${first4}${last4}`;
    
    const prefix = `${mmyy}-${styleCode}-`;
    
    // Assign sequence
    if (!prefixCounters[prefix]) {
      prefixCounters[prefix] = 1;
    } else {
      prefixCounters[prefix] += 1;
    }
    
    const seq = prefixCounters[prefix];
    const newBatchNo = `${prefix}${seq}`;
    
    if (t.batch_no !== newBatchNo) {
      updates.push({
        id: t.id,
        old: t.batch_no,
        new: newBatchNo
      });
    }
  }

  console.log(`Need to update ${updates.length} batch numbers...`);
  
  for (let i = 0; i < updates.length; i++) {
    const u = updates[i];
    console.log(`Updating ${u.old} -> ${u.new}`);
    const { error: updErr } = await supabase
      .from('transactions')
      .update({ batch_no: u.new })
      .eq('id', u.id);
      
    if (updErr) {
      console.error(`Failed to update ${u.id}:`, updErr);
    }
  }

  console.log("Migration complete!");
}

run().catch(console.error);
