import { createClient } from '@supabase/supabase-js';

const DAILY_RATE = 0.000986;

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: any, res: any) {
  // Verificación de seguridad recomendada por Vercel
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const [
      { data: users }, 
      { data: deposits }, 
      { data: withdrawals }, 
      { data: accruals }, 
      { data: referrals }
    ] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('deposits').select('*').eq('status', 'confirmed'),
      supabase.from('withdrawals').select('*').neq('status', 'rejected'),
      supabase.from('accruals').select('*'),
      supabase.from('referrals').select('*')
    ]);

    if (!users || !deposits) return res.status(200).json({ status: 'Sin datos' });

    const today = new Date().toISOString().split('T')[0];
    
    // CORTE T+1: Solo cuentan los depósitos confirmados hace MÁS de 24 horas.
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);

    const newAccruals = [];
    const newTransactions = [];
    const updatedReferrals = [];

    for (const user of users) {
      // 1. Calcular Capital Elegible (solo depósitos antiguos > 24h)
      const userDeposits = deposits.filter(d => d.user_id === user.id && new Date(d.created_at).getTime() < cutoffTime);
      const userWithdrawals = withdrawals?.filter(w => w.user_id === user.id && w.withdraw_type === 'capital') || [];
      
      const totalDeposits = userDeposits.reduce((sum, d) => sum + Number(d.amount), 0);
      const totalCapitalWithdrawals = userWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
      
      const capital = Math.max(0, totalDeposits - totalCapitalWithdrawals);
      
      if (capital <= 0) continue;

      // 2. Verificar si ya se pagó hoy
      const alreadyPaid = accruals?.find(a => a.user_id === user.id && a.date === today);
      if (alreadyPaid) continue;

      // 3. Calcular Interés Diario
      const interest = capital * DAILY_RATE;

      newAccruals.push({
        user_id: user.id,
        capital,
        rate: DAILY_RATE,
        interest,
        date: today
      });

      newTransactions.push({
        user_id: user.id,
        type: 'accrual',
        amount: interest,
        description: `Interés ${(DAILY_RATE * 100).toFixed(4)}%`,
        status: 'paid'
      });

      // 4. Calcular Matching Bonus para el Patrocinador
      if (user.referred_by) {
        const referrer = users.find(u => u.referral_code === user.referred_by);
        if (referrer) {
          // Evaluar nivel del patrocinador
          const refDeposits = deposits.filter(d => d.user_id === referrer.id && new Date(d.created_at).getTime() < cutoffTime);
          const refWithdrawals = withdrawals?.filter(w => w.user_id === referrer.id && w.withdraw_type === 'capital') || [];
          const refCapital = Math.max(0, refDeposits.reduce((s, d) => s + Number(d.amount), 0) - refWithdrawals.reduce((s, w) => s + Number(w.amount), 0));

          let matchPercent = 0.05; // Bronce
          if (refCapital >= 10000) matchPercent = 0.20; // Platino
          else if (refCapital >= 5000) matchPercent = 0.15; // Oro
          else if (refCapital >= 1000) matchPercent = 0.10; // Plata

          const bonus = interest * matchPercent;

          newTransactions.push({
            user_id: referrer.id,
            type: 'accrual',
            amount: bonus,
            description: `Matching Bonus (${(matchPercent * 100).toFixed(0)}%) de ${user.full_name}`,
            status: 'paid'
          });

          // Actualizar registro de comisión en referidos
          const existingRef = referrals?.find(r => r.referrer_id === referrer.id && r.referred_user_id === user.id);
          if (existingRef) {
            updatedReferrals.push({
              id: existingRef.id,
              commission: Number(existingRef.commission) + bonus
            });
          }
        }
      }
    }

    // 5. Insertar y actualizar en la base de datos
    if (newAccruals.length > 0) {
      await supabase.from('accruals').insert(newAccruals);
    }
    if (newTransactions.length > 0) {
      await supabase.from('transactions').insert(newTransactions);
    }
    
    for (const ref of updatedReferrals) {
      await supabase.from('referrals').update({ commission: ref.commission }).eq('id', ref.id);
    }

    return res.status(200).json({ 
      success: true, 
      pagosProcesados: newAccruals.length,
      bonosProcesados: updatedReferrals.length 
    });

  } catch (error: any) {
    console.error('CRON Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
