import React, { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { useData } from '../hooks/useData';
import { ShieldCheck } from 'lucide-react';

const INITIAL_CAPITAL = 100; // USD

function getWeekStart(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString().split('T')[0];
}

function getMonthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

function getYearKey(dateStr: string) {
  return new Date(dateStr).getFullYear().toString();
}

function formatCurrency(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CopytradingPage() {
  const { trades } = useData();

  const metrics = useMemo(() => {
    // 1. Sort trades
    const sorted = [...trades].filter(t => t.closeTime).sort((a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime());
    
    let currentBalance = INITIAL_CAPITAL;
    let winningTrades = 0;
    let totalProfit = 0;
    
    // Tracking points for charts
    const dailyBalances: Record<string, number> = {};
    const weeklyOHLC: Record<string, { o: number, h: number, l: number, c: number }> = {};
    const monthlyData: Record<string, { startBalance: number, profit: number }> = {};
    const yearlyData: Record<string, { startBalance: number, profit: number }> = {};

    sorted.forEach(t => {
      if (t.profit > 0) winningTrades++;
      totalProfit += t.profit;

      const dateStr = t.closeTime.split('T')[0] || t.closeTime.split(' ')[0];
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

    const winRate = sorted.length > 0 ? (winningTrades / sorted.length) * 100 : 0;
    const absReturn = ((currentBalance - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;

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
      absReturn,
      winRate,
      totalTrades: sorted.length,
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
            <p className="text-xs text-slate-500 tracking-widest mt-2 uppercase">Saldo Final Auditado (USD)</p>
          </div>

          <div className="bg-[#0F172A]/80 border border-white/5 rounded-2xl p-6 text-center shadow-2xl backdrop-blur-sm min-w-[280px]">
            <h2 className="text-4xl md:text-5xl font-black text-[#F59E0B] tracking-tight">
              +{formatCurrency(metrics.absReturn)}%
            </h2>
            <p className="text-xs text-slate-500 tracking-widest mt-2 uppercase">Rendimiento Acumulado</p>
          </div>

          <div className="bg-[#0F172A]/80 border border-white/5 rounded-2xl p-6 text-center shadow-2xl backdrop-blur-sm min-w-[280px]">
            <h2 className="text-4xl md:text-5xl font-black text-[#00E5FF] tracking-tight">
              {INITIAL_CAPITAL} USD
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
