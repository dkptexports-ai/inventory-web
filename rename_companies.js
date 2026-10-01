import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function renameCompanies() {
  const { data: companies, error } = await supabase.from('companies').select('*');
  if (error) {
    console.error("Error fetching", error);
    return;
  }
  
  for (const c of companies) {
    let newName = c.name;
    if (c.name.toLowerCase().includes('dkpt')) newName = 'Ganaur';
    else if (c.name.toLowerCase().includes('malik')) newName = 'Panipat';
    
    if (newName !== c.name) {
      const { error: updateErr } = await supabase.from('companies').update({ name: newName }).eq('id', c.id);
      if (updateErr) {
        console.error("Error updating", c.name, updateErr);
      } else {
        console.log(`Renamed ${c.name} to ${newName}`);
      }
    } else {
      console.log(`Company ${c.name} left as is`);
    }
  }
}

renameCompanies();
