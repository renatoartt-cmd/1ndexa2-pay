import React, { useMemo } from 'react';
import { LineChart, Activity, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { useData } from '../hooks/useData';

export function CopytradingPage() {
  const { trades } = useData();

  const stats = useMemo(() => {
    let totalProfit = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    
    trades.forEach(t => {
      totalProfit += t.profit;
      if (t.profit > 0) winningTrades++;
      else if (t.profit < 0) losingTrades++;
    });

    const totalTrades = winningTrades + losingTrades;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    return { totalProfit, winningTrades, losingTrades, winRate, totalTrades };
  }, [trades]);

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <div className="bg-gray-800 border-b border-gray-700 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <LineChart size={200} />
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-mono mb-4">
            <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></span>
            LIVE TRADING ALGO
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white flex items-center gap-3">
            Copytrading
          </h1>
          <p className="text-gray-400 mt-2 max-w-xl">
            Transparencia total. Monitorea en tiempo real el rendimiento de nuestro algoritmo institucional y traders profesionales.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-5 border-t-2 border-t-brand-primary">
            <div className="flex items-center gap-2 mb-2 text-gray-400">
              <Activity size={16} />
              <span className="text-xs uppercase tracking-wider font-mono">Profit Total</span>
            </div>
            <div className={`text-3xl font-display ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.totalProfit > 0 ? '+' : ''}{stats.totalProfit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </div>
          </div>
          
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2 text-gray-400">
              <Target size={16} />
              <span className="text-xs uppercase tracking-wider font-mono">Win Rate</span>
            </div>
            <div className="text-3xl font-display text-white">
              {stats.winRate.toFixed(1)}%
            </div>
          </div>
          
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2 text-gray-400">
              <TrendingUp size={16} className="text-green-400" />
              <span className="text-xs uppercase tracking-wider font-mono">Ganadas</span>
            </div>
            <div className="text-3xl font-display text-green-400">
              {stats.winningTrades}
            </div>
          </div>
          
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2 text-gray-400">
              <TrendingDown size={16} className="text-red-400" />
              <span className="text-xs uppercase tracking-wider font-mono">Perdidas</span>
            </div>
            <div className="text-3xl font-display text-red-400">
              {stats.losingTrades}
            </div>
          </div>
        </div>

        {/* Trades Table */}
        <div className="glass-card overflow-hidden border border-gray-800">
          <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-800/30">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Últimas Operaciones
            </h2>
            <div className="text-xs font-mono text-gray-500">
              {trades.length} operaciones registradas
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-gray-500 border-b border-gray-800 bg-gray-900/50">
                <tr>
                  <th className="p-4 font-medium font-mono text-xs uppercase tracking-wider">Fecha</th>
                  <th className="p-4 font-medium font-mono text-xs uppercase tracking-wider">Símbolo</th>
                  <th className="p-4 font-medium font-mono text-xs uppercase tracking-wider">Tipo</th>
                  <th className="p-4 font-medium font-mono text-xs uppercase tracking-wider text-right">Lote</th>
                  <th className="p-4 font-medium font-mono text-xs uppercase tracking-wider text-right">Profit (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      No hay operaciones registradas aún.
                    </td>
                  </tr>
                ) : (
                  trades.map(t => (
                    <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4 text-gray-400 font-mono text-xs">
                        {new Date(t.closeTime).toLocaleString('es-ES', { 
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="p-4 font-bold text-white group-hover:text-brand-primary transition-colors">
                        {t.symbol}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          t.type === 'buy' 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {t.type === 'buy' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {t.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-right text-gray-400 font-mono">
                        {t.volume.toFixed(2)}
                      </td>
                      <td className={`p-4 text-right font-mono font-bold ${
                        t.profit >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {t.profit > 0 ? '+' : ''}{t.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
