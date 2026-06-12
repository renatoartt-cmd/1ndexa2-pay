import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { Page } from '../lib/types';
import { Eye, EyeOff, Lock, Mail, TrendingUp, Shield, Zap } from 'lucide-react';

export default function LoginPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const result = await login(email.trim(), password);
    if (!result) setError('Credenciales incorrectas. Verifica tu email y contraseña.');
    setLoading(false);
  }

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl text-white tracking-wide mb-1">Iniciar Sesión</h2>
        <p className="font-sans text-sm text-white/40">Accede a tu plataforma de inversión</p>
      </div>

      <div className="flex items-center justify-center gap-2 mb-7 flex-wrap">
        {[{ icon: TrendingUp, label: '0.0986% Diario' }, { icon: Shield, label: 'Seguro' }, { icon: Zap, label: '~3% Mensual' }].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 bg-brand-navy/30 border border-brand-border rounded-full px-3 py-1">
            <Icon size={10} className="text-brand-orange" />
            <span className="font-mono text-[10px] text-white/50 tracking-wider">{label}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="input-label">Email</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="input-field pl-10" placeholder="tu@email.com" required />
          </div>
        </div>
        <div>
          <label className="input-label">Contraseña</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
            <input type={showPassword ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)} className="input-field pl-10 pr-10" placeholder="••••••••" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-brand-error/10 border border-brand-error/20 rounded-lg px-4 py-3 animate-slide-down">
            <p className="font-mono text-xs text-brand-error">{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Lock size={14} />Ingresar</>}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="font-mono text-xs text-white/30">
          ¿No tienes cuenta?{' '}
          <button onClick={() => onNavigate('register')} className="text-brand-orange hover:text-brand-orange-light transition-colors font-bold">
            Crear cuenta gratis
          </button>
        </p>
      </div>

      <div className="mt-6 border border-brand-border rounded-xl p-4 bg-brand-surface/40">
        <p className="font-mono text-[10px] text-white/25 tracking-widest uppercase text-center mb-3">Acceso Demo</p>
        <div className="space-y-2">
          {[
            { email: 'carlos@demo.com', password: 'Demo123!', badge: 'Usuario', badgeClass: 'badge-success' },
            { email: 'admin@1ndexa2.com', password: 'Admin123!', badge: 'Admin', badgeClass: 'badge-orange' },
          ].map(cred => (
            <button key={cred.email} onClick={() => { setEmail(cred.email); setPassword(cred.password); }}
              className="w-full text-left flex items-center justify-between bg-brand-card hover:bg-brand-surface border border-brand-border rounded-lg px-3 py-2.5 transition-colors group">
              <div>
                <p className="font-mono text-xs text-white/50 group-hover:text-white/80 transition-colors">{cred.email}</p>
                <p className="font-mono text-[10px] text-white/20">{cred.password}</p>
              </div>
              <span className={`badge ${cred.badgeClass}`}>{cred.badge}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
