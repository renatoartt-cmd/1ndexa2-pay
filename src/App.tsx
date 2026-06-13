import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useToast } from './hooks/useToast';
import { DataProvider } from './hooks/useData';
import type { Page } from './lib/types';
import ToastContainer from './components/ToastContainer';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import RentaMixtaPage from './pages/RentaMixtaPage';
import SimulatorPage from './pages/SimulatorPage';
import WalletPage from './pages/WalletPage';
import HistoryPage from './pages/HistoryPage';
import ReferralsPage from './pages/ReferralsPage';
import AdminPage from './pages/AdminPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { CopytradingPage } from './pages/CopytradingPage';
import {
  X,
  LayoutDashboard,
  TrendingUp,
  Calculator,
  Wallet,
  History,
  Users,
  Shield,
  LogOut,
  Menu,
  ChevronRight,
  ShoppingBag,
  LineChart,
} from 'lucide-react';

const PAY_NAV: { page: Page; label: string; icon: typeof LayoutDashboard; admin?: boolean }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'renta-mixta', label: 'Renta Mixta', icon: TrendingUp },
  { page: 'simulator', label: 'Simulador', icon: Calculator },
  { page: 'wallet', label: 'Depositar', icon: Wallet },
  { page: 'marketplace', label: 'Tienda', icon: ShoppingBag },
  { page: 'copytrading', label: 'Copytrading', icon: LineChart },
  { page: 'history', label: 'Historial', icon: History },
  { page: 'referrals', label: 'Referidos', icon: Users },
  { page: 'admin', label: 'Admin', icon: Shield, admin: true },
];

function Logo() {
  return (
    <div className="flex items-center gap-0.5 font-display text-lg tracking-wider select-none">
      <svg width="24" height="24" viewBox="0 0 40 40" className="shrink-0">
        <circle cx="14" cy="20" r="10" fill="none" stroke="#1D3461" strokeWidth="3" />
        <circle cx="26" cy="20" r="10" fill="none" stroke="#1D3461" strokeWidth="3" />
        <path d="M30 12 L36 6" stroke="#F97316" strokeWidth="3" strokeLinecap="round" />
        <path d="M36 6 L36 14" stroke="#F97316" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="text-brand-navy">1ndexa2</span>
      <span className="text-brand-orange ml-0.5">Pay</span>
    </div>
  );
}

function PayPanel() {
  const { user, logout, isAdmin } = useAuth();
  const { toasts, removeToast } = useToast();
  const [page, setPage] = useState<Page>('dashboard');
  const [mobileNav, setMobileNav] = useState(false);

  if (!user) return null;

  const filtered = PAY_NAV.filter((n) => !n.admin || isAdmin);

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage />;
      case 'renta-mixta': return <RentaMixtaPage />;
      case 'simulator': return <SimulatorPage />;
      case 'wallet': return <WalletPage />;
      case 'history': return <HistoryPage />;
      case 'referrals': return <ReferralsPage />;
      case 'marketplace': return <MarketplacePage />;
      case 'copytrading': return <CopytradingPage />;
      case 'admin': return <AdminPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-dark">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border bg-brand-surface/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="font-mono text-[9px] text-white/20 tracking-widest uppercase hidden sm:inline">
            Renta Diaria Compuesta
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-white/40 hidden sm:inline">{user.fullName}</span>
          <button
            onClick={logout}
            className="flex items-center gap-1 text-white/30 hover:text-brand-error transition font-mono text-[10px]"
          >
            <LogOut size={12} />
            <span className="hidden sm:inline">Salir</span>
          </button>
          <button className="lg:hidden text-white/60 hover:text-white" onClick={() => setMobileNav(!mobileNav)}>
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* Nav bar */}
      <div className="hidden lg:flex items-center gap-1 px-4 py-2 border-b border-brand-border/50 bg-brand-dark/50 overflow-x-auto">
        {filtered.map((n) => {
          const Icon = n.icon;
          const active = page === n.page;
          return (
            <button
              key={n.page}
              onClick={() => setPage(n.page)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-mono tracking-wider transition-all whitespace-nowrap ${
                active
                  ? 'bg-brand-orange/15 text-brand-orange border border-brand-orange/30'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon size={12} />
              {n.label}
            </button>
          );
        })}
      </div>

      {/* Mobile nav */}
      {mobileNav && (
        <div className="lg:hidden bg-brand-surface border-b border-brand-border/50 px-3 py-2 animate-slide-down">
          {filtered.map((n) => {
            const Icon = n.icon;
            const active = page === n.page;
            return (
              <button
                key={n.page}
                onClick={() => { setPage(n.page); setMobileNav(false); }}
                className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-xs font-mono transition-all mb-1 ${
                  active
                    ? 'bg-brand-orange/15 text-brand-orange'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                <Icon size={14} />
                {n.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {renderPage()}
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

function AppInner() {
  const { user } = useAuth();
  const [payOpen, setPayOpen] = useState(false);
  const [authPage, setAuthPage] = useState<'login' | 'register'>('login');



  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'OPEN_PAY_PANEL') setPayOpen(true);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (user) setPayOpen(true);
  }, [user]);

  const handleLoginNav = useCallback((p: Page) => {
    if (p === 'register') setAuthPage('register');
    else setAuthPage('login');
  }, []);

  const payFullScreen = user && payOpen;

  return (
    <div className="min-h-screen bg-brand-dark relative">
      {/* BankCore iframe */}
      <iframe
        src="/bankcore.html"
        title="BankCore Ecosystem"
        className={`w-full border-0 transition-all duration-500 ${
          payFullScreen ? 'h-0 opacity-0 pointer-events-none overflow-hidden' : 'h-full'
        }`}
        style={payFullScreen ? { minHeight: 0, height: 0 } : { minHeight: '100vh' }}
      />

      {/* Pay panel full screen when logged in */}
      {payOpen && user && (
        <div className="fixed inset-0 z-50 animate-fade-in">
          <PayPanel />
        </div>
      )}

      {/* Pay panel slide-over when not logged in */}
      {payOpen && !user && (
        <div className="fixed top-0 right-0 h-full z-50 animate-slide-in-right shadow-2xl shadow-black/50 w-full sm:w-[45%] min-w-[320px] max-w-[900px]">
          <div className="h-full flex flex-col bg-brand-dark">
            <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border bg-brand-surface/80 backdrop-blur-xl">
              <Logo />
              <button
                onClick={() => setPayOpen(false)}
                className="flex items-center gap-1 text-white/30 hover:text-white transition font-mono text-[10px]"
              >
                <X size={12} />
                Cerrar
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="w-full max-w-md animate-slide-up">
                {authPage === 'register' ? (
                  <RegisterPage onNavigate={handleLoginNav} />
                ) : (
                  <LoginPage onNavigate={handleLoginNav} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile backdrop */}
      {payOpen && !user && (
        <div
          className="sm:hidden fixed inset-0 bg-black/60 z-40 animate-fade-in"
          onClick={() => setPayOpen(false)}
        />
      )}

      {/* Floating toggle button */}
      {!payOpen && (
        <button
          onClick={() => setPayOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-brand-navy hover:bg-brand-navy/80 text-white font-mono text-xs font-bold tracking-wider px-5 py-4 rounded-xl shadow-lg shadow-brand-navy/30 hover:-translate-y-1 transition-all duration-300 animate-fade-in border border-brand-border"
        >
          <ChevronRight size={16} />
          <span className="text-brand-orange">1ndexa2</span> Pay
        </button>
      )}

      {/* Back to BankCore */}
      {payFullScreen && (
        <button
          onClick={() => setPayOpen(false)}
          className="fixed top-4 left-4 z-[55] flex items-center gap-2 bg-black/60 backdrop-blur-md text-white/60 hover:text-white font-mono text-[10px] tracking-wider px-3 py-2 rounded-lg border border-white/10 hover:border-brand-orange/30 transition-all"
        >
          <X size={12} />
          BankCore
        </button>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppInner />
      </DataProvider>
    </AuthProvider>
  );
}
