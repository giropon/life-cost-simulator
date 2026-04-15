import type { TabKey } from '../../types'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'fixed', label: '固定費', icon: '🏠' },
  { key: 'weekly', label: '週次スケジュール', icon: '📅' },
  { key: 'monthly', label: '月次イベント', icon: '🗓️' },
  { key: 'annual', label: '年次イベント', icon: '🎉' },
  { key: 'irregular', label: '不定期イベント', icon: '✨' },
  { key: 'income', label: '収入', icon: '💰' },
  { key: 'summary', label: 'サマリー', icon: '📊' },
]

interface Props {
  active: TabKey
  onChange: (key: TabKey) => void
}

export default function TabNav({ active, onChange }: Props) {
  return (
    <nav className="bg-white border-b border-slate-200 overflow-x-auto">
      <div className="flex min-w-max">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              active === tab.key
                ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
