import { useState, useMemo } from 'react';
import { simulate, quickSimulate, PRESET_CAPITALS, DAILY_RATE, MONTHLY_EFFECTIVE_RATE } from '../lib/simulator';
import type { SimulationParams } from '../lib/types';
import { Calculator, BarChart3, Coins, Zap, TrendingUp, Clock, ChevronDown, ChevronUp } from 'lucide-react';
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

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SimulatorPage() {
  const [params, setParams] = useState<SimulationParams>({
    capital: 1000,
    months: 12,
    monthlyContribution: 0,
    mode: 'compound',
  });
  
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  // Auto-calculate results based on params
  const result = useMemo(
    () => simulate(params),
    [params.capital, params.months, params.monthlyContribution, params.mode]
  );

  const lineChartData = {
    labels: result.monthlyData.map((d) => `Mes ${d.month}`),
    datasets: [
      {
        label: 'Capital',
        data: result.monthlyData.map((d) => d.capital),
        borderColor: '#F97316',
        backgroundColor: 'rgba(249, 115, 22, 0.08)',
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 3,
      },
      {
        label: 'Ganancia Acumulada',
        data: result.monthlyData.map((d) => d.cumulativeGain),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 3,
      },
    ],
  };

  const compResult = useMemo(() => {
    const w = simulate({ ...params, mode: 'withdrawal' });
    const c = simulate({ ...params, mode: 'compound' });
    return { withdrawal: w, compound: c };
  }, [params.capital, params.months, params.monthlyContribution]);

  const barChartData = {
    labels: ['Ganancia Total', 'Capital Proyectado', 'ROI %'],
    datasets: [
      {
        label: 'Retiro Mensual',
        data: [compResult.withdrawal.gananciaTotal, compResult.withdrawal.capitalProyectado, compResult.withdrawal.roiPercent],
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderRadius: 4,
      },
      {
        label: 'Interes Compuesto',
        data: [compResult.compound.gananciaTotal, compResult.compound.capitalProyectado, compResult.compound.roiPercent],
        backgroundColor: 'rgba(249, 115, 22, 0.6)',
        borderRadius: 4,
      },
    ],
  };

  const quickResults = useMemo(() => PRESET_CAPITALS.map((c) => ({ capital: c, ...quickSimulate(c) })), []);

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: 'rgba(255,255,255,0.4)', font: { family: "'Space Mono', monospace", size: 10 } } },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: 'rgba(255,255,255,0.25)', font: { size: 9 } } },
      y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: 'rgba(255,255,255,0.25)', font: { size: 9 } } },
    },
  };

  return (
    <div className="page-section">
      <div className="section-label">Proyecciones Financieras</div>
      <h1 className="font-display text-3xl sm:text-4xl tracking-wider text-white mb-8">
        SIMULADOR FINANCIERO
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Interactive Controls */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calculator size={18} className="text-brand-orange" />
            <h3 className="font-display text-lg tracking-wider text-white">PARAMETROS INTERACTIVOS</h3>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="input-label mb-0">Capital Inicial (USDT)</label>
                <div className="font-display text-xl text-brand-orange">{fmt(params.capital)}</div>
              </div>
              <input
                type="range"
                min="100"
                max="50000"
                step="100"
                value={params.capital}
                onChange={(e) => setParams(p => ({ ...p, capital: Number(e.target.value) }))}
                className="w-full accent-brand-orange h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex gap-2 mt-3">
                {[100, 500, 1000, 5000].map(val => (
                  <button 
                    key={val} 
                    onClick={() => setParams(p => ({ ...p, capital: val }))}
                    className="flex-1 py-1.5 rounded bg-white/5 hover:bg-white/10 font-mono text-[10px] text-white/50 transition-colors"
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="input-label mb-0">Plazo (Meses)</label>
                <div className="font-display text-xl text-brand-orange">{params.months} meses</div>
              </div>
              <input
                type="range"
                min="1"
                max="60"
                step="1"
                value={params.months}
                onChange={(e) => setParams(p => ({ ...p, months: Number(e.target.value) }))}
                className="w-full accent-brand-orange h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="input-label">Aporte Mensual (USDT)</label>
              <input
                type="number"
                value={params.monthlyContribution}
                onChange={(e) => setParams((p) => ({ ...p, monthlyContribution: Math.max(0, Number(e.target.value)) }))}
                className="input-field"
                placeholder="0 = sin aportes adicionales"
                min={0}
              />
            </div>

            <div>
              <label className="input-label">Modo de Inversion</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setParams((p) => ({ ...p, mode: 'withdrawal' }))}
                  className={`py-3 rounded-lg font-mono text-xs tracking-wider transition-all ${
                    params.mode === 'withdrawal'
                      ? 'bg-brand-success text-white'
                      : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  RETIRO MENSUAL
                </button>
                <button
                  onClick={() => setParams((p) => ({ ...p, mode: 'compound' }))}
                  className={`py-3 rounded-lg font-mono text-xs tracking-wider transition-all ${
                    params.mode === 'compound'
                      ? 'bg-brand-orange text-white'
                      : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  COMPUESTO DIARIO
                </button>
              </div>
            </div>

            <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-lg p-3 text-center">
              <p className="font-mono text-[10px] text-brand-orange tracking-wider">
                TASA: {(DAILY_RATE * 100).toFixed(4)}% DIARIO = ~{(MONTHLY_EFFECTIVE_RATE * 100).toFixed(0)}% MENSUAL
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Results */}
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4 border-brand-navy/20">
              <div className="font-mono text-[9px] text-white/35 tracking-widest uppercase mb-1">Capital Inicial</div>
              <div className="font-display text-xl text-white">{fmt(result.capitalInicial)} USDT</div>
            </div>
            <div className="glass-card p-4 border-brand-success/20">
              <div className="font-mono text-[9px] text-white/35 tracking-widest uppercase mb-1">Ganancia Total</div>
              <div className="font-display text-xl text-brand-success">+{fmt(result.gananciaTotal)}</div>
            </div>
            <div className="glass-card p-4 border-brand-orange/20">
              <div className="font-mono text-[9px] text-white/35 tracking-widest uppercase mb-1">Capital Proyectado</div>
              <div className="font-display text-xl text-brand-orange">{fmt(result.capitalProyectado)}</div>
            </div>
            <div className="glass-card p-4 border-brand-gold/20">
              <div className="font-mono text-[9px] text-white/35 tracking-widest uppercase mb-1">ROI ({params.months}m)</div>
              <div className="font-display text-xl text-brand-gold">{result.roiPercent.toFixed(2)}%</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card p-3 text-center">
              <div className="font-mono text-[8px] text-white/30 tracking-widest uppercase">Diario</div>
              <div className="font-mono text-sm text-brand-orange">+{fmt(result.dailyGain)}</div>
            </div>
            <div className="glass-card p-3 text-center">
              <div className="font-mono text-[8px] text-white/30 tracking-widest uppercase">Mensual</div>
              <div className="font-mono text-sm text-brand-success">+{fmt(result.monthlyGain)}</div>
            </div>
            <div className="glass-card p-3 text-center">
              <div className="font-mono text-[8px] text-white/30 tracking-widest uppercase">Anual</div>
              <div className="font-mono text-sm text-brand-gold">+{fmt(result.annualGain)}</div>
            </div>
          </div>

          <div className="glass-card p-5">
            <h4 className="font-mono text-[10px] text-white/35 tracking-widest uppercase mb-3">
              Evolución del Capital
            </h4>
            <div className="h-56">
              <Line data={lineChartData} options={chartOpts} />
            </div>
          </div>

          <div className="glass-card p-5">
            <h4 className="font-mono text-[10px] text-white/35 tracking-widest uppercase mb-3">
              Comparacion: Retiro vs Compuesto
            </h4>
            <div className="h-48">
              <Bar data={barChartData} options={chartOpts} />
            </div>
          </div>
        </div>
      </div>

      {/* Preset Capital Section merged from CalculatorPage */}
      <h2 className="font-display text-2xl tracking-wider text-white mb-6 border-t border-white/5 pt-12">
        <Zap size={20} className="inline mr-2 text-brand-orange" />
        CALCULOS RAPIDOS (CAPITAL FIJO)
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {quickResults.map((r, idx) => (
          <div
            key={r.capital}
            className="glass-card p-5 hover:-translate-y-0.5 transition-all duration-300 border-brand-border"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-brand-orange/10">
                <Coins size={16} className="text-brand-orange" />
              </div>
              <div>
                <div className="font-display text-xl text-brand-orange">
                  {r.capital.toLocaleString('en-US')} USDT
                </div>
                <div className="font-mono text-[9px] text-white/25 tracking-widest uppercase">Capital Inicial</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-1.5 border-b border-brand-border/50">
                <div className="flex items-center gap-2">
                  <Zap size={12} className="text-brand-orange" />
                  <span className="font-mono text-[9px] text-white/35 tracking-widest uppercase">Diario</span>
                </div>
                <span className="font-mono text-sm text-brand-orange">+{fmt(r.daily)}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-brand-border/50">
                <div className="flex items-center gap-2">
                  <TrendingUp size={12} className="text-brand-success" />
                  <span className="font-mono text-[9px] text-white/35 tracking-widest uppercase">1er Mes</span>
                </div>
                <span className="font-mono text-sm text-brand-success">+{fmt(r.monthly)}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-brand-border/50">
                <div className="flex items-center gap-2">
                  <TrendingUp size={12} className="text-brand-gold" />
                  <span className="font-mono text-[9px] text-white/35 tracking-widest uppercase">Anual</span>
                </div>
                <span className="font-mono text-sm text-brand-gold">+{fmt(r.annual)}</span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-brand-navy" />
                  <span className="font-mono text-[9px] text-white/35 tracking-widest uppercase">3 Años</span>
                </div>
                <span className="font-mono text-sm text-brand-navy">{fmt(r.threeYearCompound)}</span>
              </div>
            </div>

            <button
              onClick={() => setExpandedCard(expandedCard === idx ? null : idx)}
              className="mt-4 w-full flex items-center justify-center gap-1 font-mono text-[10px] text-brand-orange tracking-widest uppercase hover:text-brand-orange-light transition"
            >
              {expandedCard === idx ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expandedCard === idx ? 'OCULTAR' : 'VER'} DESGLOSE MENSUAL
            </button>

            {expandedCard === idx && (
              <div className="mt-3 animate-fade-in">
                <div className="max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-brand-border/50">
                        <th className="text-left font-mono text-[8px] text-white/25 tracking-widest uppercase pb-2">Mes</th>
                        <th className="text-right font-mono text-[8px] text-white/25 tracking-widest uppercase pb-2">Capital</th>
                        <th className="text-right font-mono text-[8px] text-white/25 tracking-widest uppercase pb-2">Ganancia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.monthlyBreakdown.map((row) => (
                        <tr key={row.month} className="border-b border-brand-border/20">
                          <td className="py-1.5 font-mono text-[10px] text-white/35">{row.month}</td>
                          <td className="py-1.5 font-mono text-[10px] text-right text-brand-orange">{fmt(row.capital)}</td>
                          <td className="py-1.5 font-mono text-[10px] text-right text-brand-success">+{fmt(row.gain)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
