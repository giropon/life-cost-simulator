import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useCostStore } from '../../store/useCostStore'
import { formatYen } from '../../utils/calculations'
import type { FixedCost } from '../../types'
import FixedCostForm from './FixedCostForm'

const ITEM_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#f97316', '#14b8a6', '#ec4899', '#84cc16']

const FREQ_LABEL: Record<string, string> = {
  weekly:  '週',
  monthly: '月',
  yearly:  '年',
}

function FreqDisplay({ c }: { c: FixedCost }) {
  const label = FREQ_LABEL[c.frequency] ?? '月'
  const monthly =
    c.frequency === 'monthly' ? c.amount :
    c.frequency === 'yearly'  ? c.amount / 12 :
    c.amount * (52 / 12)  // weekly
  return (
    <p className="text-xs text-slate-500">
      {formatYen(c.amount)} / {label}
      {c.frequency !== 'monthly' && (
        <span className="ml-1 text-slate-400">（月割: {formatYen(monthly)}）</span>
      )}
    </p>
  )
}

function toMonthly(c: FixedCost): number {
  if (c.frequency === 'monthly') return c.amount
  if (c.frequency === 'yearly')  return c.amount / 12
  return c.amount * (52 / 12)
}

export default function FixedCostSection() {
  const { fixedCosts, removeFixedCost } = useCostStore()
  const [editing, setEditing]   = useState<FixedCost | null>(null)
  const [showForm, setShowForm] = useState(false)

  const monthly = fixedCosts.reduce((s, c) => s + toMonthly(c), 0)

  const grouped = fixedCosts.reduce<Record<string, FixedCost[]>>((acc, c) => {
    const cat = c.category || 'その他'
    return { ...acc, [cat]: [...(acc[cat] || []), c] }
  }, {})

  // 項目ごとに色を割り当て
  const itemColorMap = new Map(
    fixedCosts.map((c, i) => [c.id, ITEM_COLORS[i % ITEM_COLORS.length]])
  )

  // カテゴリ別・積み上げグラフ用データ（1行=1カテゴリ、各項目IDをキーに）
  const chartData = Object.entries(grouped)
    .map(([cat, items]) => {
      const row: Record<string, number | string> = { name: cat }
      fixedCosts.forEach(c => {
        const match = items.find(i => i.id === c.id)
        row[c.id] = match ? Math.round(toMonthly(match)) : 0
      })
      row.categoryTotal = Math.round(items.reduce((s, c) => s + toMonthly(c), 0))
      return row
    })
    .sort((a, b) => (b.categoryTotal as number) - (a.categoryTotal as number))

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number; name: string }[]; label?: string }) => {
    if (!active || !payload?.length) return null
    const entries = payload.filter(p => p.value > 0)
    const total = entries.reduce((s, p) => s + p.value, 0)
    return (
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>{label} 合計: {formatYen(total)}</p>
        {entries.map(p => (
          <p key={p.dataKey} style={{ color: '#475569', marginBottom: 2 }}>{p.name}: {formatYen(p.value)}</p>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">固定費</h2>
          <p className="text-sm text-slate-500">毎週・毎月・毎年かかる固定の費用を登録します</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          ＋ 追加
        </button>
      </div>

      {(showForm || editing) && (
        <FixedCostForm
          initial={editing ?? undefined}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {fixedCosts.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <p className="text-3xl mb-2">🏠</p>
          <p className="text-sm">固定費がまだ登録されていません</p>
        </div>
      ) : (
        <>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{cat}</span>
                <span className="text-xs text-slate-400">
                  月額: {formatYen(Math.round(items.reduce((s, c) => s + toMonthly(c), 0)))}
                </span>
              </div>
              <ul className="divide-y divide-slate-100">
                {items.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                        {c.source === 'activity' && (
                          <span className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-500 rounded border border-indigo-100 whitespace-nowrap">
                            📅 週次タスク
                          </span>
                        )}
                      </div>
                      <FreqDisplay c={c} />
                    </div>
                    <div className="flex gap-2 ml-3">
                      {c.source !== 'activity' && (
                        <button
                          onClick={() => { setEditing(c); setShowForm(false) }}
                          className="text-xs px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        >
                          編集
                        </button>
                      )}
                      <button
                        onClick={() => removeFixedCost(c.id)}
                        className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        削除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="bg-indigo-50 rounded-xl p-4 flex justify-between items-center">
            <span className="text-sm font-medium text-indigo-700">固定費合計（月額換算）</span>
            <span className="text-lg font-bold text-indigo-700">{formatYen(monthly)}</span>
          </div>

          {/* カテゴリ別グラフ */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">項目別月額内訳</h3>
              <ResponsiveContainer width="100%" height={chartData.length * 44 + 20}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="4 3" stroke="#cbd5e1" strokeWidth={1} horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  {fixedCosts.map((c, i) => (
                    <Bar
                      key={c.id}
                      dataKey={c.id}
                      stackId="a"
                      fill={itemColorMap.get(c.id)}
                      name={c.name}
                      radius={i === fixedCosts.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
