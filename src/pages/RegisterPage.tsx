import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { Page } from '../lib/types';
import { Eye, EyeOff, User, Mail, Phone, Globe, Lock, UserPlus, Tag } from 'lucide-react';

const COUNTRIES = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Ecuador',
  'El Salvador', 'España', 'Estados Unidos', 'Guatemala', 'Honduras', 'Mexico', 'Nicaragua',
  'Panama', 'Paraguay', 'Peru', 'Puerto Rico', 'Republica Dominicana', 'Uruguay', 'Venezuela',
];

export default function RegisterPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', country: 'Colombia', password: '', confirmPassword: '', referralCode: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    if (form.password.length < 6) { setError('Contraseña debe tener al menos 6 caracteres.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const result = await register({ fullName: form.fullName.trim(), email: form.email.trim(), phone: form.phone.trim(), country: form.country, password: form.password, referredBy: form.referralCode.trim() || undefined });
    if (!result) setError('Este email ya está registrado o el código de referido no es válido.');
    setLoading(false);
  }

  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <h2 className="font-display text-3xl text-white tracking-wide mb-1">Crear Cuenta</h2>
        <p className="font-sans text-sm text-white/40">Únete a la plataforma de rentabilidad diaria</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="input-label">Nombre completo</label>
          <div className="relative">
            <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
            <input name="fullName" value={form.fullName} onChange={handleChange} className="input-field pl-10" placeholder="Juan Pérez" required />
          </div>
        </div>

        <div>
          <label className="input-label">Email</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
            <input name="email" type="email" value={form.email} onChange={handleChange} className="input-field pl-10" placeholder="tu@email.com" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">Teléfono</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
              <input name="phone" type="tel" value={form.phone} onChange={handleChange} className="input-field pl-10" placeholder="+57 300..." />
            </div>
          </div>
          <div>
            <label className="input-label">País</label>
            <div className="relative">
              <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 z-10" />
              <select name="country" value={form.country} onChange={handleChange} className="input-field pl-10 appearance-none">
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">Contraseña</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
              <input name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} className="input-field pl-10 pr-10" placeholder="Mín. 6 caracteres" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60">
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="input-label">Confirmar</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
              <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} className="input-field pl-10" placeholder="Repetir" required />
            </div>
          </div>
        </div>

        <div>
          <label className="input-label">Código de referido (opcional)</label>
          <div className="relative">
            <Tag size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
            <input name="referralCode" value={form.referralCode} onChange={handleChange} className="input-field pl-10" placeholder="Código de tu referidor" />
          </div>
        </div>

        {error && (
          <div className="bg-brand-error/10 border border-brand-error/20 rounded-lg px-4 py-3 animate-slide-down">
            <p className="font-mono text-xs text-brand-error">{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><UserPlus size={14} />Crear mi cuenta</>}
        </button>
      </form>

      <div className="mt-5 text-center">
        <p className="font-mono text-xs text-white/30">
          ¿Ya tienes cuenta?{' '}
          <button onClick={() => onNavigate('login')} className="text-brand-orange hover:text-brand-orange-light transition-colors font-bold">
            Iniciar sesión
          </button>
        </p>
      </div>
    </div>
  );
}
