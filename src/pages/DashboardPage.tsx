import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { calculateUserCapital, getUserDaysActive, getUserTransactions, getUserAccruals } from '../lib/calculations';
import { dashboardProjection, getUserLevel, DAILY_RATE, MONTHLY_EFFECTIVE_RATE, ANNUAL_EFFECTIVE_RATE, dailyProjection } from '../lib/simulator';
import {
  DollarSign,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Zap,
  Calendar,
  Award,
  Clock,
  Target,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);
  return timeLeft;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const timeLeft = useCountdown();

  const { deposits, withdrawals, accruals: globalAccruals, transactions: globalTransactions, loading } = useData();

  const capital = user ? calculateUserCapital(user.id, deposits, withdrawals, globalAccruals) : 0;
  const daysActive = user ? getUserDaysActive(user.id, deposits) : 0;
  const level = getUserLevel(capital);
  const projection = dashboardProjection(capital, daysActive);
  const transactions = user ? getUserTransactions(user.id, globalTransactions) : [];
  const accruals = user ? getUserAccruals(user.id, globalAccruals) : [];
  const totalAccrued = accruals.reduce((s, a) => s + a.interest, 0);

  const kpis = [
    {
      label: 'Capital Depositado',
      value: `USDT ${fmt(capital, 0)}`,
      icon: DollarSign,
      color: 'text-brand-navy',
      bg: 'bg-brand-navy/15',
      border: 'border-brand-navy/30',
      sub: 'Monto total ingresado',
    },
    {
      label: 'Saldo Actual',
      value: `USDT ${fmt(projection.currentValue)}`,
      icon: TrendingUp,
      color: 'text-brand-success',
      bg: 'bg-brand-success/10',
      border: 'border-brand-success/20',
      sub: `Capital + Interés`,
    },
    {
      label: 'Ganancia Hoy',
      value: `+USDT ${fmt(projection.todayGain)}`,
      icon: Zap,
      color: 'text-brand-orange',
      bg: 'bg-brand-orange/10',
      border: 'border-brand-orange/20',
      sub: `Tasa diaria: ${(DAILY_RATE * 100).toFixed(4)}%`,
    },
    {
      label: 'Interés Acumulado',
      value: `+USDT ${fmt(totalAccrued)}`,
      icon: BarChart3,
      color: 'text-sky-400',
      bg: 'bg-sky-400/10',
      border: 'border-sky-400/20',
      sub: 'Total histórico devengado',
    },
    {
      label: 'Proyección Mensual',
      value: `+USDT ${fmt(projection.projectedMonthly)}`,
      icon: Calendar,
      color: 'text-brand-gold',
      bg: 'bg-brand-gold/10',
      border: 'border-brand-gold/20',
      sub: `~${(MONTHLY_EFFECTIVE_RATE * 100).toFixed(0)}% efectivo mensual`,
    },
    {
      label: 'Proyección Anual',
      value: `+USDT ${fmt(projection.projectedAnnual)}`,
      icon: Target,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
      border: 'border-purple-400/20',
      sub: `~${(ANNUAL_EFFECTIVE_RATE * 100).toFixed(0)}% efectivo anual`,
    },
    {
      label: 'Próxima Acreditación',
      value: timeLeft,
      icon: Clock,
      color: 'text-indigo-400',
      bg: 'bg-indigo-400/10',
      border: 'border-indigo-400/20',
      sub: 'Tiempo restante hoy',
    },
    {
      label: 'Nivel',
      value: level.label,
      icon: Award,
      color: level.color.replace('#', '') === 'CD7F32' ? 'text-amber-600' : level.color === '#94A3B8' ? 'text-slate-400' : level.color === '#F59E0B' ? 'text-yellow-400' : 'text-slate-200',
      bg: 'bg-white/5',
      border: 'border-white/10',
      sub: capital > 0 ? `ROI: ${fmt(projection.roiPercent)}%` : undefined,
    },
  ];

  // Charts data
  const dailyData = useMemo(() => dailyProjection(capital, Math.min(daysActive + 30, 365)), [capital, daysActive]);
  
  const capitalChart = {
    labels: dailyData.map(d => `D${d.day}`),
    datasets: [
      {
        label: 'Capital Base',
        data: dailyData.map(d => d.capital - d.accumulatedGain),
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        pointRadius: 0,
        tension: 0.1,
      },
      {
        label: 'Saldo Actual',
        data: dailyData.map(d => d.capital),
        borderColor: '#F97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 0,
      },
    ],
  };

  const dailyGainChart = useMemo(() => {
    const last30 = dailyData.slice(-30);
    return {
      labels: last30.map(d => `D${d.day}`),
      datasets: [{
        label: 'Ganancia Diaria (USDT)',
        data: last30.map(d => d.dailyGain),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderRadius: 4,
      }],
    };
  }, [dailyData]);

  const futureData = useMemo(() => dailyProjection(projection.currentValue, 30), [projection.currentValue]);
  const compoundGrowthChart = {
    labels: futureData.map((_, i) => `D+${i+1}`),
    datasets: [{
      label: 'Proyección 30 Días (USDT)',
      data: futureData.map(d => d.capital),
      borderColor: '#A855F7',
      backgroundColor: 'rgba(168, 85, 247, 0.15)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 2,
    }]
  };

  const monthlyHistoricalChart = useMemo(() => {
    const months: Record<string, number> = {};
    accruals.forEach(a => {
      const m = a.date.substring(0, 7); // YYYY-MM
      months[m] = (months[m] || 0) + a.interest;
    });
    const labels = Object.keys(months).sort();
    const data = labels.map(l => months[l]);
    return {
      labels: labels.length > 0 ? labels : ['Sin datos'],
      datasets: [{
        label: 'Interés por Mes (USDT)',
        data: data.length > 0 ? data : [0],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderRadius: 4,
      }]
    };
  }, [accruals]);

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: 'rgba(255,255,255,0.4)', font: { family: "'Space Mono', monospace", size: 10 } } },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: 'rgba(255,255,255,0.25)', font: { size: 8 }, maxTicksLimit: 10 } },
      y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: 'rgba(255,255,255,0.25)', font: { size: 9 } } },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  };

  const recentAccruals = accruals.slice(-10).reverse();
  const recentTx = transactions.slice(0, 8);

  if (!user || loading) return null;

  return (
    <div className="page-section">
      <div className="section-label">Panel Principal</div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h1 className="font-display text-3xl sm:text-4xl tracking-wider text-white">
          DASHBOARD
        </h1>
        <div className="flex items-center gap-2">
          <span
            className="badge font-mono text-[10px] px-3 py-1 animate-pulse-soft"
            style={{ backgroundColor: level.color + '20', color: level.color, borderColor: level.color + '40', border: '1px solid' }}
          >
            {level.label}
          </span>
        </div>
      </div>
      <p className="font-mono text-xs text-white/30 tracking-wider mb-8">
        Bienvenido, {user.fullName} &mdash; Interés Compuesto Diario {(DAILY_RATE * 100).toFixed(4)}%
      </p>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={`glass-card p-5 border ${kpi.border} hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Icon size={64} className={kpi.color} />
              </div>
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <div className={`p-2 rounded-md ${kpi.bg}`}>
                  <Icon size={16} className={kpi.color} />
                </div>
                <span className="font-mono text-[9px] text-white/40 tracking-widest uppercase leading-tight">
                  {kpi.label}
                </span>
              </div>
              <div className={`font-display text-2xl ${kpi.color} relative z-10`}>
                {kpi.value}
              </div>
              {kpi.sub && (
                <div className="font-mono text-[10px] text-white/30 mt-1 relative z-10">{kpi.sub}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      {capital > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="glass-card p-5">
            <h4 className="font-mono text-[10px] text-white/35 tracking-widest uppercase mb-4 flex items-center gap-2">
              <Activity size={12} className="text-brand-orange" />
              Evolución del Capital
            </h4>
            <div className="h-64">
              <Line data={capitalChart} options={chartOpts} />
            </div>
          </div>
          
          <div className="glass-card p-5">
            <h4 className="font-mono text-[10px] text-white/35 tracking-widest uppercase mb-4 flex items-center gap-2">
              <Zap size={12} className="text-brand-success" />
              Ganancias Diarias (Últimos 30 días)
            </h4>
            <div className="h-64">
              <Bar data={dailyGainChart} options={chartOpts} />
            </div>
          </div>

          <div className="glass-card p-5">
            <h4 className="font-mono text-[10px] text-white/35 tracking-widest uppercase mb-4 flex items-center gap-2">
              <TrendingUp size={12} className="text-purple-400" />
              Crecimiento Compuesto (Próximos 30 días)
            </h4>
            <div className="h-64">
              <Line data={compoundGrowthChart} options={chartOpts} />
            </div>
          </div>

          <div className="glass-card p-5">
            <h4 className="font-mono text-[10px] text-white/35 tracking-widest uppercase mb-4 flex items-center gap-2">
              <BarChart3 size={12} className="text-blue-400" />
              Rendimiento Histórico Mensual
            </h4>
            <div className="h-64">
              {monthlyHistoricalChart.labels.length > 0 ? (
                <Bar data={monthlyHistoricalChart as any} options={chartOpts} />
              ) : (
                <div className="h-full flex items-center justify-center text-white/20 font-mono text-xs">Sin datos suficientes</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent accruals */}
        <div className="glass-card p-5">
          <h4 className="font-mono text-[10px] text-white/35 tracking-widest uppercase mb-4 flex items-center gap-2">
            <Calendar size={12} className="text-brand-success" />
            Últimos Devengados
          </h4>
          {recentAccruals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th className="text-left font-mono text-[9px] text-white/30 tracking-widest uppercase pb-2 px-2">Fecha</th>
                    <th className="text-right font-mono text-[9px] text-white/30 tracking-widest uppercase pb-2 px-2">Capital</th>
                    <th className="text-right font-mono text-[9px] text-white/30 tracking-widest uppercase pb-2 px-2">Tasa</th>
                    <th className="text-right font-mono text-[9px] text-white/30 tracking-widest uppercase pb-2 px-2">Interés</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAccruals.map((a) => (
                    <tr key={a.id} className="border-b border-brand-border/50 hover:bg-white/[0.02] transition-colors">
                      <td className="py-2 px-2 font-mono text-[11px] text-white/50">{a.date}</td>
                      <td className="py-2 px-2 font-mono text-[11px] text-right text-white/60">{fmt(a.capital)}</td>
                      <td className="py-2 px-2 font-mono text-[11px] text-right text-brand-orange">{(a.rate * 100).toFixed(4)}%</td>
                      <td className="py-2 px-2 font-mono text-[11px] text-right text-brand-success">+{fmt(a.interest)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
             <p className="font-mono text-xs text-white/20 text-center py-4">Aún no hay devengados registrados</p>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="glass-card p-5">
          <h4 className="font-mono text-[10px] text-white/35 tracking-widest uppercase mb-4 flex items-center gap-2">
            <Activity size={12} className="text-brand-orange" />
            Actividad Reciente
          </h4>
          {recentTx.length === 0 ? (
            <p className="font-mono text-xs text-white/20 text-center py-4">No hay transacciones registradas</p>
          ) : (
            <div className="space-y-3">
              {recentTx.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-brand-border/30 last:border-0 hover:bg-white/[0.02] px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${tx.type === 'deposit' ? 'bg-brand-success/10 text-brand-success' : tx.type === 'withdrawal' ? 'bg-brand-gold/10 text-brand-gold' : 'bg-brand-orange/10 text-brand-orange'}`}>
                      {tx.type === 'deposit' && <ArrowUpRight size={14} />}
                      {tx.type === 'withdrawal' && <ArrowDownRight size={14} />}
                      {tx.type === 'accrual' && <TrendingUp size={14} />}
                    </div>
                    <div>
                      <div className="font-mono text-xs text-white/80">
                        {tx.type === 'deposit' ? 'Depósito' : tx.type === 'withdrawal' ? 'Retiro' : 'Devengado'}
                      </div>
                      <div className="font-mono text-[10px] text-white/40 mt-0.5">
                        {tx.createdAt.split('T')[0]} {tx.description && `• ${tx.description}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`font-mono text-xs ${tx.type === 'accrual' ? 'text-brand-success' : 'text-white/80'}`}>
                      {tx.type === 'accrual' ? '+' : ''}{fmt(tx.amount)} USDT
                    </span>
                    <span className={`badge text-[8px] ${
                      tx.status === 'confirmed' || tx.status === 'paid' || tx.status === 'approved'
                        ? 'badge-success' : tx.status === 'rejected' ? 'badge-error' : 'badge-gold'
                    }`}>
                      {tx.status === 'confirmed' ? 'Confirmado' : tx.status === 'paid' ? 'Pagado' : tx.status === 'approved' ? 'Aprobado' : tx.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
