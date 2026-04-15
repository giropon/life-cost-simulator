import { useCostStore } from '../../store/useCostStore'
import {
  calcMonthlySummary,
  calcMonthlyBreakdown,
  formatYen,
} from '../../utils/calculations'
import CostBreakdownChart from './CostBreakdownChart'

const CATEGORY_LABELS = {
  fixedCosts: { label: '固定費', icon: '🏠', color: 'bg-indigo-500' },
  weekly: { label: '週次スケジュール', icon: '📅', color: 'bg-cyan-500' },
  monthlyEvents: { label: '月次イベント', icon: '🗓️', color: 'bg-amber-500' },
  annualEvents: { label: '年次イベント', icon: '🎉', color: 'bg-emerald-500' },
  irregularEvents: { label: '不定期イベント', icon: '✨', color: 'bg-rose-500' },
} as const

export default function SummarySection() {
  const { fixedCosts, schedules, monthlyEvents, annualEvents, irregularEvents } = useCostStore()

  const summary = calcMonthlySummary(fixedCosts, schedules, monthlyEvents, annualEvents, irregularEvents)
  const breakdown = calcMonthlyBreakdown(fixedCosts, schedules, monthlyEvents, annualEvents, irregularEvents)

  const isEmpty = summary.total === 0

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">サマリー</h2>
        <p className="text-sm text-slate-500">理想の生活にかかるコストの合計です</p>
      </div>

      {isEmpty ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm">各タブでデータを入力すると、ここに合計が表示されます</p>
        </div>
      ) : (
        <>
          {/* メインの合計 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white">
              <p className="text-xs font-medium opacity-80 mb-1">月額合計</p>
              <p className="text-2xl font-bold">{formatYen(summary.total)}</p>
              <p className="text-xs opacity-70 mt-1">/ 月</p>
            </div>
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-4 text-white">
              <p className="text-xs font-medium opacity-80 mb-1">年額合計</p>
              <p className="text-2xl font-bold">{formatYen(summary.total * 12)}</p>
              <p className="text-xs opacity-70 mt-1">/ 年</p>
            </div>
          </div>

          {/* カテゴリ別内訳 */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">カテゴリ別内訳</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {(Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((key) => {
                const val = summary[key]
                if (val === 0) return null
                const { label, icon } = CATEGORY_LABELS[key]
                const pct = summary.total > 0 ? (val / summary.total) * 100 : 0
                return (
                  <li key={key} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700">
                        <span className="mr-1">{icon}</span>{label}
                      </span>
                      <div className="text-right">
                        <span className="text-sm font-medium text-slate-800">{formatYen(val)}</span>
                        <span className="text-xs text-slate-400 ml-1">({pct.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${CATEGORY_LABELS[key].color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          <CostBreakdownChart summary={summary} monthlyBreakdown={breakdown} />

          {/* 参考情報 */}
          <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-600">計算について</p>
            <p>・週次スケジュールは「365日 ÷ 7日 ÷ 12ヶ月」を乗算して月額換算しています</p>
            <p>・年次イベントは年間費用を12で割った月割額で月額換算しています</p>
            <p>・月別グラフでは年次イベントを該当月に実費で計上しています</p>
          </div>
        </>
      )}
    </div>
  )
}
