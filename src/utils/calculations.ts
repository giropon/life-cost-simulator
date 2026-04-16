import type { FixedCost, DaySchedule, MonthlyEvent, AnnualEvent, IrregularEvent, Income } from '../types'

/** 固定費の月額換算（weekly 対応） */
export function calcFixedCostMonthly(costs: FixedCost[]): number {
  return costs.reduce((sum, c) => {
    if (c.frequency === 'monthly') return sum + c.amount
    if (c.frequency === 'yearly')  return sum + c.amount / 12
    if (c.frequency === 'weekly')  return sum + c.amount * (52 / 12)
    return sum
  }, 0)
}

/** 週次スケジュールの月額換算
 *  billingFrequency が '1回' 以外のアクティビティは固定費として計上済みのため除外 */
export function calcWeeklyMonthly(schedules: DaySchedule[]): number {
  const weeksPerMonth = 365 / 7 / 12
  return schedules.reduce((sum, day) => {
    const dayCost = day.activities.reduce((s, a) => {
      if (a.billingFrequency && a.billingFrequency !== '1回') return s
      return s + a.costPerOccurrence
    }, 0)
    return sum + dayCost * weeksPerMonth
  }, 0)
}

/** 月次イベントの月額換算 */
export function calcMonthlyEventsMonthly(events: MonthlyEvent[]): number {
  return events.reduce((sum, e) => sum + e.costPerOccurrence * e.timesPerMonth, 0)
}

/** 年次イベントの月額換算 */
export function calcAnnualEventsMonthly(events: AnnualEvent[]): number {
  return events.reduce((sum, e) => sum + e.costPerOccurrence / 12, 0)
}

/** 不定期イベントの月額換算 */
export function calcIrregularEventsMonthly(events: IrregularEvent[]): number {
  return events.reduce((sum, e) => sum + e.costPerOccurrence / e.intervalMonths, 0)
}

/** 収入の月額換算 */
export function calcIncomeMonthly(incomes: Income[]): number {
  return incomes.reduce((sum, i) => {
    if (i.frequency === 'monthly') return sum + i.amount
    if (i.frequency === 'yearly')  return sum + i.amount / 12
    if (i.frequency === 'specific_month') {
      // months 配列（新形式）または旧 month フィールドを使用
      const monthCount = i.months?.length ?? (i.month ? 1 : 1)
      return sum + (i.amount * monthCount) / 12
    }
    return sum
  }, 0)
}

export interface MonthlySummary {
  fixedCosts: number
  weekly: number
  monthlyEvents: number
  annualEvents: number
  irregularEvents: number
  total: number
  income: number
  balance: number
}

export function calcMonthlySummary(
  fixedCosts: FixedCost[],
  schedules: DaySchedule[],
  monthlyEvents: MonthlyEvent[],
  annualEvents: AnnualEvent[],
  irregularEvents: IrregularEvent[],
  incomes: Income[] = []
): MonthlySummary {
  const fixed = calcFixedCostMonthly(fixedCosts)
  const weekly = calcWeeklyMonthly(schedules)
  const monthly = calcMonthlyEventsMonthly(monthlyEvents)
  const annual = calcAnnualEventsMonthly(annualEvents)
  const irregular = calcIrregularEventsMonthly(irregularEvents)
  const total = fixed + weekly + monthly + annual + irregular
  const income = calcIncomeMonthly(incomes)
  return {
    fixedCosts: fixed,
    weekly,
    monthlyEvents: monthly,
    annualEvents: annual,
    irregularEvents: irregular,
    total,
    income,
    balance: income - total,
  }
}

/** 月ごとの支出内訳（年次イベントを該当月に配置） */
export function calcMonthlyBreakdown(
  fixedCosts: FixedCost[],
  schedules: DaySchedule[],
  monthlyEvents: MonthlyEvent[],
  annualEvents: AnnualEvent[],
  irregularEvents: IrregularEvent[]
): number[] {
  const base =
    calcFixedCostMonthly(fixedCosts) +
    calcWeeklyMonthly(schedules) +
    calcMonthlyEventsMonthly(monthlyEvents) +
    calcIrregularEventsMonthly(irregularEvents)

  // 12ヶ月分の配列
  const months = Array.from({ length: 12 }, () => base)

  // 年次イベントは該当月に実費を追加し、他の月からは月割り分を引く
  annualEvents.forEach((e) => {
    const monthlyAvg = e.costPerOccurrence / 12
    for (let m = 0; m < 12; m++) {
      if (m + 1 === e.month) {
        months[m] += e.costPerOccurrence - monthlyAvg
      } else {
        months[m] -= monthlyAvg
      }
    }
  })

  return months
}

export function formatYen(amount: number): string {
  return `¥${Math.round(amount).toLocaleString('ja-JP')}`
}
