import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../hooks/useAuth';
import { toast } from '../hooks/useToast';
import { useData } from '../hooks/useData';
import * as api from '../lib/api';
import { calculateUserCapital, getUserDaysActive, getUserWithdrawnInterest } from '../lib/calculations';
import { supabase } from '../lib/supabase';
import { DAILY_RATE, getUserLevel } from '../lib/simulator';
import { Wallet, Copy, Check, Link2, ArrowDownRight, Shield, Coins } from 'lucide-react';
import type { Deposit, NetworkType, Withdrawal } from '../lib/types';

interface PlatformWallet {
  id: string;
  network: string;
  address: string;
  label: string;
  is_active: boolean;
}

const DEFAULT_WALLETS: { network: NetworkType; label: string; address: string }[] = [
  { network: 'TRC20', label: 'USDT TRC20 (Tron)', address: 'TMUN9uXMMtCMDTesftabfgxiJvsgtSz4PR' },
  { network: 'BEP20', label: 'USDT BEP20 (BNB Chain)', address: '0x79c3989750ec3fd9ec270ca4e54f79568820631f' },
  { network: 'ERC20', label: 'USDC ERC20 (Ethereum)', address: '0x79c3989750ec3fd9ec270ca4e54f79568820631f' },
  { network: 'POL', label: 'USDT POL (Polygon)', address: '0x79c3989750ec3fd9ec270ca4e54f79568820631f' },
  { network: 'BTC', label: 'Bitcoin (BTC)', address: 'bc1qxxxxxxxxxxxxxxxxxxxxxxxxx' },
  { network: 'ETH', label: 'Ethereum (ETH)', address: '0x79c3989750ec3fd9ec270ca4e54f79568820631f' },
  { network: 'BinancePay', label: 'Binance Pay UID', address: '39473910' },
];

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function WalletPage() {
  const { user } = useAuth();
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkType>('TRC20');
  const [copied, setCopied] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNetwork, setDepositNetwork] = useState<NetworkType>('TRC20');
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNetwork, setWithdrawNetwork] = useState<NetworkType>('TRC20');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawType, setWithdrawType] = useState<'capital' | 'interest'>('interest');
  const [platformWallets, setPlatformWallets] = useState<PlatformWallet[]>([]);
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');

  useEffect(() => {
    async function fetchWallets() {
      try {
        const { data } = await supabase.from('platform_wallets').select('*').eq('is_active', true);
        if (data && data.length > 0) {
          setPlatformWallets(data as PlatformWallet[]);
        }
      } catch {
        // Fallback to defaults
      }
    }
    fetchWallets();
  }, []);

  const { deposits, withdrawals, accruals, refresh, loading } = useData();

  if (!user || loading) return null;

  const wallets = platformWallets.length > 0
    ? platformWallets.map(w => ({ network: w.network as NetworkType, label: w.label, address: w.address }))
    : DEFAULT_WALLETS;

  const activeWallets = wallets.filter(w => DEFAULT_WALLETS.some(d => d.network === w.network));

  const networkInfo = activeWallets.find((n) => n.network === selectedNetwork) ?? activeWallets[0];

  const capital = calculateUserCapital(user.id, deposits, withdrawals, accruals);
  const level = getUserLevel(capital);
  const daysActive = getUserDaysActive(user.id, deposits);
  
  // Intereses generados sobre el capital actual
  const currentValue = capital * Math.pow(1 + DAILY_RATE, daysActive);
  const totalAccruedInterest = currentValue - capital;
  const withdrawnInterest = getUserWithdrawnInterest(user.id, withdrawals);
  const availableInterest = Math.max(0, totalAccruedInterest - withdrawnInterest);
  const availableCapital = capital;

  const handleCopy = () => {
    navigator.clipboard.writeText(networkInfo.address).then(() => {
      setCopied(true);
      toast('Direccion copiada al portapapeles', 'success');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDeposit = async () => {
    const amount = Number(depositAmount);
    if (!amount || amount <= 0) { toast('Ingrese un monto valido', 'error'); return; }
    if (capital + amount > 1000) { 
        toast(`Límite de depósito excedido. El máximo permitido es 1,000 USDT. Tienes ${fmt(capital)} USDT activos.`, 'error'); 
        return; 
    }
    
    // We should create a transaction in the backend too, but for simplicity we rely on api.ts inserting both, wait...
    // api.createDeposit doesn't create transaction! We need to create it!
    await api.createDeposit({ userId: user.id, amount, network: depositNetwork });
    await api.createTransaction({ userId: user.id, type: 'deposit', amount, description: `Depósito ${depositNetwork}`, status: 'pending' });
    await refresh();
    
    toast(`Deposito de ${amount} USDT registrado. Pendiente de confirmacion.`, 'success');
    setDepositAmount('');
  };

  const handleWithdrawal = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) { toast('Ingrese un monto valido', 'error'); return; }
    
    if (withdrawType === 'interest') {
        const minWithdrawal = capital * 0.01; // 1% del capital
        if (amount < minWithdrawal) {
            toast(`El retiro mínimo de ganancias es del 1% de tu capital (${fmt(minWithdrawal)} USDT).`, 'error');
            return;
        }
        if (amount > availableInterest) {
            toast(`Saldo de ganancias insuficiente. Disponible: ${fmt(availableInterest)} USDT`, 'error');
            return;
        }
    } else {
        if (amount > availableCapital) {
            toast(`Saldo de capital insuficiente. Disponible: ${fmt(availableCapital)} USDT`, 'error');
            return;
        }
    }

    if (!withdrawAddress.trim()) { toast('Ingrese la direccion de retiro', 'error'); return; }
    
    await api.createWithdrawal({ userId: user.id, type: withdrawType, amount, network: withdrawNetwork, address: withdrawAddress.trim() });
    await api.createTransaction({ userId: user.id, type: 'withdrawal', withdrawType: withdrawType, amount, description: `Retiro ${withdrawNetwork} (${withdrawType === 'capital' ? 'Reembolso' : 'Ganancias'})`, status: 'pending' });
    await refresh();
    
    toast(`Retiro de ${amount} USDT (${withdrawType === 'capital' ? 'Reembolso' : 'Ganancias'}) solicitado.`, 'success');
    setWithdrawAmount('');
    setWithdrawAddress('');
    setShowWithdrawal(false);
  };

  const userDeposits = deposits.filter(d => d.userId === user.id);
  const userWithdrawals = withdrawals.filter(w => w.userId === user.id);

  return (
    <div className="page-section">
      <div className="section-label">Depositos y Retiros</div>
      <h1 className="font-display text-3xl sm:text-4xl tracking-wider text-white mb-8">
        WALLET
      </h1>

      {/* Balance card */}
      <div className="glass-card p-5 mb-6 border-l-4 border-brand-orange">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="font-mono text-[10px] text-white/30 tracking-widest uppercase">Capital Activo</div>
            <div className="font-display text-xl text-white">{fmt(capital)} USDT</div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-white/30 tracking-widest uppercase">Ganancias Disp.</div>
            <div className="font-display text-xl text-brand-success">{fmt(availableInterest)} USDT</div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-white/30 tracking-widest uppercase">Total Acumulado</div>
            <div className="font-display text-xl text-brand-orange">{fmt(capital + availableInterest)} USDT</div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-white/30 tracking-widest uppercase">Nivel</div>
            <div className="font-display text-xl" style={{ color: level.color }}>{level.label}</div>
          </div>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('deposit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs tracking-wider transition-all ${
            tab === 'deposit' ? 'bg-brand-orange text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
          }`}
        >
          <Coins size={14} /> DEPOSITAR
        </button>
        <button
          onClick={() => setTab('withdraw')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs tracking-wider transition-all ${
            tab === 'withdraw' ? 'bg-brand-success text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
          }`}
        >
          <ArrowDownRight size={14} /> RETIRAR
        </button>
      </div>

      {tab === 'deposit' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR & Address */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <Wallet size={18} className="text-brand-orange" />
              <h3 className="font-display text-lg tracking-wider text-white">DEPOSITAR USDT</h3>
            </div>

            {/* Network selector */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-5">
              {activeWallets.map((n) => (
                <button
                  key={n.network}
                  onClick={() => setSelectedNetwork(n.network)}
                  className={`py-2 rounded-md font-mono text-[10px] tracking-wider transition-all ${
                    selectedNetwork === n.network
                      ? 'bg-brand-orange text-white'
                      : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  {n.network === 'BinancePay' ? 'BPay' : n.network}
                </button>
              ))}
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-5">
              <div className="bg-white p-3 rounded-xl">
                <QRCodeSVG
                  value={networkInfo.address}
                  size={160}
                  bgColor="#ffffff"
                  fgColor="#0C1525"
                  level="H"
                />
              </div>
            </div>

            {/* Address */}
            <div className="bg-brand-dark/60 border border-brand-border rounded-lg p-4 mb-4">
              <p className="font-mono text-[10px] text-white/35 tracking-widest uppercase mb-1.5">
                Direccion {networkInfo.label}
              </p>
              <p className="font-mono text-xs text-white/70 break-all">{networkInfo.address}</p>
            </div>

            <button
              onClick={handleCopy}
              className="btn-outline w-full flex items-center justify-center gap-2"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'COPIADO!' : 'COPIAR DIRECCION'}
            </button>

            {networkInfo.network === 'BinancePay' && (
              <div className="mt-4 bg-brand-orange/5 border border-brand-orange/20 rounded-lg p-3">
                <p className="font-mono text-[10px] text-brand-orange">
                  Binance Pay UID: {networkInfo.address} - Envie USDT via Binance Pay a este ID
                </p>
              </div>
            )}
          </div>

          {/* Register deposit */}
          <div className="space-y-5">
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <Link2 size={18} className="text-brand-success" />
                <h3 className="font-display text-lg tracking-wider text-white">REGISTRAR DEPOSITO</h3>
              </div>

              <p className="font-mono text-xs text-white/35 mb-5">
                Registre su deposito para que sea confirmado por el administrador.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="input-label">Monto (USDT)</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="input-field"
                    placeholder="1000"
                    min={1}
                  />
                </div>

                <div>
                  <label className="input-label">Red</label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {activeWallets.map((n) => (
                      <button
                        key={n.network}
                        onClick={() => setDepositNetwork(n.network)}
                        className={`py-2 rounded-md font-mono text-[10px] tracking-wider transition-all ${
                          depositNetwork === n.network
                            ? 'bg-brand-success text-white'
                            : 'bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        {n.network === 'BinancePay' ? 'BPay' : n.network}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleDeposit} className="btn-green w-full flex items-center justify-center gap-2">
                  REGISTRAR DEPOSITO
                </button>
              </div>
            </div>

            {/* My deposits */}
            <div className="glass-card p-5">
              <h4 className="font-mono text-[10px] text-white/35 tracking-widest uppercase mb-3">MIS DEPOSITOS</h4>
              {userDeposits.length === 0 ? (
                <p className="font-mono text-xs text-white/20">No hay depositos registrados</p>
              ) : (
                <div className="space-y-2">
                  {userDeposits.slice(-5).reverse().map((d) => (
                    <div key={d.id} className="flex items-center justify-between bg-brand-dark/40 rounded-lg px-4 py-2.5">
                      <div>
                        <span className="font-mono text-xs text-white/60">{d.amount.toLocaleString()} USDT</span>
                        <span className="font-mono text-[10px] text-white/25 ml-2">via {d.network}</span>
                      </div>
                      <span className={`badge text-[9px] ${
                        d.status === 'confirmed' ? 'badge-success' : d.status === 'rejected' ? 'badge-error' : 'badge-gold'
                      }`}>
                        {d.status === 'confirmed' ? 'Confirmado' : d.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Withdrawal form */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <ArrowDownRight size={18} className="text-brand-gold" />
              <h3 className="font-display text-lg tracking-wider text-white">SOLICITAR RETIRO</h3>
            </div>

            <div className="flex gap-2 mb-5">
              <button
                onClick={() => setWithdrawType('interest')}
                className={`flex-1 py-2 rounded-md font-mono text-xs tracking-wider transition-all border ${
                  withdrawType === 'interest'
                    ? 'bg-brand-success/20 border-brand-success text-brand-success'
                    : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'
                }`}
              >
                GANANCIAS
              </button>
              <button
                onClick={() => setWithdrawType('capital')}
                className={`flex-1 py-2 rounded-md font-mono text-xs tracking-wider transition-all border ${
                  withdrawType === 'capital'
                    ? 'bg-brand-gold/20 border-brand-gold text-brand-gold'
                    : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'
                }`}
              >
                REEMBOLSO DE CAPITAL
              </button>
            </div>

            <div className="bg-brand-gold/5 border border-brand-gold/20 rounded-lg p-4 mb-5 space-y-2">
              <p className="font-mono text-[10px] text-brand-gold flex items-center gap-2">
                <Shield size={12} />
                Saldo disponible: {fmt(withdrawType === 'interest' ? availableInterest : availableCapital)} USDT
              </p>
              {withdrawType === 'interest' && (
                <p className="font-mono text-[9px] text-brand-gold/60">
                  * El retiro mínimo de ganancias es el 1% de tu capital actual ({fmt(capital * 0.01)} USDT).
                </p>
              )}
              {withdrawType === 'capital' && (
                <p className="font-mono text-[9px] text-brand-gold/60">
                  * Retirar capital (Reembolso) afectará el balance base y reiniciará tu ciclo proporcional de ganancias sobre el nuevo saldo.
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="input-label">Monto (USDT)</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="input-field"
                  placeholder="100"
                  min={1}
                  max={withdrawType === 'interest' ? availableInterest : availableCapital}
                />
              </div>

              <div>
                <label className="input-label">Red de Retiro</label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {activeWallets.filter(w => w.network !== 'BinancePay').map((n) => (
                    <button
                      key={n.network}
                      onClick={() => setWithdrawNetwork(n.network)}
                      className={`py-2 rounded-md font-mono text-[10px] tracking-wider transition-all ${
                        withdrawNetwork === n.network
                          ? 'bg-brand-gold text-black'
                          : 'bg-white/5 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      {n.network}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="input-label">Direccion de Retiro</label>
                <input
                  type="text"
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  className="input-field"
                  placeholder="0x... o T..."
                />
              </div>

              <button onClick={handleWithdrawal} className="btn-primary w-full flex items-center justify-center gap-2">
                SOLICITAR RETIRO
              </button>
            </div>
          </div>

          {/* Withdrawal history */}
          <div className="glass-card p-5">
            <h4 className="font-mono text-[10px] text-white/35 tracking-widest uppercase mb-3">MIS RETIROS</h4>
            {userWithdrawals.length === 0 ? (
              <p className="font-mono text-xs text-white/20">No hay retiros registrados</p>
            ) : (
              <div className="space-y-2">
                {userWithdrawals.slice(-5).reverse().map((w) => (
                  <div key={w.id} className="flex items-center justify-between bg-brand-dark/40 rounded-lg px-4 py-2.5">
                    <div>
                      <span className="font-mono text-xs text-white/60">{w.amount.toLocaleString()} USDT</span>
                      <span className="font-mono text-[10px] text-white/25 ml-2">via {w.network}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`badge text-[8px] ${w.type === 'capital' ? 'badge-gold' : 'badge-success'}`}>
                        {w.type === 'capital' ? 'CAPITAL' : 'INTERES'}
                      </span>
                      <span className={`badge text-[9px] ${
                        w.status === 'approved' ? 'badge-success' : w.status === 'rejected' ? 'badge-error' : 'badge-gold'
                      }`}>
                        {w.status === 'approved' ? 'Aprobado' : w.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
