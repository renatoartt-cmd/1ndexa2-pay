import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { calculateUserCapital, getUserDaysActive, getUserTransactions, getUserAccruals } from '../lib/calculations';
import { DAILY_RATE, dashboardProjection } from '../lib/simulator';
import { History as HistoryIcon, ArrowUpRight, ArrowDownRight, TrendingUp, Filter, Zap } from 'lucide-react';

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdrawal' | 'accrual'>('all');

  const { deposits: globalDeposits, withdrawals: globalWithdrawals, accruals: globalAccruals, transactions: globalTransactions, loading } = useData();

  if (!user || loading) return null;

  const capital = calculateUserCapital(user.id, globalDeposits, globalWithdrawals, globalAccruals);
  const daysActive = getUserDaysActive(user.id, globalDeposits);
  const projection = dashboardProjection(capital, daysActive);
  const transactions = getUserTransactions(user.id, globalTransactions);
  const accruals = getUserAccruals(user.id, globalAccruals);
  const totalAccrued = accruals.reduce((s, a) => s + a.interest, 0);
  const totalDeposited = globalDeposits.filter(d => d.userId === user.id && d.status === 'confirmed').reduce((s, d) => s + d.amount, 0);
  const totalWithdrawn = globalWithdrawals.filter(w => w.userId === user.id && w.status === 'approved').reduce((s, w) => s + w.amount, 0);

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);

  const typeIcon = (type: string) => {
    if (type === 'deposit') return <ArrowUpRight size={13} className="text-brand-success" />;
    if (type === 'withdrawal') return <ArrowDownRight size={13} className="text-brand-gold" />;
    return <TrendingUp size={13} className="text-brand-orange" />;
  };

  const typeLabel = (type: string) => {
    if (type === 'deposit') return 'Deposito';
    if (type === 'withdrawal') return 'Retiro';
    return 'Devengado';
  };

  const statusBadge = (status: string) => {
    if (['confirmed', 'paid', 'approved'].includes(status)) return 'badge-success';
    if (status === 'rejected') return 'badge-error';
    return 'badge-gold';
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      confirmed: 'Confirmado', paid: 'Pagado', approved: 'Aprobado', rejected: 'Rechazado', pending: 'Pendiente',
    };
    return map[status] || status;
  };

  const filters: { key: typeof filter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'deposit', label: 'Depositos' },
    { key: 'withdrawal', label: 'Retiros' },
    { key: 'accrual', label: 'Devengados' },
  ];

  return (
    <div className="page-section">
      <div className="section-label">Registro de Movimientos</div>
      <h1 className="font-display text-3xl sm:text-4xl tracking-wider text-white mb-8">
        HISTORIAL
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="glass-card p-4 border-l-4 border-brand-navy/50">
          <div className="font-mono text-[9px] text-white/30 tracking-widest uppercase">Total Depositado</div>
          <div className="font-display text-xl text-white">{fmt(totalDeposited)} USDT</div>
        </div>
        <div className="glass-card p-4 border-l-4 border-brand-orange/50">
          <div className="font-mono text-[9px] text-white/30 tracking-widest uppercase">Interes Devengado</div>
          <div className="font-display text-xl text-brand-orange">+{fmt(totalAccrued)} USDT</div>
        </div>
        <div className="glass-card p-4 border-l-4 border-brand-gold/50">
          <div className="font-mono text-[9px] text-white/30 tracking-widest uppercase">Total Retirado</div>
          <div className="font-display text-xl text-brand-gold">{fmt(totalWithdrawn)} USDT</div>
        </div>
        <div className="glass-card p-4 border-l-4 border-brand-success/50">
          <div className="font-mono text-[9px] text-white/30 tracking-widest uppercase">Valor Actual</div>
          <div className="font-display text-xl text-brand-success">{fmt(projection.currentValue)} USDT</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter size={14} className="text-white/30" />
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-md font-mono text-[10px] tracking-wider transition-all ${
              filter === f.key
                ? 'bg-brand-orange/15 text-brand-orange border border-brand-orange/30'
                : 'bg-white/5 text-white/35 hover:bg-white/10 border border-transparent'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <HistoryIcon size={40} className="text-white/10 mx-auto mb-4" />
          <p className="font-mono text-sm text-white/25">No hay transacciones registradas</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-border bg-white/[0.02]">
                  <th className="text-left font-mono text-[9px] text-white/30 tracking-widest uppercase px-4 py-3">Fecha</th>
                  <th className="text-left font-mono text-[9px] text-white/30 tracking-widest uppercase px-4 py-3">Tipo</th>
                  <th className="text-left font-mono text-[9px] text-white/30 tracking-widest uppercase px-4 py-3">Descripcion</th>
                  <th className="text-right font-mono text-[9px] text-white/30 tracking-widest uppercase px-4 py-3">Monto</th>
                  <th className="text-right font-mono text-[9px] text-white/30 tracking-widest uppercase px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr key={tx.id} className="border-b border-brand-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-white/50">
                      {new Date(tx.createdAt).toLocaleDateString('es', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {typeIcon(tx.type)}
                        <span className="font-mono text-xs text-white/60">{typeLabel(tx.type)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-white/35">
                      {tx.description || '-'}
                    </td>
                    <td className={`px-4 py-3 font-mono text-xs text-right ${
                      tx.type === 'accrual' ? 'text-brand-success' : 'text-white/60'
                    }`}>
                      {tx.type === 'accrual' ? '+' : ''}{fmt(tx.amount)} USDT
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`badge text-[9px] ${statusBadge(tx.status)}`}>
                        {statusLabel(tx.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
