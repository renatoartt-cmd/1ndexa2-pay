import React, { useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import { useData } from '../hooks/useData';
import { ShieldCheck, Cloud, Server, Play, Pause, Plus, CheckCircle2, Wifi } from 'lucide-react';

// Capital is calculated dynamically from MT5 deposits (DEAL_TYPE_BALANCE)

function parseDate(dateVal: any): Date {
  if (!dateVal) return new Date();
  if (typeof dateVal === 'number') {
    // Excel serial date to JS Date
    return new Date(Math.round((dateVal - 25569) * 86400 * 1000));
  }
  const str = String(dateVal).replace(/\./g, '-').replace(' ', 'T');
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

function getWeekStart(dateStr: any) {
  const d = parseDate(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString().split('T')[0];
}

function getMonthKey(dateStr: any) {
  const d = parseDate(dateStr);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

function getYearKey(dateStr: any) {
  return parseDate(dateStr).getFullYear().toString();
}

function formatCurrency(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CopytradingPage() {
  const { trades } = useData();
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState<any>(null);

  const metrics = useMemo(() => {
    // 1. Sort trades
    const sorted = [...trades].filter(t => t.closeTime).sort((a, b) => parseDate(a.closeTime).getTime() - parseDate(b.closeTime).getTime());
    
    let currentBalance = 0;
    let totalDeposits = 0;
    let winningTrades = 0;
    let totalProfit = 0;
    let numTradingTrades = 0;
    
    // Tracking points for charts
    const dailyBalances: Record<string, number> = {};
    const weeklyOHLC: Record<string, { o: number, h: number, l: number, c: number }> = {};
    const monthlyData: Record<string, { startBalance: number, profit: number }> = {};
    const yearlyData: Record<string, { startBalance: number, profit: number }> = {};

    sorted.forEach(t => {
      if (t.type === 'balance') {
        currentBalance += t.profit;
        if (t.profit > 0) totalDeposits += t.profit; // Suma solo los depósitos al capital base
        
        const d = parseDate(t.closeTime);
        const dateStr = d.toISOString().split('T')[0];
        dailyBalances[dateStr] = currentBalance;
        return; // No cuenta como trade para el winrate
      }

      numTradingTrades++;
      if (t.profit > 0) winningTrades++;
      totalProfit += t.profit;

      const d = parseDate(t.closeTime);
      const dateStr = d.toISOString().split('T')[0];
      const weekKey = getWeekStart(t.closeTime);
      const monthKey = getMonthKey(t.closeTime);
      const yearKey = getYearKey(t.closeTime);

      // Track start balances for periods
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { startBalance: currentBalance, profit: 0 };
      }
      if (!yearlyData[yearKey]) {
        yearlyData[yearKey] = { startBalance: currentBalance, profit: 0 };
      }

      // Weekly OHLC
      if (!weeklyOHLC[weekKey]) {
        // First trade of the week. Open is the balance BEFORE this trade.
        const open = currentBalance;
        weeklyOHLC[weekKey] = { o: open, h: Math.max(open, currentBalance + t.profit), l: Math.min(open, currentBalance + t.profit), c: currentBalance + t.profit };
      }

      // Apply profit
      currentBalance += t.profit;
      dailyBalances[dateStr] = currentBalance;
      
      // Monthly/Yearly aggregations
      monthlyData[monthKey].profit += t.profit;
      yearlyData[yearKey].profit += t.profit;

      // Update High/Low/Close for the week
      const w = weeklyOHLC[weekKey];
      w.h = Math.max(w.h, currentBalance);
      w.l = Math.min(w.l, currentBalance);
      w.c = currentBalance;
    });

    });

    const winRate = numTradingTrades > 0 ? (winningTrades / numTradingTrades) * 100 : 0;
    const absReturn = totalDeposits > 0 ? (totalProfit / totalDeposits) * 100 : 0;

    // Format Data for ApexCharts
    
    // 1. Line Chart (Cumulative)
    const dates = Object.keys(dailyBalances).sort();
    const step = Math.max(1, Math.floor(dates.length / 100));
    const lineChartData = dates.filter((_, i) => i % step === 0 || i === dates.length - 1).map(d => ({
      x: d,
      y: parseFloat(dailyBalances[d].toFixed(2))
    }));

    // 2. Candlestick Chart (Weekly)
    const candlestickData = Object.keys(weeklyOHLC).sort().map(w => ({
      x: w,
      y: [
        parseFloat(weeklyOHLC[w].o.toFixed(2)),
        parseFloat(weeklyOHLC[w].h.toFixed(2)),
        parseFloat(weeklyOHLC[w].l.toFixed(2)),
        parseFloat(weeklyOHLC[w].c.toFixed(2))
      ]
    }));

    // 3. Bar Chart (Monthly)
    const monthlyBarData = Object.keys(monthlyData).sort().slice(-12).map(m => {
      const d = monthlyData[m];
      const yieldPct = d.startBalance > 0 ? (d.profit / d.startBalance) * 100 : 0;
      return { x: m, y: parseFloat(yieldPct.toFixed(2)) };
    });

    // 4. Bar Chart (Yearly)
    const yearlyBarData = Object.keys(yearlyData).sort().map(y => {
      const d = yearlyData[y];
      const yieldPct = d.startBalance > 0 ? (d.profit / d.startBalance) * 100 : 0;
      return { x: y, y: parseFloat(yieldPct.toFixed(2)) };
    });

    return {
      finalBalance: currentBalance,
      totalDeposits,
      absReturn,
      winRate,
      totalTrades: numTradingTrades,
      lineChartData,
      candlestickData,
      monthlyBarData,
      yearlyBarData
    };

  }, [trades]);

  // Chart Configurations
  const commonOptions: ApexCharts.ApexOptions = {
    chart: {
      foreColor: '#64748B',
      toolbar: { show: false },
      background: 'transparent',
    },
    grid: {
      borderColor: '#1E293B',
      strokeDashArray: 4,
    },
    theme: { mode: 'dark' },
    tooltip: { theme: 'dark' },
  };

  const lineChartOptions: ApexCharts.ApexOptions = {
    ...commonOptions,
    stroke: { curve: 'smooth', width: 3 },
    colors: ['#00E5FF'],
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] }
    },
    xaxis: { type: 'datetime', labels: { format: 'MMM yy' } },
    yaxis: { labels: { formatter: (v) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}` } },
    dataLabels: { enabled: false }
  };

  const candleOptions: ApexCharts.ApexOptions = {
    ...commonOptions,
    plotOptions: {
      candlestick: {
        colors: { upward: '#00E5FF', downward: '#8B5CF6' },
        wick: { useFillColor: true }
      }
    },
    xaxis: { type: 'datetime', labels: { format: 'MMM dd' } },
    yaxis: { labels: { formatter: (v) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}` } }
  };

  const barMonthlyOptions: ApexCharts.ApexOptions = {
    ...commonOptions,
    colors: ['#8B5CF6'],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
    dataLabels: { enabled: false },
    yaxis: { labels: { formatter: (v) => `${v}%` } },
  };

  const barYearlyOptions: ApexCharts.ApexOptions = {
    ...commonOptions,
    colors: ['#00E5FF'],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
    dataLabels: { enabled: false },
    yaxis: { labels: { formatter: (v) => `${v}%` } },
  };

  return (
    <div className="min-h-screen bg-[#0B1221] pb-20 font-sans selection:bg-brand-orange/30">
      
      {/* Header Stats */}
      <div className="pt-12 pb-8 px-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row justify-center gap-6 lg:gap-12 mb-12">
          
          <div className="bg-[#0F172A]/80 border border-white/5 rounded-2xl p-6 text-center shadow-2xl backdrop-blur-sm min-w-[280px]">
            <h2 className="text-4xl md:text-5xl font-black text-[#00E5FF] tracking-tight">
              ${formatCurrency(metrics.finalBalance)}
            </h2>
            <p className="text-xs text-slate-500 tracking-widest mt-2 uppercase">Saldo Final Auditado (USD.Cent)</p>
          </div>

          <div className="bg-[#0F172A]/80 border border-white/5 rounded-2xl p-6 text-center shadow-2xl backdrop-blur-sm min-w-[280px]">
            <h2 className="text-4xl md:text-5xl font-black text-[#F59E0B] tracking-tight">
              +{metrics.absReturn.toFixed(2)}%
            </h2>
            <p className="text-xs text-slate-500 tracking-widest mt-2 uppercase">Rendimiento Acumulado</p>
          </div>

          <div className="bg-[#0F172A]/80 border border-white/5 rounded-2xl p-6 text-center shadow-2xl backdrop-blur-sm min-w-[280px]">
            <h2 className="text-4xl md:text-5xl font-black text-[#00E5FF] tracking-tight">
              {formatCurrency(metrics.totalDeposits)} USD.Cent
            </h2>
            <p className="text-xs text-slate-500 tracking-widest mt-2 uppercase">Capital Inicial Base</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          <button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold py-3 px-8 rounded-lg tracking-wider text-sm transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]">
            COPIAR SEÑAL EN VIVO (VT MARKETS)
          </button>
          <button className="bg-[#00E5FF] hover:bg-[#06b6d4] text-[#0B1221] font-bold py-3 px-8 rounded-lg tracking-wider text-sm transition-all shadow-[0_0_20px_rgba(0,229,255,0.3)]">
            MODELOS DE ACCESO
          </button>
          <button className="bg-transparent border border-[#00E5FF] text-[#00E5FF] hover:bg-[#00E5FF]/10 font-bold py-3 px-8 rounded-lg tracking-wider text-sm transition-all">
            SEÑAL EN VIVO (MYFXBOOK)
          </button>
        </div>

        {/* Cloud Connectivity Hub */}
        <div className="mb-16">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px w-8 bg-[#8B5CF6]"></div>
            <p className="text-[#8B5CF6] text-xs font-mono tracking-widest uppercase">Ecosistema en la Nube</p>
          </div>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Cloud Status */}
            <div className="bg-[#0F172A] border border-white/5 rounded-2xl p-6 lg:w-1/3 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-24 bg-[#00E5FF]/5 blur-[80px] rounded-full pointer-events-none"></div>
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-white font-bold tracking-wider">ESTADO DEL MASTER</h4>
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10B981]"></span>
                  </span>
                </div>
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <Server size={16} className="text-[#00E5FF]" />
                    <span>Servidor Master: <strong className="text-white">VTMarkets-Live 3</strong></span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <ShieldCheck size={16} className="text-[#F59E0B]" />
                    <span>Cuenta Maestra: <strong className="text-white">24188397</strong></span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <Wifi size={16} className="text-[#10B981]" />
                    <span>Latencia: <strong className="text-white">12ms</strong></span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <Cloud size={16} className="text-[#8B5CF6]" />
                    <span>Cuentas Copiando: <strong className="text-white">1,245</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Connection / Dashboard */}
            <div className="bg-[#0F172A] border border-[#8B5CF6]/30 rounded-2xl p-6 lg:w-2/3 shadow-[0_0_30px_rgba(139,92,246,0.1)] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-32 bg-[#8B5CF6]/5 blur-[100px] rounded-full pointer-events-none"></div>
              
              {!connectedAccount ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="text-xl font-bold text-white mb-1">Conectar mi cuenta a la Nube</h4>
                      <p className="text-xs text-slate-400">Vincula tu MetaTrader para replicar las operaciones automáticamente.</p>
                    </div>
                    {!showConnectForm && (
                      <button onClick={() => setShowConnectForm(true)} className="flex items-center gap-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-4 py-2 rounded-lg text-sm font-bold transition">
                        <Plus size={16} /> Conectar
                      </button>
                    )}
                  </div>

                  {showConnectForm && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in relative z-10">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider">Bróker</label>
                        <input type="text" placeholder="Ej: VT Markets" className="w-full bg-[#0B1221] border border-white/10 rounded-lg px-4 py-2 text-white text-sm mt-1 focus:border-[#8B5CF6] outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider">Servidor</label>
                        <input type="text" placeholder="Ej: VTMarkets-Live" className="w-full bg-[#0B1221] border border-white/10 rounded-lg px-4 py-2 text-white text-sm mt-1 focus:border-[#8B5CF6] outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider">Número de Cuenta</label>
                        <input type="text" placeholder="1234567" className="w-full bg-[#0B1221] border border-white/10 rounded-lg px-4 py-2 text-white text-sm mt-1 focus:border-[#8B5CF6] outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider">Contraseña (Inversor/Master)</label>
                        <input type="password" placeholder="••••••••" className="w-full bg-[#0B1221] border border-white/10 rounded-lg px-4 py-2 text-white text-sm mt-1 focus:border-[#8B5CF6] outline-none" />
                      </div>
                      <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                        <button onClick={() => setShowConnectForm(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition">Cancelar</button>
                        <button onClick={() => setConnectedAccount({ active: true })} className="bg-[#00E5FF] hover:bg-[#06b6d4] text-[#0B1221] px-6 py-2 rounded-lg text-sm font-bold transition shadow-[0_0_15px_rgba(0,229,255,0.3)]">
                          Validar y Conectar
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="animate-fade-in relative z-10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div>
                      <h4 className="text-xl font-bold text-white flex items-center gap-2">
                        Terminal Conectada <CheckCircle2 size={20} className="text-[#10B981]" />
                      </h4>
                      <p className="text-xs text-slate-400">Tu cuenta está recibiendo señales en tiempo real.</p>
                    </div>
                    <button 
                      onClick={() => setConnectedAccount((prev: any) => ({ ...prev, active: !prev.active }))} 
                      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${connectedAccount.active ? 'bg-[#0B1221] border border-red-500/50 text-red-400 hover:bg-red-500/10' : 'bg-[#10B981] text-[#0B1221] hover:bg-[#059669]'}`}
                    >
                      {connectedAccount.active ? <><Pause size={16} /> Pausar Copia</> : <><Play size={16} /> Reanudar Copia</>}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[#0B1221] border border-white/5 p-3 rounded-lg text-center">
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Cuenta</p>
                      <p className="text-white font-mono text-sm">8819234</p>
                    </div>
                    <div className="bg-[#0B1221] border border-white/5 p-3 rounded-lg text-center">
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Plataforma</p>
                      <p className="text-white font-mono text-sm">MT5</p>
                    </div>
                    <div className="bg-[#0B1221] border border-white/5 p-3 rounded-lg text-center">
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Riesgo</p>
                      <p className="text-white font-mono text-sm">Multiplicador x1</p>
                    </div>
                    <div className="bg-[#0B1221] border border-white/5 p-3 rounded-lg text-center">
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Balance Local</p>
                      <p className="text-[#00E5FF] font-bold text-sm">{formatCurrency(metrics.finalBalance)} USD.Cent</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Track Record Sections */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px w-8 bg-[#00E5FF]"></div>
            <p className="text-[#00E5FF] text-xs font-mono tracking-widest uppercase">Métricas de Rendimiento Comercial</p>
          </div>
          <h3 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            Track Record Matemático Real Auditado
            <ShieldCheck className="text-[#00E5FF]" size={32} />
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-[#0F172A] border border-white/5 rounded-xl p-6">
            <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-2">Rendimiento Acumulado Absoluto</p>
            <h4 className="text-3xl font-black text-[#00E5FF]">+{formatCurrency(metrics.absReturn)}%</h4>
            <p className="text-xs text-slate-400 mt-2">Basado en el capital inicial base validado</p>
          </div>
          <div className="bg-[#0F172A] border border-white/5 rounded-xl p-6">
            <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-2">Efectividad Operativa</p>
            <h4 className="text-3xl font-black text-[#10B981]">{metrics.winRate.toFixed(2)}%</h4>
            <p className="text-xs text-slate-400 mt-2">Win rate de operaciones ganadoras</p>
          </div>
          <div className="bg-[#0F172A] border border-white/5 rounded-xl p-6">
            <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-2">Ecosistema Central</p>
            <h4 className="text-3xl font-black text-[#F59E0B]">NATIVO MT5</h4>
            <p className="text-xs text-slate-400 mt-2">Opcional MT4 como puente corporativo</p>
          </div>
          <div className="bg-[#0F172A] border border-white/5 rounded-xl p-6">
            <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-2">Muestra Histórica</p>
            <h4 className="text-3xl font-black text-white">{metrics.totalTrades.toLocaleString()}</h4>
            <p className="text-xs text-slate-400 mt-2">Órdenes ejecutadas y validadas con cierre exacto</p>
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-6">
          
          <div className="bg-[#0F172A] border border-white/5 rounded-2xl p-6">
            <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-1">Evolución del Balance del Pool Comercial (USD)</p>
            <h4 className="text-xl font-bold text-white mb-6 uppercase">Curva de Crecimiento Monetario Real (Interés Compuesto Orgánico)</h4>
            <div className="h-[400px]">
              <Chart options={lineChartOptions} series={[{ name: 'Balance', data: metrics.lineChartData }]} type="area" height="100%" />
            </div>
          </div>

          <div className="bg-[#0F172A] border border-white/5 rounded-2xl p-6">
            <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-1">Volatilidad y Drawdown Histórico</p>
            <h4 className="text-xl font-bold text-white mb-6 uppercase">Gráfico de Velas Japonesas (Cierre Semanal)</h4>
            <div className="h-[400px]">
              <Chart options={candleOptions} series={[{ data: metrics.candlestickData }]} type="candlestick" height="100%" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0F172A] border border-white/5 rounded-2xl p-6">
              <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-1">Desempeño Mensual Histórico Medio</p>
              <h4 className="text-xl font-bold text-white mb-6 uppercase">Rendimiento Promedio Mensual (%)</h4>
              <div className="h-[300px]">
                <Chart options={barMonthlyOptions} series={[{ name: 'Rendimiento', data: metrics.monthlyBarData }]} type="bar" height="100%" />
              </div>
            </div>

            <div className="bg-[#0F172A] border border-white/5 rounded-2xl p-6">
              <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-1">Cierre Consolidado Anual Simple</p>
              <h4 className="text-xl font-bold text-white mb-6 uppercase">Rendimiento Anual Acumulado (%)</h4>
              <div className="h-[300px]">
                <Chart options={barYearlyOptions} series={[{ name: 'Rendimiento', data: metrics.yearlyBarData }]} type="bar" height="100%" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
