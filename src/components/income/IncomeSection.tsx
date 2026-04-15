import { useState } from 'react'
import { useCostStore } from '../../store/useCostStore'
import { calcIncomeMonthly, formatYen } from '../../utils/calculations'
import type { Income } from '../../types'
import IncomeForm from './IncomeForm'

const FREQ_LABEL: Record<Income['frequency'], string> = {
  monthly: '毎月',
  yearly: '毎年',
  specific_month: '指定月',
}

function IncomeDisplay({ income }: { income: Income }) {
  const monthly =
    income.frequency === 'monthly' ? income.amount :
    income.frequency === 'yearly'  ? income.amount / 12 :
    income.amount / 12  // specific_month

  const freqText =
    income.frequency === 'specific_month' && income.month
      ? `${income.month}月`
      : FREQ_LABEL[income.frequency]

  return (
    <p className="text-xs text-slate-500">
      {formatYen(income.amount)} / {freqText}
      {income.frequency !== 'monthly' && (
        <span className="ml-1 text-slate-400">（月割: {formatYen(monthly)}）</span>
      )}
    </p>
  )
}

export default function IncomeSection() {
  const { incomes, removeIncome } = useCostStore()
  const [editing, setEditing]   = useState<Income | null>(null)
  const [showForm, setShowForm] = useState(false)

  const monthly = calcIncomeMonthly(incomes)

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">収入</h2>
          <p className="text-sm text-slate-500">毎月・毎年・特定月に受け取る収入を登録します</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          ＋ 追加
        </button>
      </div>

      {(showForm || editing) && (
        <IncomeForm
          initial={editing ?? undefined}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {incomes.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <p className="text-3xl mb-2">💰</p>
          <p className="text-sm">収入がまだ登録されていません</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {incomes.map((income) => (
                <li key={income.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{income.name}</p>
                    <IncomeDisplay income={income} />
                  </div>
                  <div className="flex gap-2 ml-3">
                    <button
                      onClick={() => { setEditing(income); setShowForm(false) }}
                      className="text-xs px-2 py-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => removeIncome(income.id)}
                      className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      削除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-emerald-50 rounded-xl p-4 flex justify-between items-center">
            <span className="text-sm font-medium text-emerald-700">収入合計（月額換算）</span>
            <span className="text-lg font-bold text-emerald-700">{formatYen(monthly)}</span>
          </div>
        </>
      )}
    </div>
  )
}
