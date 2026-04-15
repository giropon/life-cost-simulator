import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useCostStore } from '../../store/useCostStore'
import { slotToTimeStr, TOTAL_SLOTS, FIXED_COST_CATEGORIES } from '../../types'
import type { Activity, BillingFrequency } from '../../types'

const DURATION_OPTIONS = [
  { slots: 1, label: '30分' },
  { slots: 2, label: '1時間' },
  { slots: 3, label: '1時間30分' },
  { slots: 4, label: '2時間' },
  { slots: 6, label: '3時間' },
  { slots: 8, label: '4時間' },
  { slots: 12, label: '6時間' },
  { slots: 16, label: '8時間' },
]

const BILLING_OPTIONS: { value: BillingFrequency; label: string }[] = [
  { value: '1回', label: '1回ごと' },
  { value: '週',  label: '週ごと' },
  { value: '月',  label: '月ごと' },
  { value: '年',  label: '年ごと' },
]

type ApplyMode = 'single' | 'all' | 'weekdays'

interface Props {
  dayOfWeek: number
  startSlot: number
  onStartSlotChange?: (slot: number) => void
  initial?: Activity
  onClose: () => void
}

export default function ActivityForm({ dayOfWeek, startSlot, onStartSlotChange, initial, onClose }: Props) {
  const { addActivity, updateActivity, removeActivity, addFixedCost, updateFixedCost, removeFixedCost, fixedCosts } = useCostStore()

  const [name, setName]                   = useState(initial?.name ?? '')
  const [cost, setCost]                   = useState(String(initial?.costPerOccurrence ?? ''))
  const [localStartSlot, setLocalStartSlot] = useState(initial?.startSlot ?? startSlot)
  const [durationSlots, setDurationSlots] = useState(initial?.durationSlots ?? 2)
  const [applyMode, setApplyMode]         = useState<ApplyMode>('single')
  const [billingFreq, setBillingFreq]     = useState<BillingFrequency>(initial?.billingFrequency ?? '1回')
  const [category, setCategory]           = useState(initial?.category ?? 'その他')

  const isRecurring = billingFreq !== '1回'

  const toggleApplyMode = (mode: 'all' | 'weekdays') =>
    setApplyMode((prev) => (prev === mode ? 'single' : mode))

  const currentStartSlot = initial ? localStartSlot : startSlot
  const handleStartSlotChange = (val: number) => {
    if (initial) setLocalStartSlot(val)
    else onStartSlotChange?.(val)
  }

  // billingFrequency → FixedCost.frequency のマッピング
  const toFcFrequency = (bf: BillingFrequency) =>
    bf === '年' ? 'yearly' as const : bf === '週' ? 'weekly' as const : 'monthly' as const

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // ── FixedCost の作成 / 更新 / 削除 ──
    let linkedFixedCostId = initial?.linkedFixedCostId

    if (isRecurring) {
      const fcPayload = {
        name,
        amount: Number(cost),
        frequency: toFcFrequency(billingFreq),
        category,
        source: 'activity' as const,
      }
      if (linkedFixedCostId && fixedCosts.some(fc => fc.id === linkedFixedCostId)) {
        // 既存リンク先を更新
        updateFixedCost(linkedFixedCostId, fcPayload)
      } else {
        // 新規作成
        linkedFixedCostId = uuidv4()
        addFixedCost(fcPayload, linkedFixedCostId)
      }
    } else if (linkedFixedCostId) {
      // 繰り返し → 1回 に変更: リンク先を削除
      removeFixedCost(linkedFixedCostId)
      linkedFixedCostId = undefined
    }

    const data: Omit<Activity, 'id'> = {
      name,
      costPerOccurrence: Number(cost),
      startSlot: currentStartSlot,
      durationSlots,
      billingFrequency: billingFreq,
      category: isRecurring ? category : undefined,
      linkedFixedCostId,
    }

    if (initial) {
      updateActivity(dayOfWeek, initial.id, data)
      // 編集時の適用範囲（他の曜日に同じデータを追加）
      if (applyMode !== 'single') {
        const otherDays = (applyMode === 'all' ? [0,1,2,3,4,5,6] : [1,2,3,4,5])
          .filter(d => d !== dayOfWeek)
        otherDays.forEach(d => addActivity(d, data))
      }
    } else {
      const targetDays =
        applyMode === 'all'      ? [0,1,2,3,4,5,6] :
        applyMode === 'weekdays' ? [1,2,3,4,5] :
                                   [dayOfWeek]
      targetDays.forEach(d => addActivity(d, data))
    }

    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-indigo-200 shadow-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">
        {initial ? 'タスクを編集' : 'タスクを追加'}
      </h3>

      <div className="space-y-3">
        {/* タスク名 */}
        <div>
          <label className="text-xs text-slate-500 mb-1 block">タスク名</label>
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 朝食、ジム、カフェ作業"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        {/* 開始時刻・所要時間 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">開始時刻</label>
            <select
              value={currentStartSlot}
              onChange={(e) => handleStartSlotChange(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {Array.from({ length: TOTAL_SLOTS }, (_, i) => (
                <option key={i} value={i}>{slotToTimeStr(i)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">時間</label>
            <select
              value={durationSlots}
              onChange={(e) => setDurationSlots(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {DURATION_OPTIONS.map(o => (
                <option key={o.slots} value={o.slots}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 適用範囲 */}
        <div>
          <label className="text-xs text-slate-500 mb-1.5 block">適用範囲</label>
          <div className="flex gap-2">
            {([
              { mode: 'all',      label: '毎日に適用' },
              { mode: 'weekdays', label: '平日のみ適用' },
            ] as const).map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => toggleApplyMode(mode)}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                  applyMode === mode
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {applyMode !== 'single' && (
            <p className="text-xs text-indigo-500 mt-1">
              {applyMode === 'all' ? '全曜日（日〜土）' : '月〜金'}に同じタスクを
              {initial ? '追加します（現在の曜日は更新）' : '登録します'}
            </p>
          )}
        </div>

        {/* 費用 + 請求頻度 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">費用（円）</label>
            <input
              required
              type="number"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="例: 800"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">請求単位</label>
            <select
              value={billingFreq}
              onChange={(e) => setBillingFreq(e.target.value as BillingFrequency)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {BILLING_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* カテゴリ（繰り返し請求時のみ） */}
        {isRecurring && (
          <div>
            <label className="text-xs text-slate-500 mb-1 block">カテゴリ（固定費）</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {FIXED_COST_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <p className="text-xs text-amber-600 mt-1">
              「固定費」タブに <strong>{billingFreq}ごと ¥{Number(cost).toLocaleString()}</strong> として自動登録されます
            </p>
          </div>
        )}
      </div>

      {/* フッター */}
      <div className="flex gap-2 pt-1">
        {initial && (
          <button
            type="button"
            onClick={() => { removeActivity(dayOfWeek, initial.id); onClose() }}
            className="px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
          >
            削除
          </button>
        )}
        <div className="flex gap-2 ml-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {initial ? '更新' : '追加'}
          </button>
        </div>
      </div>
    </form>
  )
}
