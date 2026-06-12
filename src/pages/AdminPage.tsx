import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { toast } from '../hooks/useToast';
import { useData } from '../hooks/useData';
import * as api from '../lib/api';
import { calculateTotalCapital, calculateTotalAccruedInterest } from '../lib/calculations';
import { supabase } from '../lib/supabase';
import { getUserLevel, LEVEL_CONFIG, DAILY_RATE } from '../lib/simulator';
import {
  Users,
  DollarSign,
  TrendingUp,
  ArrowDownRight,
  Check,
  X,
  Shield,
  Wallet,
  Award,
  BarChart3,
  Copy,
} from 'lucide-react';

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface PlatformWallet {
  id?: string;
  network: string;
  address: string;
  label: string;
  is_active: boolean;
}

const DEFAULT_WALLET_LIST = [
  { network: 'TRC20', label: 'USDT TRC20 (Tron)', address: 'TMUN9uXMMtCMDTesftabfgxiJvsgtSz4PR', is_active: true },
  { network: 'BEP20', label: 'USDT BEP20 (BNB Chain)', address: '0x79c3989750ec3fd9ec270ca4e54f79568820631f', is_active: true },
  { network: 'ERC20', label: 'USDC ERC20 (Ethereum)', address: '0x79c3989750ec3fd9ec270ca4e54f79568820631f', is_active: true },
  { network: 'POL', label: 'USDT POL (Polygon)', address: '0x79c3989750ec3fd9ec270ca4e54f79568820631f', is_active: true },
  { network: 'BTC', label: 'Bitcoin (BTC)', address: 'bc1qxxxxxxxxxxxxxxxxxxxxxxxxx', is_active: true },
  { network: 'ETH', label: 'Ethereum (ETH)', address: '0x79c3989750ec3fd9ec270ca4e54f79568820631f', is_active: true },
  { network: 'BinancePay', label: 'Binance Pay UID', address: '39473910', is_active: true },
];

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const [section, setSection] = useState<'overview' | 'users' | 'wallets' | 'referrals'>('overview');
  const [wallets, setWallets] = useState<PlatformWallet[]>(DEFAULT_WALLET_LIST);
  const [editingWallet, setEditingWallet] = useState<number | null>(null);
  const [walletForm, setWalletForm] = useState({ network: '', label: '', address: '' });

  useEffect(() => {
    async function fetchWallets() {
      try {
        const { data } = await supabase.from('platform_wallets').select('*');
        if (data && data.length > 0) setWallets(data as PlatformWallet[]);
      } catch { /* use defaults */ }
    }
    fetchWallets();
  }, []);

  const { users: allUsers, deposits, withdrawals, accruals, referrals, refresh, loading } = useData();

  if (!user || !isAdmin || loading) {
    return (
      <div className="page-section text-center">
        <Shield size={40} className="text-brand-error mx-auto mb-4" />
        <h1 className="font-display text-3xl tracking-wider text-brand-error">ACCESO DENEGADO</h1>
        <p className="font-mono text-xs text-white/30 mt-2">Solo administradores pueden acceder a este panel</p>
      </div>
    );
  }

  const users = allUsers.filter((u) => u.role === 'user');
  const totalCapital = calculateTotalCapital(users, deposits, withdrawals, accruals);
  const totalAccrued = calculateTotalAccruedInterest(accruals);
  const totalWithdrawn = withdrawals.filter((w) => w.status === 'approved').reduce((s, w) => s + w.amount, 0);

  const pendingDeposits = deposits.filter((d) => d.status === 'pending');
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'pending');

  const approveDeposit = async (id: string) => { 
    await api.updateDepositStatus(id, 'confirmed'); 
    await refresh();
    toast('Deposito confirmado', 'success'); 
  };
  const rejectDeposit = async (id: string) => { 
    await api.updateDepositStatus(id, 'rejected'); 
    await refresh();
    toast('Deposito rechazado', 'error'); 
  };
  const approveWithdrawal = async (id: string) => { 
    await api.updateWithdrawalStatus(id, 'approved'); 
    await refresh();
    toast('Retiro aprobado', 'success'); 
  };
  const rejectWithdrawal = async (id: string) => { 
    await api.updateWithdrawalStatus(id, 'rejected'); 
    await refresh();
    toast('Retiro rechazado', 'error'); 
  };

  // Referral stats
  const referralStats = users.map(u => {
    const userRefs = referrals.filter(r => r.referrerId === u.id);
    const totalCommission = userRefs.reduce((s, r) => s + r.commission, 0);
    return { ...u, referralCount: userRefs.length, totalCommission };
  }).sort((a, b) => b.referralCount - a.referralCount);

  const handleSaveWallet = async (idx: number) => {
    const w = wallets[idx];
    try {
      if (w.id) {
        await supabase.from('platform_wallets').update({ address: w.address, label: w.label, is_active: w.is_active }).eq('id', w.id);
      } else {
        const { data } = await supabase.from('platform_wallets').insert({ network: w.network, address: w.address, label: w.label, is_active: w.is_active }).select();
        if (data && data[0]) wallets[idx] = data[0] as PlatformWallet;
      }
      toast('Wallet actualizada', 'success');
    } catch {
      toast('Error al guardar wallet', 'error');
    }
    setEditingWallet(null);
  };

  const handleToggleWallet = (idx: number) => {
    const updated = [...wallets];
    updated[idx] = { ...updated[idx], is_active: !updated[idx].is_active };
    setWallets(updated);
  };

  const handleAddWallet = () => {
    if (!walletForm.network || !walletForm.address) { toast('Complete todos los campos', 'error'); return; }
    const newWallet: PlatformWallet = { network: walletForm.network, label: walletForm.label || walletForm.network, address: walletForm.address, is_active: true };
    setWallets([...wallets, newWallet]);
    setWalletForm({ network: '', label: '', address: '' });
    toast('Wallet agregada', 'success');
  };

  const metrics = [
    { label: 'Usuarios', value: users.length, icon: Users, color: 'text-brand-navy', bg: 'bg-brand-navy/15' },
    { label: 'Capital', value: `USDT ${fmt(totalCapital)}`, icon: DollarSign, color: 'text-brand-orange', bg: 'bg-brand-orange/10' },
    { label: 'Interes Generado', value: `USDT ${fmt(totalAccrued)}`, icon: TrendingUp, color: 'text-brand-success', bg: 'bg-brand-success/10' },
    { label: 'Retiros', value: `USDT ${fmt(totalWithdrawn)}`, icon: ArrowDownRight, color: 'text-brand-gold', bg: 'bg-brand-gold/10' },
  ];

  const tabs = [
    { key: 'overview' as const, label: 'Resumen', icon: BarChart3 },
    { key: 'users' as const, label: 'Usuarios', icon: Users },
    { key: 'wallets' as const, label: 'Wallets', icon: Wallet },
    { key: 'referrals' as const, label: 'Referidos', icon: Award },
  ];

  return (
    <div className="page-section">
      <div className="section-label">Panel de Control</div>
      <h1 className="font-display text-3xl sm:text-4xl tracking-wider text-white mb-6">ADMINISTRACION</h1>

      {/* Tab selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setSection(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs tracking-wider transition-all ${
                section === t.key ? 'bg-brand-orange/15 text-brand-orange border border-brand-orange/30' : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'
              }`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {section === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="glass-card p-4 hover:-translate-y-0.5 transition-all duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-md ${m.bg}`}><Icon size={14} className={m.color} /></div>
                    <span className="font-mono text-[9px] text-white/35 tracking-widest uppercase">{m.label}</span>
                  </div>
                  <div className={`font-display text-2xl ${m.color}`}>{m.value}</div>
                </div>
              );
            })}
          </div>

          {/* Pending Deposits */}
          <div className="glass-card p-5 mb-6 border-l-4 border-brand-gold">
            <h3 className="font-display text-lg tracking-wider text-white mb-3">DEPOSITOS PENDIENTES ({pendingDeposits.length})</h3>
            {pendingDeposits.length === 0 ? (
              <p className="font-mono text-xs text-white/20">No hay depositos pendientes</p>
            ) : (
              <div className="space-y-2">
                {pendingDeposits.map((d) => {
                  const u = storage.getUsers().find((x) => x.id === d.userId);
                  return (
                    <div key={d.id} className="flex items-center justify-between bg-brand-dark/40 rounded-lg px-4 py-3">
                      <div>
                        <span className="font-mono text-sm text-white/60">{d.amount.toLocaleString()} USDT</span>
                        <span className="font-mono text-[10px] text-white/25 ml-2">via {d.network}</span>
                        <span className="font-mono text-[10px] text-white/25 ml-2">- {u?.fullName || 'Desconocido'}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => approveDeposit(d.id)} className="p-1.5 rounded-md bg-brand-success/20 text-brand-success hover:bg-brand-success/30 transition"><Check size={14} /></button>
                        <button onClick={() => rejectDeposit(d.id)} className="p-1.5 rounded-md bg-brand-error/20 text-brand-error hover:bg-brand-error/30 transition"><X size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Withdrawals */}
          <div className="glass-card p-5 border-l-4 border-brand-navy">
            <h3 className="font-display text-lg tracking-wider text-white mb-3">RETIROS PENDIENTES ({pendingWithdrawals.length})</h3>
            {pendingWithdrawals.length === 0 ? (
              <p className="font-mono text-xs text-white/20">No hay retiros pendientes</p>
            ) : (
              <div className="space-y-2">
                {pendingWithdrawals.map((w) => {
                  const u = storage.getUsers().find((x) => x.id === w.userId);
                  return (
                    <div key={w.id} className="flex items-center justify-between bg-brand-dark/40 rounded-lg px-4 py-3">
                      <div>
                        <span className="font-mono text-sm text-white/60">{w.amount.toLocaleString()} USDT</span>
                        <span className="font-mono text-[10px] text-white/25 ml-2">via {w.network}</span>
                        <span className="font-mono text-[10px] text-white/25 ml-2">- {u?.fullName || 'Desconocido'}</span>
                        <span className="font-mono text-[10px] text-white/20 ml-2">{w.walletAddress}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => approveWithdrawal(w.id)} className="p-1.5 rounded-md bg-brand-success/20 text-brand-success hover:bg-brand-success/30 transition"><Check size={14} /></button>
                        <button onClick={() => rejectWithdrawal(w.id)} className="p-1.5 rounded-md bg-brand-error/20 text-brand-error hover:bg-brand-error/30 transition"><X size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {section === 'users' && (
        <div className="glass-card p-5">
          <h3 className="font-display text-lg tracking-wider text-white mb-4">USUARIOS REGISTRADOS</h3>
          {users.length === 0 ? (
            <p className="font-mono text-xs text-white/20">No hay usuarios registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th className="text-left font-mono text-[9px] text-white/30 tracking-widest uppercase pb-3 px-2">Nombre</th>
                    <th className="text-left font-mono text-[9px] text-white/30 tracking-widest uppercase pb-3 px-2">Email</th>
                    <th className="text-left font-mono text-[9px] text-white/30 tracking-widest uppercase pb-3 px-2">Pais</th>
                    <th className="text-right font-mono text-[9px] text-white/30 tracking-widest uppercase pb-3 px-2">Capital</th>
                    <th className="text-center font-mono text-[9px] text-white/30 tracking-widest uppercase pb-3 px-2">Nivel</th>
                    <th className="text-left font-mono text-[9px] text-white/30 tracking-widest uppercase pb-3 px-2">Codigo Ref</th>
                    <th className="text-left font-mono text-[9px] text-white/30 tracking-widest uppercase pb-3 px-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const cap = storage.getUserCapital(u.id);
                    const lvl = getUserLevel(cap);
                    return (
                      <tr key={u.id} className="border-b border-brand-border/50 hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-2 font-mono text-xs text-white/60">{u.fullName}</td>
                        <td className="py-3 px-2 font-mono text-xs text-white/40">{u.email}</td>
                        <td className="py-3 px-2 font-mono text-xs text-white/40">{u.country}</td>
                        <td className="py-3 px-2 font-mono text-xs text-right text-brand-orange">{fmt(cap)} USDT</td>
                        <td className="py-3 px-2 text-center">
                          <span className="badge text-[9px]" style={{ backgroundColor: lvl.color + '15', color: lvl.color, border: `1px solid ${lvl.color}30` }}>
                            {lvl.label}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-mono text-xs text-white/30">{u.referralCode}</td>
                        <td className="py-3 px-2 font-mono text-xs text-white/30">{new Date(u.createdAt).toLocaleDateString('es')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {section === 'wallets' && (
        <div className="space-y-5">
          {/* Add wallet form */}
          <div className="glass-card p-5">
            <h3 className="font-display text-lg tracking-wider text-white mb-4">AGREGAR WALLET</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="input-label">Red</label>
                <input value={walletForm.network} onChange={(e) => setWalletForm(f => ({ ...f, network: e.target.value }))} className="input-field" placeholder="TRC20" />
              </div>
              <div>
                <label className="input-label">Label</label>
                <input value={walletForm.label} onChange={(e) => setWalletForm(f => ({ ...f, label: e.target.value }))} className="input-field" placeholder="USDT TRC20" />
              </div>
              <div>
                <label className="input-label">Direccion</label>
                <input value={walletForm.address} onChange={(e) => setWalletForm(f => ({ ...f, address: e.target.value }))} className="input-field" placeholder="T..." />
              </div>
            </div>
            <button onClick={handleAddWallet} className="btn-primary flex items-center gap-2">
              <Wallet size={14} /> Agregar Wallet
            </button>
          </div>

          {/* Wallet list */}
          <div className="glass-card p-5">
            <h3 className="font-display text-lg tracking-wider text-white mb-4">WALLETS DE LA PLATAFORMA</h3>
            <div className="space-y-3">
              {wallets.map((w, idx) => (
                <div key={w.network + idx} className="flex items-center justify-between bg-brand-dark/40 rounded-lg px-4 py-3 gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-brand-orange">{w.network}</span>
                      <span className={`badge text-[9px] ${w.is_active ? 'badge-success' : 'badge-error'}`}>
                        {w.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-white/40">{w.label}</p>
                    <p className="font-mono text-xs text-white/25 break-all">{w.address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggleWallet(idx)}
                      className={`p-1.5 rounded-md transition ${w.is_active ? 'bg-brand-success/20 text-brand-success hover:bg-brand-success/30' : 'bg-brand-error/20 text-brand-error hover:bg-brand-error/30'}`}
                    >
                      {w.is_active ? <Check size={14} /> : <X size={14} />}
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(w.address); toast('Direccion copiada', 'success'); }}
                      className="p-1.5 rounded-md bg-white/5 text-white/40 hover:text-white/70 transition"
                    >
                      <Copy size={14} />
                    </button>
                    <button onClick={() => handleSaveWallet(idx)}
                      className="btn-primary text-[10px] px-3 py-1.5"
                    >
                      GUARDAR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {section === 'referrals' && (
        <div className="glass-card p-5">
          <h3 className="font-display text-lg tracking-wider text-white mb-4">RANKING DE REFERIDOS</h3>
          {referralStats.length === 0 ? (
            <p className="font-mono text-xs text-white/20">No hay datos de referidos</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th className="text-left font-mono text-[9px] text-white/30 tracking-widest uppercase pb-3 px-2">Usuario</th>
                    <th className="text-center font-mono text-[9px] text-white/30 tracking-widest uppercase pb-3 px-2">Codigo</th>
                    <th className="text-center font-mono text-[9px] text-white/30 tracking-widest uppercase pb-3 px-2">Referidos</th>
                    <th className="text-right font-mono text-[9px] text-white/30 tracking-widest uppercase pb-3 px-2">Comisiones</th>
                  </tr>
                </thead>
                <tbody>
                  {referralStats.filter(u => u.referralCount > 0 || u.referralCode).map((u, idx) => (
                    <tr key={u.id} className="border-b border-brand-border/50 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-2 font-mono text-xs text-white/60">
                        <span className="text-brand-orange mr-2">#{idx + 1}</span>
                        {u.fullName}
                      </td>
                      <td className="py-3 px-2 font-mono text-xs text-center text-white/40">{u.referralCode}</td>
                      <td className="py-3 px-2 font-mono text-xs text-center text-brand-success">{u.referralCount}</td>
                      <td className="py-3 px-2 font-mono text-xs text-right text-brand-gold">{fmt(u.totalCommission)} USDT</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
