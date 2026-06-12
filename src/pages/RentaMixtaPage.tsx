import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { calculateUserCapital } from '../lib/calculations';
import { DAILY_RATE, MONTHLY_EFFECTIVE_RATE, ANNUAL_EFFECTIVE_RATE, getUserLevel, LEVEL_CONFIG, quickSimulate } from '../lib/simulator';
import { Info, AlertTriangle, Zap, Award } from 'lucide-react';

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RentaMixtaPage() {
  const { user } = useAuth();
  const { deposits, withdrawals, accruals } = useData();
  const capital = user ? calculateUserCapital(user.id, deposits, withdrawals, accruals) : 0;
  const level = getUserLevel(capital);

  const rows = [
    { label: 'Capital Inicial', retiro: `${fmt(1000)} USDT`, comp: `${fmt(1000)} USDT` },
    { label: 'Ganancia Diaria (Dia 1)', retiro: `${fmt(1000 * DAILY_RATE)} USDT`, comp: `${fmt(1000 * DAILY_RATE)} USDT` },
    { label: 'Ganancia Mensual (Mes 1)', retiro: `${fmt(1000 * MONTHLY_EFFECTIVE_RATE)} USDT`, comp: `${fmt(1000 * MONTHLY_EFFECTIVE_RATE)} USDT` },
    { label: 'Capital a 6 meses', retiro: `${fmt(1000)} USDT`, comp: `${fmt(1000 * Math.pow(1 + DAILY_RATE, 180))} USDT` },
    { label: 'Ganancia total a 6 meses', retiro: `${fmt(1000 * MONTHLY_EFFECTIVE_RATE * 6)} USDT`, comp: `${fmt(1000 * Math.pow(1 + DAILY_RATE, 180) - 1000)} USDT` },
    { label: 'ROI a 6 meses', retiro: `${(MONTHLY_EFFECTIVE_RATE * 6 * 100).toFixed(2)}%`, comp: `${((Math.pow(1 + DAILY_RATE, 180) - 1) * 100).toFixed(2)}%` },
    { label: 'Capital a 12 meses', retiro: `${fmt(1000)} USDT`, comp: `${fmt(1000 * Math.pow(1 + DAILY_RATE, 365))} USDT` },
    { label: 'Ganancia total a 12 meses', retiro: `${fmt(1000 * MONTHLY_EFFECTIVE_RATE * 12)} USDT`, comp: `${fmt(1000 * Math.pow(1 + DAILY_RATE, 365) - 1000)} USDT` },
    { label: 'ROI a 12 meses', retiro: `${(MONTHLY_EFFECTIVE_RATE * 12 * 100).toFixed(2)}%`, comp: `${((Math.pow(1 + DAILY_RATE, 365) - 1) * 100).toFixed(2)}%` },
  ];

  return (
    <div className="page-section">
      <div className="section-label">Modo de Inversion</div>
      <h1 className="font-display text-3xl sm:text-4xl tracking-wider text-white mb-2">
        RENTA MIXTA
      </h1>
      <p className="font-display text-xl text-brand-orange tracking-wider mb-8">
        {(DAILY_RATE * 100).toFixed(4)}% DIARIO COMPUESTO (~{(MONTHLY_EFFECTIVE_RATE * 100).toFixed(0)}% MENSUAL)
      </p>

      {/* Live portfolio card */}
      {user && capital > 0 && (
        <div className="glass-card p-6 mb-8 border-l-4 border-brand-orange">
          <div className="flex items-center gap-3 mb-4">
            <Zap size={18} className="text-brand-orange" />
            <h3 className="font-display text-lg tracking-wider text-white">TU PORTAFOLIO EN VIVO</h3>
            <span className="badge text-[10px]" style={{ backgroundColor: level.color + '20', color: level.color, border: `1px solid ${level.color}40` }}>
              {level.label}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="font-mono text-[10px] text-white/30 tracking-widest uppercase">Capital</div>
              <div className="font-display text-2xl text-brand-navy">{fmt(capital)} <span className="text-sm text-white/40">USDT</span></div>
            </div>
            <div>
              <div className="font-mono text-[10px] text-white/30 tracking-widest uppercase">Ganancia Diaria</div>
              <div className="font-display text-2xl text-brand-orange">+{fmt(capital * DAILY_RATE)}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] text-white/30 tracking-widest uppercase">Proyeccion Mensual</div>
              <div className="font-display text-2xl text-brand-success">+{fmt(capital * MONTHLY_EFFECTIVE_RATE)}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] text-white/30 tracking-widest uppercase">Proyeccion Anual</div>
              <div className="font-display text-2xl text-brand-gold">+{fmt(capital * ANNUAL_EFFECTIVE_RATE)}</div>
            </div>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="glass-card p-6 mb-8 border-l-4 border-brand-navy">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-brand-navy/15 shrink-0">
            <Info size={20} className="text-brand-navy" />
          </div>
          <div>
            <h3 className="font-display text-lg tracking-wider text-white mb-3">
              COMO FUNCIONA EL INTERES COMPUESTO DIARIO
            </h3>
            <p className="text-white/60 leading-relaxed mb-4 text-sm">
              Los participantes reciben un rendimiento proyectado del{' '}
              <span className="text-brand-orange font-bold">{(DAILY_RATE * 100).toFixed(4)}% diario</span>{' '}
              sobre su capital, lo que equivale a un{' '}
              <span className="text-brand-success font-bold">~{(MONTHLY_EFFECTIVE_RATE * 100).toFixed(1)}% mensual efectivo</span>.{' '}
              Cada dia el interes se calcula sobre un capital mayor, generando{' '}
              <span className="text-brand-navy font-bold">interes compuesto</span>{' '}
              que hace crecer el capital exponencialmente.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-brand-success/5 border border-brand-success/20 rounded-lg p-5">
                <h4 className="font-mono text-xs text-brand-success tracking-widest uppercase mb-2">
                  Retiro Mensual (Simple)
                </h4>
                <p className="text-white/45 text-sm mb-3">
                  Retire sus ganancias cada mes. Su capital se mantiene intacto
                  y recibe pagos constantes de USDT.
                </p>
                <div className="font-mono text-sm text-white/60">
                  Ganancia = Capital x 0.03
                </div>
                <div className="font-mono text-xs text-white/30 mt-1">
                  Capital final = Capital inicial (sin crecimiento)
                </div>
              </div>
              <div className="bg-brand-navy/10 border border-brand-navy/20 rounded-lg p-5">
                <h4 className="font-mono text-xs text-brand-navy tracking-widest uppercase mb-2">
                  Interes Compuesto Diario
                </h4>
                <p className="text-white/45 text-sm mb-3">
                  Reinvierta sus ganancias automaticamente. Cada dia su capital crece
                  y genera mas ganancias. El crecimiento es exponencial.
                </p>
                <div className="font-mono text-sm text-white/60">
                  Capital Futuro = Capital x (1 + {(DAILY_RATE * 100).toFixed(4)}%)^Dias
                </div>
                <div className="font-mono text-xs text-white/30 mt-1">
                  ~{(MONTHLY_EFFECTIVE_RATE * 100).toFixed(1)}% efectivo mensual por capitalizacion diaria
                </div>
              </div>
            </div>

            {/* Formula cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-lg p-4 text-center">
                <div className="font-mono text-[10px] text-white/30 tracking-widest uppercase mb-1">Tasa Diaria</div>
                <div className="font-display text-2xl text-brand-orange">{(DAILY_RATE * 100).toFixed(4)}%</div>
                <div className="font-mono text-[10px] text-white/25 mt-1">0.0986% diario compuesto</div>
              </div>
              <div className="bg-brand-success/5 border border-brand-success/20 rounded-lg p-4 text-center">
                <div className="font-mono text-[10px] text-white/30 tracking-widest uppercase mb-1">Efectivo Mensual</div>
                <div className="font-display text-2xl text-brand-success">~{(MONTHLY_EFFECTIVE_RATE * 100).toFixed(1)}%</div>
                <div className="font-mono text-[10px] text-white/25 mt-1">Capitalizacion diaria</div>
              </div>
              <div className="bg-brand-gold/5 border border-brand-gold/20 rounded-lg p-4 text-center">
                <div className="font-mono text-[10px] text-white/30 tracking-widest uppercase mb-1">Efectivo Anual</div>
                <div className="font-display text-2xl text-brand-gold">~{(ANNUAL_EFFECTIVE_RATE * 100).toFixed(1)}%</div>
                <div className="font-mono text-[10px] text-white/25 mt-1">(1+0.0986%)^365 - 1</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Levels */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-center gap-3 mb-5">
          <Award size={18} className="text-brand-orange" />
          <h3 className="font-display text-lg tracking-wider text-white">NIVELES DE INVERSION</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {LEVEL_CONFIG.map((lvl) => (
            <div
              key={lvl.level}
              className={`rounded-lg p-5 border transition-all ${
                level.level === lvl.level ? 'scale-[1.02]' : ''
              }`}
              style={{
                backgroundColor: lvl.color + '10',
                borderColor: lvl.color + '30',
                borderWidth: level.level === lvl.level ? 2 : 1,
              }}
            >
              <div className="font-display text-xl tracking-wider" style={{ color: lvl.color }}>{lvl.label}</div>
              <div className="font-mono text-xs text-white/40 mt-1">
                {lvl.maxCapital === Infinity ? `${fmt(lvl.minCapital)}+ USDT` : `${fmt(lvl.minCapital)} - ${fmt(lvl.maxCapital)} USDT`}
              </div>
              {level.level === lvl.level && (
                <div className="mt-2 font-mono text-[10px] tracking-widest uppercase" style={{ color: lvl.color }}>
                  Tu nivel actual
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Comparison table */}
      <div className="glass-card p-6 mb-8">
        <h3 className="font-display text-lg tracking-wider text-white mb-5">
          COMPARACION DETALLADA (1,000 USDT)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-border">
                <th className="text-left font-mono text-[10px] text-white/35 tracking-widest uppercase pb-3 px-2">Parametro</th>
                <th className="text-center font-mono text-[10px] text-brand-success tracking-widest uppercase pb-3 px-2">Retiro Mensual</th>
                <th className="text-center font-mono text-[10px] text-brand-orange tracking-widest uppercase pb-3 px-2">Compuesto Diario</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-brand-border/50 hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-2 text-white/45">{row.label}</td>
                  <td className="py-3 px-2 text-center text-brand-success">{row.retiro}</td>
                  <td className="py-3 px-2 text-center text-brand-orange">{row.comp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="glass-card p-5 border-l-4 border-brand-gold">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="text-brand-gold shrink-0 mt-0.5" />
          <div>
            <h4 className="font-mono text-xs text-brand-gold tracking-widest uppercase mb-2">Aviso Importante</h4>
            <p className="text-white/40 text-sm leading-relaxed">
              Simulacion financiera con interes compuesto diario. No constituye garantia de rentabilidad.
              Los rendimientos proyectados son referenciales y pueden variar segun condiciones del mercado.
              Invertir siempre implica riesgos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
