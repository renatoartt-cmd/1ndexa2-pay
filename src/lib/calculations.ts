import type { User, Deposit, Transaction, Withdrawal, DailyAccrual, Referral } from './types';

export function getUserWithdrawnCapital(userId: string, withdrawals: Withdrawal[]): number {
  return withdrawals
    .filter(w => w.userId === userId && w.type === 'capital' && w.status !== 'rejected')
    .reduce((sum, w) => sum + w.amount, 0);
}

export function getUserWithdrawnInterest(userId: string, withdrawals: Withdrawal[]): number {
  return withdrawals
    .filter(w => w.userId === userId && w.type === 'interest' && w.status !== 'rejected')
    .reduce((sum, w) => sum + w.amount, 0);
}

export function calculateUserCapital(
  userId: string,
  deposits: Deposit[],
  withdrawals: Withdrawal[],
  accruals: DailyAccrual[]
): number {
  const totalDeposits = deposits
    .filter(d => d.userId === userId && d.status === 'confirmed')
    .reduce((sum, d) => sum + d.amount, 0);
    
  const totalCapitalWithdrawals = getUserWithdrawnCapital(userId, withdrawals);
  const totalInterestWithdrawals = getUserWithdrawnInterest(userId, withdrawals);

  const totalAccruedInterest = accruals
    .filter(a => a.userId === userId)
    .reduce((sum, a) => sum + a.interest, 0);

  let capital = totalDeposits - totalCapitalWithdrawals;

  if (totalInterestWithdrawals > totalAccruedInterest) {
    capital -= (totalInterestWithdrawals - totalAccruedInterest);
  }

  return Math.max(0, capital);
}

export function calculateTotalCapital(users: User[], deposits: Deposit[], withdrawals: Withdrawal[], accruals: DailyAccrual[]): number {
  return users.reduce((sum, u) => sum + calculateUserCapital(u.id, deposits, withdrawals, accruals), 0);
}

export function calculateTotalAccruedInterest(accruals: DailyAccrual[]): number {
  return accruals.reduce((sum, a) => sum + a.interest, 0);
}

export function getUserLevelByCapital(capital: number, LEVEL_CONFIG: any[]) {
  return LEVEL_CONFIG.find(l => capital >= l.minCapital && capital <= l.maxCapital) || LEVEL_CONFIG[0];
}

export function getUserDaysActive(userId: string, deposits: Deposit[]): number {
  const userDeposits = deposits.filter(d => d.userId === userId && d.status === 'confirmed');
  if (userDeposits.length === 0) return 0;
  const first = new Date(Math.min(...userDeposits.map(d => new Date(d.createdAt).getTime())));
  const diff = Date.now() - first.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getUserTransactions(userId: string, transactions: Transaction[]): Transaction[] {
  return transactions
    .filter(t => t.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getUserAccruals(userId: string, accruals: DailyAccrual[]): DailyAccrual[] {
  return accruals.filter(a => a.userId === userId);
}
