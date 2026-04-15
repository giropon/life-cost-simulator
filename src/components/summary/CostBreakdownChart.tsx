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
} from 'recharts'
import type { MonthlySummary } from '../../utils/calculations'
import { formatYen } from '../../utils/calculations'

const COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e']

const LABELS: Record<keyof Omit<MonthlySummary, 'total'>, string> = {
  fixedCosts: '固定費',
  weekly: '週次スケジュール',
  monthlyEvents: '月次イベント',
  annualEvents: '年次イベント',
  irregularEvents: '不定期イベント',
}

interface Props {
  summary: MonthlySummary
  monthlyBreakdown: number[]
}

const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export default function CostBreakdownChart({ summary, monthlyBreakdown }: Props) {
  const pieData = (Object.keys(LABELS) as (keyof Omit<MonthlySummary, 'total'>)[])
    .filter((k) => summary[k] > 0)
    .map((k, i) => ({
      name: LABELS[k],
      value: Math.round(summary[k]),
      color: COLORS[i % COLORS.length],
    }))

  const barData = monthlyBreakdown.map((v, i) => ({
    name: MONTH_NAMES[i],
    amount: Math.round(v),
  }))

  return (
    <div className="space-y-6">
      {pieData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">カテゴリ別内訳（月額）</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
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
