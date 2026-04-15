import { useState } from 'react'
import { useCostStore } from '../../store/useCostStore'
import { calcIrregularEventsMonthly, formatYen } from '../../utils/calculations'
import type { IrregularEvent } from '../../types'

function EventForm({ initial, onClose }: { initial?: IrregularEvent; onClose: () => void }) {
  const { addIrregularEvent, updateIrregularEvent } = useCostStore()
  const [name, setName] = useState(initial?.name ?? '')
  const [cost, setCost] = useState(String(initial?.costPerOccurrence ?? ''))
  const [interval, setInterval] = useState(String(initial?.intervalMonths ?? '2'))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = { name, costPerOccurrence: Number(cost), intervalMonths: Number(interval) }
    if (initial) updateIrregularEvent(initial.id, data)
    else addIrregularEvent(data)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-indigo-200 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">{initial ? '不定期イベントを編集' : '不定期イベントを追加'}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-slate-500 mb-1 block">イベント名</label>
          <input required value={name} onChange={(e) => setName(e.target.value)}
            placeholder="例: 美容院"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">1回の費用（円）</label>
          <input required type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)}
            placeholder="例: 6000"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">何ヶ月に1回</label>
          <div className="flex items-center gap-1">
            <input required type="number" min="1" value={interval} onChange={(e) => setInterval(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <span className="text-xs text-slate-500 whitespace-nowrap">ヶ月に1回</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">キャンセル</button>
        <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">{initial ? '更新' : '追加'}</button>
      </div>
    </form>
  )
}

export default function IrregularEventsSection() {
  const { irregularEvents, removeIrregularEvent } = useCostStore()
  const [editing, setEditing] = useState<IrregularEvent | null>(null)
  const [showForm, setShowForm] = useState(false)
  const monthly = calcIrregularEventsMonthly(irregularEvents)

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">不定期イベント</h2>
          <p className="text-sm text-slate-500">数ヶ月に1回行う予定のイベントを登録します</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          ＋ 追加
        </button>
      </div>

      {(showForm || editing) && (
        <EventForm initial={editing ?? undefined} onClose={() => { setShowForm(false); setEditing(null) }} />
      )}

      {irregularEvents.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <p className="text-3xl mb-2">✨</p>
          <p className="text-sm">不定期イベントがまだ登録されていません</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {irregularEvents.map((e) => (
                <li key={e.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{e.name}</p>
                    <p className="text-xs text-slate-500">
                      {e.intervalMonths}ヶ月に1回 · {formatYen(e.costPerOccurrence)}
                      <span className="ml-1 text-slate-400">（月割: {formatYen(e.costPerOccurrence / e.intervalMonths)}）</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditing(e); setShowForm(false) }}
                      className="text-xs px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors">編集</button>
                    <button onClick={() => removeIrregularEvent(e.id)}
                      className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded transition-colors">削除</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-indigo-50 rounded-xl p-4 flex justify-between items-center">
            <span className="text-sm font-medium text-indigo-700">不定期イベント合計（月額換算）</span>
            <span className="text-lg font-bold text-indigo-700">{formatYen(monthly)}</span>
          </div>
        </>
      )}
    </div>
  )
}
