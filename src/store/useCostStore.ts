import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type {
  FixedCost,
  DaySchedule,
  MonthlyEvent,
  AnnualEvent,
  IrregularEvent,
  Activity,
  Income,
} from '../types'

const DEFAULT_SCHEDULES: DaySchedule[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
  dayOfWeek: d as DaySchedule['dayOfWeek'],
  activities: [],
}))

interface CostStore {
  fixedCosts: FixedCost[]
  schedules: DaySchedule[]
  monthlyEvents: MonthlyEvent[]
  annualEvents: AnnualEvent[]
  irregularEvents: IrregularEvent[]
  incomes: Income[]

  // 固定費
  addFixedCost: (cost: Omit<FixedCost, 'id'>, id?: string) => void
  updateFixedCost: (id: string, cost: Omit<FixedCost, 'id'>) => void
  removeFixedCost: (id: string) => void

  // 週次スケジュール
  addActivity: (dayOfWeek: number, activity: Omit<Activity, 'id'>) => void
  updateActivity: (dayOfWeek: number, activityId: string, activity: Omit<Activity, 'id'>) => void
  removeActivity: (dayOfWeek: number, activityId: string) => void

  // 月次イベント
  addMonthlyEvent: (event: Omit<MonthlyEvent, 'id'>) => void
  updateMonthlyEvent: (id: string, event: Omit<MonthlyEvent, 'id'>) => void
  removeMonthlyEvent: (id: string) => void

  // 年次イベント
  addAnnualEvent: (event: Omit<AnnualEvent, 'id'>) => void
  updateAnnualEvent: (id: string, event: Omit<AnnualEvent, 'id'>) => void
  removeAnnualEvent: (id: string) => void

  // 不定期イベント
  addIrregularEvent: (event: Omit<IrregularEvent, 'id'>) => void
  updateIrregularEvent: (id: string, event: Omit<IrregularEvent, 'id'>) => void
  removeIrregularEvent: (id: string) => void

  // 収入
  addIncome: (income: Omit<Income, 'id'>) => void
  updateIncome: (id: string, income: Omit<Income, 'id'>) => void
  removeIncome: (id: string) => void
}

export const useCostStore = create<CostStore>()(
  persist(
    (set) => ({
      fixedCosts: [],
      schedules: DEFAULT_SCHEDULES,
      monthlyEvents: [],
      annualEvents: [],
      irregularEvents: [],
      incomes: [],

      addFixedCost: (cost, id) =>
        set((s) => ({ fixedCosts: [...s.fixedCosts, { ...cost, id: id ?? uuidv4() }] })),
      updateFixedCost: (id, cost) =>
        set((s) => ({
          fixedCosts: s.fixedCosts.map((c) => (c.id === id ? { ...cost, id } : c)),
        })),
      removeFixedCost: (id) =>
        set((s) => ({ fixedCosts: s.fixedCosts.filter((c) => c.id !== id) })),

      addActivity: (dayOfWeek, activity) =>
        set((s) => ({
          schedules: s.schedules.map((d) =>
            d.dayOfWeek === dayOfWeek
              ? { ...d, activities: [...d.activities, { ...activity, id: uuidv4() }] }
              : d
          ),
        })),
      updateActivity: (dayOfWeek, activityId, activity) =>
        set((s) => ({
          schedules: s.schedules.map((d) =>
            d.dayOfWeek === dayOfWeek
              ? {
                  ...d,
                  activities: d.activities.map((a) =>
                    a.id === activityId ? { ...activity, id: activityId } : a
                  ),
                }
              : d
          ),
        })),
      removeActivity: (dayOfWeek, activityId) =>
        set((s) => ({
          schedules: s.schedules.map((d) =>
            d.dayOfWeek === dayOfWeek
              ? { ...d, activities: d.activities.filter((a) => a.id !== activityId) }
              : d
          ),
        })),

      addMonthlyEvent: (event) =>
        set((s) => ({ monthlyEvents: [...s.monthlyEvents, { ...event, id: uuidv4() }] })),
      updateMonthlyEvent: (id, event) =>
        set((s) => ({
          monthlyEvents: s.monthlyEvents.map((e) => (e.id === id ? { ...event, id } : e)),
        })),
      removeMonthlyEvent: (id) =>
        set((s) => ({ monthlyEvents: s.monthlyEvents.filter((e) => e.id !== id) })),

      addAnnualEvent: (event) =>
        set((s) => ({ annualEvents: [...s.annualEvents, { ...event, id: uuidv4() }] })),
      updateAnnualEvent: (id, event) =>
        set((s) => ({
          annualEvents: s.annualEvents.map((e) => (e.id === id ? { ...event, id } : e)),
        })),
      removeAnnualEvent: (id) =>
        set((s) => ({ annualEvents: s.annualEvents.filter((e) => e.id !== id) })),

      addIrregularEvent: (event) =>
        set((s) => ({ irregularEvents: [...s.irregularEvents, { ...event, id: uuidv4() }] })),
      updateIrregularEvent: (id, event) =>
        set((s) => ({
          irregularEvents: s.irregularEvents.map((e) => (e.id === id ? { ...event, id } : e)),
        })),
      removeIrregularEvent: (id) =>
        set((s) => ({ irregularEvents: s.irregularEvents.filter((e) => e.id !== id) })),

      addIncome: (income) =>
        set((s) => ({ incomes: [...s.incomes, { ...income, id: uuidv4() }] })),
      updateIncome: (id, income) =>
        set((s) => ({
          incomes: s.incomes.map((i) => (i.id === id ? { ...income, id } : i)),
        })),
      removeIncome: (id) =>
        set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) })),
    }),
    {
      name: 'life-cost-simulator',
      version: 5,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Partial<CostStore>
        if (version < 2) {
          return { ...state, schedules: DEFAULT_SCHEDULES }
        }
        // v3: Activity に billingFrequency / category / linkedFixedCostId を追加
        // v4: incomes を追加
        if (version < 4) {
          return { ...state, incomes: [] }
        }
        // v5: Income.month (単一) を months (配列) に移行
        if (version < 5) {
          const oldIncomes = ((state as Partial<CostStore>).incomes ?? []) as Array<Income & { month?: number }>
          return {
            ...state,
            incomes: oldIncomes.map((i) => ({
              ...i,
              months: i.months ?? (i.month != null ? [i.month] : []),
              month: undefined,
            })),
          }
        }
        return state
      },
    }
  )
)
