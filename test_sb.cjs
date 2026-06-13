const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8');
let url = '', key = '';
env.split('\n').forEach(line => {
  if (line.includes('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.includes('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(url, key);
sb.from('users').select('*').then(d => {
  console.log('USERS length/error:', d.data ? d.data.length : d.error);
  if(d.error) process.exit(1);
  if(d.data && d.data.length === 0) {
    console.log('Inserting admin...');
    sb.from('users').insert({
      email: 'admin@1ndexa2.com',
      password: 'Admin123!',
      full_name: 'Admin',
      role: 'admin',
      referral_code: 'ADMIN000',
      phone: '0000000',
      country: 'Demo'
    }).then(res => console.log('Insert:', res.error || 'Success!'));
  }
}).catch(console.error);
