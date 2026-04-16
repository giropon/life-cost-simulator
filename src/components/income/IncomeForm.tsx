import { useState } from 'react'
import { useCostStore } from '../../store/useCostStore'
import type { Income } from '../../types'

interface Props {
  initial?: Income
  onClose: () => void
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1)

export default function IncomeForm({ initial, onClose }: Props) {
  const { addIncome, updateIncome } = useCostStore()
  const [name, setName]           = useState(initial?.name ?? '')
  const [amount, setAmount]       = useState(String(initial?.amount ?? ''))
  const [frequency, setFrequency] = useState<Income['frequency']>(initial?.frequency ?? 'monthly')

  // 旧 month フィールドとの後方互換
  const initialMonths = initial?.months ?? (initial?.month != null ? [initial.month] : [])
  const [selectedMonths, setSelectedMonths] = useState<number[]>(initialMonths)

  const toggleMonth = (m: number) => {
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b)
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data: Omit<Income, 'id'> = {
      name,
      amount: Number(amount),
      frequency,
      ...(frequency === 'specific_month' ? { months: selectedMonths } : {}),
    }
    if (initial) {
      updateIncome(initial.id, data)
    } else {
      addIncome(data)
    }
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-emerald-200 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">{initial ? '収入を編集' : '収入を追加'}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-slate-500 mb-1 block">項目名</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 給与"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">金額（円）</label>
          <input
            required
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="例: 300000"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">頻度</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Income['frequency'])}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            <option value="monthly">毎月</option>
            <option value="yearly">毎年</option>
            <option value="specific_month">指定月</option>
          </select>
        </div>

        {frequency === 'specific_month' && (
          <div className="col-span-2">
            <label className="text-xs text-slate-500 mb-2 block">
              受取月（複数選択可）
              {selectedMonths.length > 0 && (
                <span className="ml-2 text-emerald-600 font-medium">
                  {selectedMonths.map((m) => `${m}月`).join('・')} 選択中
                </span>
              )}
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {MONTH_OPTIONS.map((m) => {
                const checked = selectedMonths.includes(m)
                return (
                  <label
                    key={m}
                    className={`flex items-center justify-center py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors select-none ${
                      checked
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleMonth(m)}
                    />
                    {m}月
                  </label>
                )
              })}
            </div>
            {selectedMonths.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">受取月を1つ以上選択してください</p>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={frequency === 'specific_month' && selectedMonths.length === 0}
          className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {initial ? '更新' : '追加'}
        </button>
      </div>
    </form>
  )
}
