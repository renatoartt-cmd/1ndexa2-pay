import { supabase } from './supabase';
import type { User, Deposit, Transaction, Withdrawal, DailyAccrual, Referral, Product, Order, Trade } from './types';

// The API file replaces local storage with asynchronous Supabase calls.

// Helpers for camelCase <-> snake_case translation if needed, 
// but we'll assume our Supabase schema matches the type names mostly.
// Actually, in the SQL schema I used snake_case for `user_id`, `full_name`, `referral_code`, `referred_by`, `withdraw_type`, `referrer_id`, `referred_user_id`, `created_at`.
// Let's handle casing mapping here or adjust the types to match Supabase.
// Since React uses camelCase, I will map them.

const mapUser = (d: any): User => ({
  id: d.id, role: d.role, fullName: d.full_name, email: d.email, 
  phone: d.phone, country: d.country, password: d.password, 
  referralCode: d.referral_code, referredBy: d.referred_by, createdAt: d.created_at
});

const mapUserToDb = (u: any) => ({
  role: u.role, full_name: u.fullName, email: u.email, 
  phone: u.phone, country: u.country, password: u.password, 
  referral_code: u.referralCode, referred_by: u.referredBy
});

const mapDeposit = (d: any): Deposit => ({
  id: d.id, userId: d.user_id, amount: Number(d.amount), network: d.network, 
  status: d.status, txHash: d.tx_hash, createdAt: d.created_at
});

const mapTx = (t: any): Transaction => ({
  id: t.id, userId: t.user_id, type: t.type, amount: Number(t.amount), 
  description: t.description, status: t.status, withdrawType: t.withdraw_type, createdAt: t.created_at
});

const mapWithdrawal = (w: any): Withdrawal => ({
  id: w.id, userId: w.user_id, amount: Number(w.amount), network: w.network, 
  address: w.address, status: w.status, type: w.withdraw_type, createdAt: w.created_at
});

const mapAccrual = (a: any): DailyAccrual => ({
  id: a.id, userId: a.user_id, capital: Number(a.capital), rate: Number(a.rate), 
  interest: Number(a.interest), date: a.date, createdAt: a.created_at
});

const mapReferral = (r: any): Referral => ({
  id: r.id, referrerId: r.referrer_id, referredUserId: r.referred_user_id, 
  commission: Number(r.commission), createdAt: r.created_at
});

const mapTrade = (t: any): Trade => ({
  id: t.id, ticket: t.ticket, symbol: t.symbol, type: t.type,
  volume: Number(t.volume), openPrice: Number(t.open_price),
  closePrice: Number(t.close_price), profit: Number(t.profit),
  openTime: t.open_time, closeTime: t.close_time, createdAt: t.created_at
});

export async function fetchUsers(): Promise<User[]> {
  const { data } = await supabase.from('users').select('*');
  return (data || []).map(mapUser);
}

export async function fetchDeposits(): Promise<Deposit[]> {
  const { data } = await supabase.from('deposits').select('*');
  return (data || []).map(mapDeposit);
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const { data } = await supabase.from('transactions').select('*');
  return (data || []).map(mapTx);
}

export async function fetchWithdrawals(): Promise<Withdrawal[]> {
  const { data } = await supabase.from('withdrawals').select('*');
  return (data || []).map(mapWithdrawal);
}

export async function fetchAccruals(): Promise<DailyAccrual[]> {
  const { data } = await supabase.from('accruals').select('*');
  return (data || []).map(mapAccrual);
}

export async function fetchReferrals(): Promise<Referral[]> {
  const { data } = await supabase.from('referrals').select('*');
  return (data || []).map(mapReferral);
}

export async function fetchTrades(): Promise<Trade[]> {
  const { data } = await supabase.from('trades').select('*').order('close_time', { ascending: false });
  return (data || []).map(mapTrade);
}

// Mutations
export async function createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  const { data, error } = await supabase.from('users').insert(mapUserToDb(user)).select().single();
  if (error) throw error;
  return mapUser(data);
}

export async function createDeposit(dep: Omit<Deposit, 'id' | 'status' | 'createdAt'>): Promise<Deposit> {
  const { data, error } = await supabase.from('deposits').insert({ 
    user_id: dep.userId, amount: dep.amount, network: dep.network, status: 'pending', tx_hash: dep.txHash 
  }).select().single();
  if (error) throw error;
  return mapDeposit(data);
}

export async function updateDepositStatus(id: string, status: Deposit['status']): Promise<Deposit> {
  const { data, error } = await supabase.from('deposits').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return mapDeposit(data);
}

export async function createTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
  const { data, error } = await supabase.from('transactions').insert({
    user_id: tx.userId, type: tx.type, amount: tx.amount, description: tx.description, status: tx.status, withdraw_type: tx.withdrawType
  }).select().single();
  if (error) throw error;
  return mapTx(data);
}

export async function updateTransactionStatus(id: string, status: Transaction['status']): Promise<Transaction> {
  const { data, error } = await supabase.from('transactions').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return mapTx(data);
}

export async function createWithdrawal(w: Omit<Withdrawal, 'id' | 'status' | 'createdAt'>): Promise<Withdrawal> {
  const { data, error } = await supabase.from('withdrawals').insert({
    user_id: w.userId, amount: w.amount, network: w.network, address: w.address, status: 'pending', withdraw_type: w.type
  }).select().single();
  if (error) throw error;
  return mapWithdrawal(data);
}

export async function updateWithdrawalStatus(id: string, status: Withdrawal['status']): Promise<Withdrawal> {
  const { data, error } = await supabase.from('withdrawals').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return mapWithdrawal(data);
}

export async function createAccrual(acc: Omit<DailyAccrual, 'id' | 'createdAt'>): Promise<DailyAccrual> {
  const { data, error } = await supabase.from('accruals').insert({
    user_id: acc.userId, capital: acc.capital, rate: acc.rate, interest: acc.interest, date: acc.date
  }).select().single();
  if (error) throw error;
  return mapAccrual(data);
}

export async function createReferral(ref: Omit<Referral, 'id' | 'createdAt'>): Promise<Referral> {
  const { data, error } = await supabase.from('referrals').insert({
    referrer_id: ref.referrerId, referred_user_id: ref.referredUserId, commission: ref.commission
  }).select().single();
  if (error) throw error;
  return mapReferral(data);
}

export async function updateReferralCommission(id: string, commission: number): Promise<Referral> {
  const { data, error } = await supabase.from('referrals').update({ commission }).eq('id', id).select().single();
  if (error) throw error;
  return mapReferral(data);
}

export async function updateOrderLicense(id: string, licenseDataRevealed: string): Promise<Order> {
  const { data, error } = await supabase.from('orders')
    .update({ status: 'completed', license_data_revealed: licenseDataRevealed })
    .eq('id', id)
    .select().single();
  if (error) throw error;
  return mapOrder(data);
}

export async function bulkInsertTrades(trades: Omit<Trade, 'id' | 'createdAt'>[]): Promise<void> {
  const dbTrades = trades.map(t => ({
    ticket: t.ticket,
    symbol: t.symbol,
    type: t.type,
    volume: t.volume,
    open_price: t.openPrice,
    close_price: t.closePrice,
    profit: t.profit,
    open_time: t.openTime,
    close_time: t.closeTime
  }));
  const { error } = await supabase.from('trades').insert(dbTrades);
  if (error) throw error;
}

// MARKETPLACE
export const mapProduct = (p: any): Product => ({
  id: p.id, name: p.name, description: p.description, price: Number(p.price),
  image: p.image, category: p.category, isActive: p.is_active, 
  licenseData: p.license_data, createdAt: p.created_at
});

export const mapOrder = (o: any): Order => ({
  id: o.id, userId: o.user_id, productId: o.product_id, amount: Number(o.amount),
  paymentMethod: o.payment_method, status: o.status, 
  licenseDataRevealed: o.license_data_revealed, createdAt: o.created_at
});

export async function createProduct(product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
  const { data, error } = await supabase.from('products').insert({
    name: product.name, description: product.description, price: product.price,
    image: product.image, category: product.category, is_active: product.isActive,
    license_data: product.licenseData
  }).select().single();
  if (error) throw error;
  return mapProduct(data);
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(mapProduct);
}

export async function updateProduct(id: string, product: Partial<Product>): Promise<Product> {
  const updates: any = {};
  if (product.name !== undefined) updates.name = product.name;
  if (product.description !== undefined) updates.description = product.description;
  if (product.price !== undefined) updates.price = product.price;
  if (product.image !== undefined) updates.image = product.image;
  if (product.category !== undefined) updates.category = product.category;
  if (product.isActive !== undefined) updates.is_active = product.isActive;
  if (product.licenseData !== undefined) updates.license_data = product.licenseData;

  const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return mapProduct(data);
}

export async function createOrder(order: Omit<Order, 'id' | 'createdAt'>): Promise<Order> {
  const { data, error } = await supabase.from('orders').insert({
    user_id: order.userId, product_id: order.productId, amount: order.amount,
    payment_method: order.paymentMethod, status: order.status,
    license_data_revealed: order.licenseDataRevealed
  }).select().single();
  if (error) throw error;
  return mapOrder(data);
}

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(mapOrder);
}

export async function updateOrderStatus(id: string, status: Order['status'], licenseDataRevealed?: string): Promise<Order> {
  const updates: any = { status };
  if (licenseDataRevealed !== undefined) updates.license_data_revealed = licenseDataRevealed;
  
  const { data, error } = await supabase.from('orders').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return mapOrder(data);
}
