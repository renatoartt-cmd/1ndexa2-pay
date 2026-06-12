import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User } from '../lib/types';
import * as api from '../lib/api';

interface AuthState {
  user: User | null;
  login: (email: string, password: string) => Promise<User | null>;
  register: (data: Omit<User, 'id' | 'role' | 'referralCode' | 'createdAt'>) => Promise<User | null>;
  logout: () => void;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

function generateReferralCode(name: string): string {
  const base = name.replace(/\s+/g, '').slice(0, 4).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${rand}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for persisted session
    const saved = localStorage.getItem('ix2_session');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('ix2_session');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User | null> => {
    try {
      const users = await api.fetchUsers();
      const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!found || found.password !== password) return null;
      setUser(found);
      localStorage.setItem('ix2_session', JSON.stringify(found));
      return found;
    } catch (e) {
      console.error(e);
      return null;
    }
  }, []);

  const register = useCallback(
    async (data: Omit<User, 'id' | 'role' | 'referralCode' | 'createdAt'>): Promise<User | null> => {
      try {
        const users = await api.fetchUsers();
        if (users.find(u => u.email.toLowerCase() === data.email.toLowerCase())) return null;
        
        let referrer: User | undefined;
        if (data.referredBy) {
          referrer = users.find(u => u.referralCode === data.referredBy);
          if (!referrer) return null;
        }

        const newUser = await api.createUser({
          ...data,
          role: data.email.toLowerCase() === 'admin@1ndexa2.com' ? 'admin' : 'user',
          referralCode: generateReferralCode(data.fullName)
        });

        if (referrer) {
          await api.createReferral({ referrerId: referrer.id, referredUserId: newUser.id, commission: 0 });
        }

        setUser(newUser);
        localStorage.setItem('ix2_session', JSON.stringify(newUser));
        return newUser;
      } catch (e) {
        console.error(e);
        return null;
      }
    },
    [],
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('ix2_session');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAdmin: user?.role === 'admin', loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
