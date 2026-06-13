export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  password: string;
  role: 'user' | 'admin';
  referralCode: string;
  referredBy?: string;
  createdAt: string;
}

export type NetworkType = 'TRC20' | 'BEP20' | 'ERC20' | 'POL' | 'BTC' | 'ETH' | 'BinancePay';

export interface TradingAccount {
  id: string;
  userId: string;
  broker: string;
  server: string;
  accountNumber: string;
  password?: string;
  platform: 'MT4' | 'MT5';
  riskType: 'multiplier' | 'fixed_lot' | 'proportional';
  riskValue: number;
  status: 'pending' | 'connected' | 'disconnected' | 'error';
  createdAt: string;
}

export interface Deposit {
  id: string;
  userId: string;
  amount: number;
  network: NetworkType;
  txHash?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  type: 'capital' | 'interest';
  amount: number;
  network: NetworkType;
  walletAddress: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface DailyAccrual {
  id: string;
  userId: string;
  capital: number;
  rate: number;
  interest: number;
  date: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'accrual';
  withdrawType?: 'capital' | 'interest';
  amount: number;
  network?: NetworkType;
  description?: string;
  status: 'pending' | 'confirmed' | 'approved' | 'rejected' | 'paid';
  createdAt: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  commission: number;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isActive: boolean;
  licenseData: string; // The secret to be revealed
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  productId: string;
  amount: number;
  paymentMethod: 'balance' | 'external';
  status: 'pending' | 'completed' | 'cancelled';
  licenseDataRevealed?: string;
  createdAt: string;
}

export interface Trade {
  id: string;
  ticket: string;
  symbol: string;
  type: 'buy' | 'sell' | 'balance';
  volume: number;
  openPrice: number;
  closePrice: number;
  profit: number;
  openTime: string;
  closeTime: string;
  createdAt: string;
}

export type UserLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface LevelConfig {
  level: UserLevel;
  label: string;
  minCapital: number;
  maxCapital: number;
  referralMatchPercent: number;
  color: string;
}

export interface SimulationParams {
  capital: number;
  months: number;
  monthlyContribution: number;
  mode: 'withdrawal' | 'compound';
}

export interface DayData {
  day: number;
  capital: number;
  dailyGain: number;
  accumulatedGain: number;
}

export interface SimulationResult {
  capitalInicial: number;
  gananciaTotal: number;
  capitalProyectado: number;
  roiPercent: number;
  dailyRate: number;
  dailyGain: number;
  monthlyGain: number;
  annualGain: number;
  monthlyData: { month: number; capital: number; gain: number; cumulativeGain: number }[];
}

export type Page =
  | 'login'
  | 'register'
  | 'dashboard'
  | 'renta-mixta'
  | 'simulator'
  | 'wallet'
  | 'history'
  | 'referrals'
  | 'admin'
  | 'marketplace'
  | 'copytrading';
