import type { TabKey } from '../../types'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'fixed', label: '固定費', icon: '🏠' },
  { key: 'weekly', label: '週次', icon: '📅' },
  { key: 'monthly', label: '月次', icon: '🗓️' },
  { key: 'annual', label: '年次', icon: '🎉' },
  { key: 'irregular', label: '不定期', icon: '✨' },
  { key: 'income', label: '収入', icon: '💰' },
  { key: 'summary', label: 'サマリー', icon: '📊' },
]

// スマホ非表示用のフルラベル（aria-label 用）
const FULL_LABELS: Record<TabKey, string> = {
  fixed: '固定費',
  weekly: '週次スケジュール',
  monthly: '月次イベント',
  annual: '年次イベント',
  irregular: '不定期イベント',
  income: '収入',
  summary: 'サマリー',
}

interface Props {
  active: TabKey
  onChange: (key: TabKey) => void
}

export default function TabNav({ active, onChange }: Props) {
  return (
    <nav className="bg-white border-b border-slate-200">
      {/* スマホ: 4列グリッド2段 / sm以上: 横並び1行 */}
      <div className="grid grid-cols-4 sm:flex sm:flex-nowrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            aria-label={FULL_LABELS[tab.key]}
            className={`py-2 sm:py-3 sm:px-4 sm:flex-1 text-center border-b-2 transition-colors flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 ${
              active === tab.key
                ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span className="text-base sm:text-sm leading-none">{tab.icon}</span>
            <span className="text-[10px] sm:text-sm font-medium leading-tight whitespace-nowrap">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
