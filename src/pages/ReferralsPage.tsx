import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { calculateUserCapital } from '../lib/calculations';
import { getUserLevel, LEVEL_CONFIG } from '../lib/simulator';
import { Users, Copy, Check, Award, TrendingUp, Gift, Share2, BarChart3, HelpCircle } from 'lucide-react';

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ReferralsPage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { users: allUsers, referrals: allReferrals, deposits, withdrawals, accruals, loading } = useData();

  if (!user || loading) return null;

  const capital = calculateUserCapital(user.id, deposits, withdrawals, accruals);
  const level = getUserLevel(capital);
  const referrals = allReferrals.filter(r => r.referrerId === user.id);
  const totalCommission = referrals.reduce((s, r) => s + r.commission, 0);
  const referralLink = `${window.location.origin}?ref=${user.referralCode}`;

  // Ranking across all users
  const ranking = allUsers
    .map(u => ({
      id: u.id,
      fullName: u.fullName,
      referralCode: u.referralCode,
      count: allReferrals.filter(r => r.referrerId === u.id).length,
      commission: allReferrals.filter(r => r.referrerId === u.id).reduce((s, r) => s + r.commission, 0),
    }))
    .filter(u => u.count > 0)
    .sort((a, b) => b.count - a.count || b.commission - a.commission);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: '1ndexa2 Pay - Renta Diaria Compuesta', text: `Unete a 1ndexa2 Pay y obtiene 1% diario con interes compuesto. Usa mi codigo: ${user.referralCode}`, url: referralLink });
    } else {
      handleCopy();
    }
  };

  return (
    <div className="page-section">
      <div className="section-label">Programa de Referidos</div>
      <h1 className="font-display text-3xl sm:text-4xl tracking-wider text-white mb-8">
        REFERIDOS
      </h1>

      {/* Referral code & QR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <Share2 size={18} className="text-brand-orange" />
            <h3 className="font-display text-lg tracking-wider text-white">TU ENLACE DE REFERIDO</h3>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-5">
            <div className="bg-white p-3 rounded-xl">
              <QRCodeSVG
                value={referralLink}
                size={150}
                bgColor="#ffffff"
                fgColor="#0C1525"
                level="M"
              />
            </div>
          </div>

          {/* Referral code */}
          <div className="bg-brand-dark/60 border border-brand-border rounded-lg p-4 mb-4">
            <p className="font-mono text-[10px] text-white/35 tracking-widest uppercase mb-1.5">Tu Codigo</p>
            <p className="font-display text-2xl text-brand-orange tracking-wider">{user.referralCode}</p>
          </div>

          {/* Referral link */}
          <div className="bg-brand-dark/60 border border-brand-border rounded-lg p-4 mb-4">
            <p className="font-mono text-[10px] text-white/35 tracking-widest uppercase mb-1.5">Tu Enlace</p>
            <p className="font-mono text-xs text-white/60 break-all">{referralLink}</p>
          </div>

          <div className="flex gap-2">
            <button onClick={handleCopy} className="btn-outline flex-1 flex items-center justify-center gap-2">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'COPIADO!' : 'COPIAR ENLACE'}
            </button>
            <button onClick={handleShare} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Share2 size={14} /> COMPARTIR
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-5 border-brand-orange/20">
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-brand-orange" />
                <span className="font-mono text-[9px] text-white/35 tracking-widest uppercase">Referidos</span>
              </div>
              <div className="font-display text-3xl text-brand-orange">{referrals.length}</div>
            </div>
            <div className="glass-card p-5 border-brand-success/20">
              <div className="flex items-center gap-2 mb-2">
                <Gift size={14} className="text-brand-success" />
                <span className="font-mono text-[9px] text-white/35 tracking-widest uppercase">Comisiones</span>
              </div>
              <div className="font-display text-3xl text-brand-success">{fmt(totalCommission)}</div>
            </div>
            <div className="glass-card p-5 border-brand-gold/20">
              <div className="flex items-center gap-2 mb-2">
                <Award size={14} className="text-brand-gold" />
                <span className="font-mono text-[9px] text-white/35 tracking-widest uppercase">Tu Nivel</span>
              </div>
              <div className="font-display text-3xl" style={{ color: level.color }}>{level.label}</div>
            </div>
            <div className="glass-card p-5 border-brand-navy/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-brand-navy" />
                <span className="font-mono text-[9px] text-white/35 tracking-widest uppercase">Capital</span>
              </div>
              <div className="font-display text-xl text-white">{fmt(capital)}</div>
            </div>
          </div>

          {/* How it works */}
          <div className="glass-card p-5 border-l-4 border-brand-orange">
            <h4 className="font-mono text-xs text-brand-orange tracking-widest uppercase mb-3 flex items-center gap-2">
              <HelpCircle size={14} /> COMO FUNCIONA (MATCHING BONUS)
            </h4>
            <div className="space-y-3 text-[11px] text-white/50 leading-relaxed">
              <p>
                A diferencia de los esquemas tradicionales que descapitalizan el fondo, nuestro sistema te premia con un 
                <strong className="text-white"> porcentaje pasivo sobre los intereses diarios</strong> que generan tus referidos.
              </p>
              
              <div className="bg-brand-dark/40 border border-brand-border rounded p-3 my-2">
                <p className="font-mono text-brand-success mb-1">Ejemplo Practico:</p>
                <p>1. Eres nivel Platino (20%).</p>
                <p>2. Tu referido invierte 1,000 USDT.</p>
                <p>3. El genera ~30 USDT de interes al mes.</p>
                <p>4. El sistema te paga <strong className="text-brand-orange">6 USDT (20% de 30)</strong> a ti, sin restarle a el.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                {LEVEL_CONFIG.map((lvl) => (
                  <div key={lvl.level} className="flex items-center justify-between border-b border-white/5 pb-1">
                    <span style={{ color: lvl.color }}>{lvl.label}</span>
                    <span className="text-white">{(lvl.referralMatchPercent * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* My referrals list */}
      {referrals.length > 0 && (
        <div className="glass-card p-5 mb-6">
          <h4 className="font-mono text-[10px] text-white/35 tracking-widest uppercase mb-3">MIS REFERIDOS</h4>
          <div className="space-y-2">
            {referrals.map((r) => {
              const referred = users.find((u: any) => u.id === r.referredUserId);
              return (
                <div key={r.id} className="flex items-center justify-between bg-brand-dark/40 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-orange/10 flex items-center justify-center">
                      <Users size={14} className="text-brand-orange" />
                    </div>
                    <div>
                      <p className="font-mono text-xs text-white/60">{referred?.fullName || 'Usuario'}</p>
                      <p className="font-mono text-[10px] text-white/25">{new Date(r.createdAt).toLocaleDateString('es')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs text-brand-orange">+{fmt(r.commission)} USDT</p>
                    <p className="font-mono text-[10px] text-white/25">Capital: {fmt(referredCapital)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ranking */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 size={16} className="text-brand-gold" />
          <h4 className="font-mono text-xs text-white/35 tracking-widest uppercase">RANKING DE AFILIADOS</h4>
        </div>
        {ranking.length === 0 ? (
          <p className="font-mono text-xs text-white/20">No hay datos de ranking aun</p>
        ) : (
          <div className="space-y-2">
            {ranking.slice(0, 10).map((r, idx) => (
              <div
                key={r.id}
                className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                  r.id === user.id ? 'bg-brand-orange/10 border border-brand-orange/20' : 'bg-brand-dark/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-display text-lg ${
                    idx === 0 ? 'text-brand-gold' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-white/30'
                  }`}>
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="font-mono text-xs text-white/60">
                      {r.fullName}
                      {r.id === user.id && <span className="text-brand-orange ml-2">(Tu)</span>}
                    </p>
                    <p className="font-mono text-[10px] text-white/25">{r.referralCode}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-brand-success">{r.count} referidos</p>
                  <p className="font-mono text-[10px] text-brand-gold">{fmt(r.commission)} USDT</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
