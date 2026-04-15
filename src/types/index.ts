export const FIXED_COST_CATEGORIES = ['住居', '光熱費', '通信費', '食費', '保険', 'フィットネス', 'サブスク', 'その他'] as const
export type FixedCostCategory = typeof FIXED_COST_CATEGORIES[number]

export type BillingFrequency = '1回' | '週' | '月' | '年'

export interface FixedCost {
  id: string
  name: string
  amount: number
  frequency: 'monthly' | 'yearly' | 'weekly'
  category: string
  /** 週次タスクから自動生成された場合に設定 */
  source?: 'activity'
}

export interface Activity {
  id: string
  name: string
  costPerOccurrence: number
  startSlot: number      // 0 = 6:00, 1 = 6:30, ..., 47 = 5:30(翌日)
  durationSlots: number  // 1 = 30分, 2 = 1時間, ...
  /** 繰り返し請求の場合のカテゴリ（固定費と共通） */
  category?: string
  /** 請求頻度。'1回'以外は固定費として登録される */
  billingFrequency?: BillingFrequency
  /** billingFrequency が '1回' 以外のとき、対応する FixedCost の id */
  linkedFixedCostId?: string
}

export interface DaySchedule {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6
  activities: Activity[]
}

export interface MonthlyEvent {
  id: string
  name: string
  costPerOccurrence: number
  timesPerMonth: number
}

export interface AnnualEvent {
  id: string
  name: string
  costPerOccurrence: number
  month: number
}

export interface IrregularEvent {
  id: string
  name: string
  costPerOccurrence: number
  intervalMonths: number
}

export type TabKey = 'fixed' | 'weekly' | 'monthly' | 'annual' | 'irregular' | 'summary'

export const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'] as const

// 6:00 起点でスロット番号を時刻文字列に変換
export const START_HOUR = 6
export const TOTAL_SLOTS = 48   // 24時間 × 2スロット/時間
export const SLOT_HEIGHT = 40   // px

export function slotToTimeStr(slot: number): string {
  const totalMins = slot * 30 + START_HOUR * 60
  const h = Math.floor(totalMins / 60) % 24
  const m = totalMins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function slotToHourLabel(hourOffset: number): string {
  const h = (START_HOUR + hourOffset) % 24
  const isNextDay = START_HOUR + hourOffset >= 24
  return `${isNextDay ? '翌' : ''}${String(h).padStart(2, '0')}:00`
}
