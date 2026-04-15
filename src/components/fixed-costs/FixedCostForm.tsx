import { useState } from 'react'
import { useCostStore } from '../../store/useCostStore'
import { FIXED_COST_CATEGORIES } from '../../types'
import type { FixedCost } from '../../types'

interface Props {
  initial?: FixedCost
  onClose: () => void
}

export default function FixedCostForm({ initial, onClose }: Props) {
  const { addFixedCost, updateFixedCost } = useCostStore()
  const [name, setName]           = useState(initial?.name ?? '')
  const [amount, setAmount]       = useState(String(initial?.amount ?? ''))
  const [frequency, setFrequency] = useState<'monthly' | 'yearly' | 'weekly'>(initial?.frequency ?? 'monthly')
  const [category, setCategory]   = useState(initial?.category ?? 'その他')

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory)
    if (name === '' || FIXED_COST_CATEGORIES.includes(name as typeof FIXED_COST_CATEGORIES[number])) {
      setName(newCategory)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = { name, amount: Number(amount), frequency, category }
    if (initial) {
      updateFixedCost(initial.id, data)
    } else {
      addFixedCost(data)
    }
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-indigo-200 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">{initial ? '固定費を編集' : '固定費を追加'}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-slate-500 mb-1 block">カテゴリ</label>
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {FIXED_COST_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-slate-500 mb-1 block">項目名</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 家賃"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
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
            placeholder="例: 80000"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">頻度</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as 'monthly' | 'yearly' | 'weekly')}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="weekly">毎週</option>
            <option value="monthly">毎月</option>
            <option value="yearly">毎年</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">キャンセル</button>
        <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">{initial ? '更新' : '追加'}</button>
      </div>
    </form>
  )
}
