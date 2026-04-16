import { useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Sector,
} from 'recharts'
import type { MonthlySummary } from '../../utils/calculations'
import { formatYen } from '../../utils/calculations'
import type { FixedCost } from '../../types'

const COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e']

type CostKey = 'fixedCosts' | 'weekly' | 'monthlyEvents' | 'annualEvents' | 'irregularEvents'

const LABELS: Record<CostKey, string> = {
  fixedCosts: '固定費',
  weekly: '週次スケジュール',
  monthlyEvents: '月次イベント',
  annualEvents: '年次イベント',
  irregularEvents: '不定期イベント',
}

interface Props {
  summary: MonthlySummary
  monthlyBreakdown: number[]
  fixedCosts: FixedCost[]
}

const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

function toMonthly(c: FixedCost): number {
  if (c.frequency === 'monthly') return c.amount
  if (c.frequency === 'yearly')  return c.amount / 12
  return c.amount * (52 / 12)
}

// アクティブスライスのレンダラー（recharts の activeShape prop 用）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderActiveShape = (props: any) => {
  const {
    cx, cy, innerRadius, outerRadius,
    startAngle, endAngle, fill,
  } = props
  return (
    <g>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx} cy={cy}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 14}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  )
}

export default function CostBreakdownChart({ summary, monthlyBreakdown, fixedCosts }: Props) {
  // ホバー中またはタップ選択中のスライスキー
  const [activeKey, setActiveKey] = useState<CostKey | null>(null)
  // タップ固定（スマホ用）
  const [pinnedKey, setPinnedKey] = useState<CostKey | null>(null)

  const pieData = (Object.keys(LABELS) as CostKey[])
    .filter((k) => summary[k] > 0)
    .map((k, i) => ({
      name: LABELS[k],
      value: Math.round(summary[k]),
      color: COLORS[i % COLORS.length],
      key: k,
    }))

  const barData = monthlyBreakdown.map((v, i) => ({
    name: MONTH_NAMES[i],
    amount: Math.round(v),
  }))

  // 表示中のキー（ピン優先、なければホバー）
  const displayKey = pinnedKey ?? activeKey

  // 固定費内訳（カテゴリ別）
  const showFixedDetail = displayKey === 'fixedCosts' && fixedCosts.length > 0
  const fixedDetail = showFixedDetail
    ? Object.entries(
        fixedCosts.reduce<Record<string, number>>((acc, c) => {
          const cat = c.category || 'その他'
          return { ...acc, [cat]: (acc[cat] ?? 0) + toMonthly(c) }
        }, {})
      )
        .map(([cat, amt]) => ({ cat, amt: Math.round(amt) }))
        .sort((a, b) => b.amt - a.amt)
    : []

  const handlePieEnter = (_: unknown, index: number) => {
    setActiveKey(pieData[index]?.key ?? null)
  }
  const handlePieLeave = () => {
    setActiveKey(null)
  }
  const handlePieClick = (_: unknown, index: number) => {
    const key = pieData[index]?.key ?? null
    setPinnedKey((prev) => (prev === key ? null : key))
  }

  return (
    <div className="space-y-6">
      {pieData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">カテゴリ別内訳（月額）</h3>
          <p className="text-xs text-slate-400 mb-4">
            固定費をホバー・タップすると内訳を表示します
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                activeShape={renderActiveShape}
                onMouseEnter={handlePieEnter}
                onMouseLeave={handlePieLeave}
                onClick={handlePieClick}
                style={{ cursor: 'pointer' }}
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatYen(Number(value))} />
              <Legend
                formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* 選択中のスライス情報 */}
          {displayKey && (
            <div className="mt-2 flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
              <span className="text-xs font-semibold text-slate-700">{LABELS[displayKey]}</span>
              <span className="text-sm font-bold text-slate-800">{formatYen(summary[displayKey])}</span>
              {pinnedKey && (
                <button
                  onClick={() => setPinnedKey(null)}
                  className="ml-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* 固定費内訳パネル */}
          {showFixedDetail && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-indigo-600 mb-2">🏠 固定費 内訳（カテゴリ別・月額）</p>
              <ul className="space-y-1.5">
                {fixedDetail.map(({ cat, amt }) => {
                  const pct = summary.fixedCosts > 0 ? (amt / summary.fixedCosts) * 100 : 0
                  return (
                    <li key={cat}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-slate-700">{cat}</span>
                        <span className="text-xs font-medium text-slate-800">
                          {formatYen(amt)}
                          <span className="text-slate-400 ml-1">({pct.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-indigo-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {barData.some((d) => d.amount > 0) && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">月別支出シミュレーション（年次イベント含む）</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatYen(Number(value))} />
              <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
