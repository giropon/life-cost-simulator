import { useState } from 'react'
import { useCostStore } from '../../store/useCostStore'
import { calcWeeklyMonthly, formatYen } from '../../utils/calculations'
import { DAY_NAMES } from '../../types'
import DayCard from './DayCard'

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const  // 月〜日の順

const DAY_COLORS: Record<number, string> = {
  0: 'text-red-500',   // 日
  6: 'text-blue-500',  // 土
}

export default function WeeklyScheduleSection() {
  const { schedules } = useCostStore()
  const [selectedDay, setSelectedDay] = useState<number>(1)
  const monthly = calcWeeklyMonthly(schedules)

  const selectedSchedule = schedules.find((d) => d.dayOfWeek === selectedDay)
  const dayTotal = selectedSchedule
    ? selectedSchedule.activities.reduce((s, a) => s + a.costPerOccurrence, 0)
    : 0

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">週次スケジュール</h2>
        <p className="text-sm text-slate-500">
          曜日ごとの理想のスケジュールを設定します。グリッドをクリックしてタスクを追加、ブロックをクリックして編集できます。
        </p>
      </div>

      {/* 曜日セレクター */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex">
          {DAY_ORDER.map((d) => {
            const count = schedules.find((s) => s.dayOfWeek === d)?.activities.length ?? 0
            const colorClass = DAY_COLORS[d] ?? 'text-slate-700'
            return (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`flex-1 py-2.5 text-center transition-colors relative ${
                  selectedDay === d
                    ? 'bg-indigo-50 border-b-2 border-indigo-500'
                    : 'hover:bg-slate-50 border-b-2 border-transparent'
                }`}
              >
                <span className={`text-sm font-semibold ${selectedDay === d ? 'text-indigo-600' : colorClass}`}>
                  {DAY_NAMES[d]}
                </span>
                {count > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* タイムライン */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <span className={`text-sm font-semibold ${DAY_COLORS[selectedDay] ?? 'text-slate-700'}`}>
            {DAY_NAMES[selectedDay]}曜日のスケジュール
          </span>
          <span className="text-xs text-slate-400">6:00 〜 翌6:00</span>
        </div>
        <DayCard dayOfWeek={selectedDay} />
      </div>

      {/* 合計表示 */}
      {monthly > 0 && (
        <div className="bg-indigo-50 rounded-xl p-4 flex justify-between items-center">
          <div>
            <span className="text-sm font-medium text-indigo-700">週次スケジュール合計（月額換算）</span>
            {dayTotal > 0 && (
              <p className="text-xs text-indigo-500 mt-0.5">
                {DAY_NAMES[selectedDay]}曜日: {formatYen(dayTotal)}/日
              </p>
            )}
          </div>
          <span className="text-lg font-bold text-indigo-700">{formatYen(monthly)}</span>
        </div>
      )}
    </div>
  )
}
