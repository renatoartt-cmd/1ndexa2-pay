import type { SimulationParams, SimulationResult, DayData, LevelConfig, UserLevel } from './types';

// Daily compound rate: (1.03)^(1/30) - 1 ≈ 0.0986% per day → 3% monthly effective
export const DAILY_RATE = Math.pow(1.03, 1 / 30) - 1; // ≈ 0.000986 (0.0986% diario)
export const MONTHLY_EFFECTIVE_RATE = 0.03; // 3% mensual efectivo
export const ANNUAL_EFFECTIVE_RATE = Math.pow(1 + DAILY_RATE, 365) - 1; // ≈ 42.6% anual

export const LEVEL_CONFIG: LevelConfig[] = [
  { level: 'bronze',   label: 'Bronce',  minCapital: 0,     maxCapital: 999,      referralMatchPercent: 0.05, color: '#CD7F32' },
  { level: 'silver',   label: 'Plata',   minCapital: 1000,  maxCapital: 4999,     referralMatchPercent: 0.10, color: '#94A3B8' },
  { level: 'gold',     label: 'Oro',     minCapital: 5000,  maxCapital: 9999,     referralMatchPercent: 0.15, color: '#F59E0B' },
  { level: 'platinum', label: 'Platino', minCapital: 10000, maxCapital: Infinity, referralMatchPercent: 0.20, color: '#E2E8F0' },
];

export function getUserLevel(capital: number): LevelConfig {
  return LEVEL_CONFIG.find(l => capital >= l.minCapital && capital <= l.maxCapital) ?? LEVEL_CONFIG[0];
}

export function getUserLevelByName(level: UserLevel): LevelConfig {
  return LEVEL_CONFIG.find(l => l.level === level) ?? LEVEL_CONFIG[0];
}

export const PRESET_CAPITALS = [500, 1000, 5000, 10000, 50000];

export function calcDailyInterest(capital: number): number {
  return capital * DAILY_RATE;
}

export function compoundAfterDays(capital: number, days: number): number {
  return capital * Math.pow(1 + DAILY_RATE, days);
}

export function dailyProjection(capital: number, days: number): DayData[] {
  const result: DayData[] = [];
  let current = capital;
  let accumulated = 0;
  for (let d = 1; d <= days; d++) {
    const dailyGain = current * DAILY_RATE;
    accumulated += dailyGain;
    current += dailyGain;
    result.push({ day: d, capital: current, dailyGain, accumulatedGain: accumulated });
  }
  return result;
}

export function simulate(params: SimulationParams): SimulationResult {
  const { capital, months, monthlyContribution, mode } = params;
  const monthlyData: SimulationResult['monthlyData'] = [];
  let currentCapital = capital;
  let cumulativeGain = 0;

  for (let m = 1; m <= months; m++) {
    const startCapital = currentCapital;
    const endCapital = currentCapital * Math.pow(1 + DAILY_RATE, 30);
    const gain = endCapital - startCapital;

    if (mode === 'compound') {
      currentCapital = endCapital;
    }
    // withdrawal: capital stays the same

    cumulativeGain += gain;
    monthlyData.push({ month: m, capital: currentCapital, gain, cumulativeGain });

    if (monthlyContribution > 0) currentCapital += monthlyContribution;
  }

  const gananciaTotal = mode === 'compound' ? currentCapital - capital : cumulativeGain;
  const dailyGain = capital * DAILY_RATE;
  const monthlyGain = capital * MONTHLY_EFFECTIVE_RATE;
  const annualGain = capital * ANNUAL_EFFECTIVE_RATE;

  return {
    capitalInicial: capital,
    gananciaTotal,
    capitalProyectado: currentCapital,
    roiPercent: (gananciaTotal / capital) * 100,
    dailyRate: DAILY_RATE,
    dailyGain,
    monthlyGain,
    annualGain,
    monthlyData,
  };
}

export function quickSimulate(capital: number) {
  const dailyGain = calcDailyInterest(capital);
  const monthlyGain = capital * MONTHLY_EFFECTIVE_RATE;
  const annualCompound = capital * Math.pow(1 + DAILY_RATE, 365);
  const annualGain = annualCompound - capital;
  const threeYearCompound = capital * Math.pow(1 + DAILY_RATE, 365 * 3);
  const threeYearGain = threeYearCompound - capital;

  const monthlyBreakdown: { month: number; capital: number; gain: number }[] = [];
  let running = capital;
  for (let m = 1; m <= 12; m++) {
    const end = running * Math.pow(1 + DAILY_RATE, 30);
    const gain = end - running;
    running = end;
    monthlyBreakdown.push({ month: m, capital: running, gain });
  }

  return { daily: dailyGain, monthly: monthlyGain, annual: annualGain, annualCompound, threeYearCompound, threeYearGain, monthlyBreakdown, dailyRate: DAILY_RATE };
}

export function dashboardProjection(capital: number, daysActive: number) {
  const currentValue = compoundAfterDays(capital, daysActive);
  const accruedInterest = currentValue - capital;
  const todayGain = currentValue * DAILY_RATE;
  const projectedMonthly = capital * MONTHLY_EFFECTIVE_RATE;
  const projectedAnnual = capital * ANNUAL_EFFECTIVE_RATE;
  return { currentValue, accruedInterest, todayGain, projectedMonthly, projectedAnnual, roiPercent: capital > 0 ? (accruedInterest / capital) * 100 : 0 };
}
