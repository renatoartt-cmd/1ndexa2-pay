import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import * as api from '../lib/api';
import type { User, Deposit, Transaction, Withdrawal, DailyAccrual, Referral } from '../lib/types';
import { useAuth } from './useAuth';

interface DataState {
  users: User[];
  deposits: Deposit[];
  transactions: Transaction[];
  withdrawals: Withdrawal[];
  accruals: DailyAccrual[];
  referrals: Referral[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Omit<DataState, 'loading' | 'refresh'>>({
    users: [], deposits: [], transactions: [], withdrawals: [], accruals: [], referrals: []
  });

  const refresh = async () => {
    try {
      const [users, deposits, transactions, withdrawals, accruals, referrals] = await Promise.all([
        api.fetchUsers(),
        api.fetchDeposits(),
        api.fetchTransactions(),
        api.fetchWithdrawals(),
        api.fetchAccruals(),
        api.fetchReferrals()
      ]);
      setData({ users, deposits, transactions, withdrawals, accruals, referrals });
    } catch (e) {
      console.error('Failed to load data from Supabase', e);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  return (
    <DataContext.Provider value={{ ...data, loading, refresh }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
