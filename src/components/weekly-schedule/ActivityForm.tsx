import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useCostStore } from '../../store/useCostStore'
import { slotToTimeStr, TOTAL_SLOTS, FIXED_COST_CATEGORIES, DAY_NAMES } from '../../types'
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

// 表示順: 月〜日
const DAY_ORDER_DISPLAY = [1, 2, 3, 4, 5, 6, 0] as const

interface Props {
  dayOfWeek: number
  startSlot: number
  onStartSlotChange?: (slot: number) => void
  initial?: Activity
  onClose: () => void
}

export default function ActivityForm({ dayOfWeek, startSlot, onStartSlotChange, initial, onClose }: Props) {
  const { addActivity, updateActivity, removeActivity, addFixedCost, updateFixedCost, removeFixedCost, fixedCosts, schedules } = useCostStore()

  const [name, setName]                   = useState(initial?.name ?? '')
  const [cost, setCost]                   = useState(String(initial?.costPerOccurrence ?? ''))
  const [localStartSlot, setLocalStartSlot] = useState(initial?.startSlot ?? startSlot)
  const [durationSlots, setDurationSlots] = useState(initial?.durationSlots ?? 2)
  const [billingFreq, setBillingFreq]     = useState<BillingFrequency>(initial?.billingFrequency ?? '1回')
  const [category, setCategory]           = useState(initial?.category ?? 'その他')

  // 適用曜日（現在の曜日は常に含む）
  const [selectedDays, setSelectedDays]   = useState<Set<number>>(() => new Set([dayOfWeek]))
  // 編集時: 他曜日も一括編集
  const [bulkEdit, setBulkEdit]           = useState(false)

  const isRecurring = billingFreq !== '1回'

  const toggleDay = (d: number) => {
    if (d === dayOfWeek) return
    setSelectedDays(prev => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d)
      else next.add(d)
      return next
    })
  }

  const applyPreset = (preset: 'all' | 'weekdays' | 'weekends') => {
    const days =
      preset === 'all'      ? [0, 1, 2, 3, 4, 5, 6] :
      preset === 'weekdays' ? [1, 2, 3, 4, 5] :
                              [0, 6]
    setSelectedDays(new Set(days))
  }

  const currentStartSlot = initial ? localStartSlot : startSlot
  const handleStartSlotChange = (val: number) => {
    if (initial) setLocalStartSlot(val)
    else onStartSlotChange?.(val)
  }

  const toFcFrequency = (bf: BillingFrequency) =>
    bf === '年' ? 'yearly' as const : bf === '週' ? 'weekly' as const : 'monthly' as const

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const costValue = cost === '' ? 0 : Number(cost)

    let linkedFixedCostId = initial?.linkedFixedCostId

    if (isRecurring) {
      const fcPayload = {
        name,
        amount: costValue,
        frequency: toFcFrequency(billingFreq),
        category,
        source: 'activity' as const,
      }
      if (linkedFixedCostId && fixedCosts.some(fc => fc.id === linkedFixedCostId)) {
        updateFixedCost(linkedFixedCostId, fcPayload)
      } else {
        linkedFixedCostId = uuidv4()
        addFixedCost(fcPayload, linkedFixedCostId)
      }
    } else if (linkedFixedCostId) {
      removeFixedCost(linkedFixedCostId)
      linkedFixedCostId = undefined
    }

    const data: Omit<Activity, 'id'> = {
      name,
      costPerOccurrence: costValue,
      startSlot: currentStartSlot,
      durationSlots,
      billingFrequency: billingFreq,
      category: isRecurring ? category : undefined,
      linkedFixedCostId,
    }

    if (initial) {
      // 現在の曜日を更新
      updateActivity(dayOfWeek, initial.id, data)

      // 他曜日も一括編集が有効な場合
      if (bulkEdit) {
        const otherDays = [...selectedDays].filter(d => d !== dayOfWeek)
        otherDays.forEach(d => {
          const daySchedule = schedules.find(s => s.dayOfWeek === d)
          const matchingAct = daySchedule?.activities.find(a =>
            a.name === initial.name &&
            a.startSlot === initial.startSlot &&
            a.durationSlots === initial.durationSlots &&
            a.costPerOccurrence === initial.costPerOccurrence
          )
          if (matchingAct) {
            updateActivity(d, matchingAct.id, data)
          }
        })
      }
    } else {
      // 新規追加: 選択した全曜日に追加
      const targetDays = [...selectedDays]
      targetDays.forEach(d => addActivity(d, data))
    }

    onClose()
  }

  // 編集時: 他曜日で同じタスクが存在するかを確認してハイライト
  const getDayMatchStatus = (d: number): 'current' | 'match' | 'no-match' => {
    if (d === dayOfWeek) return 'current'
    if (!initial) return 'no-match'
    const daySchedule = schedules.find(s => s.dayOfWeek === d)
    const hasMatch = daySchedule?.activities.some(a =>
      a.name === initial.name &&
      a.startSlot === initial.startSlot &&
      a.durationSlots === initial.durationSlots &&
      a.costPerOccurrence === initial.costPerOccurrence
    ) ?? false
    return hasMatch ? 'match' : 'no-match'
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

        {/* 適用範囲（新規追加時） / 他曜日一括編集（編集時） */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-slate-500">
              {initial ? '他曜日も一括編集' : '適用範囲'}
            </label>
            {initial && (
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkEdit}
                  onChange={(e) => setBulkEdit(e.target.checked)}
                  className="w-3.5 h-3.5 accent-indigo-600"
                />
                <span className="text-xs text-slate-600">他曜日も一括編集</span>
              </label>
            )}
          </div>

          {/* クイック選択ボタン */}
          {(!initial || bulkEdit) && (
            <div className="flex gap-1.5 mb-2">
              <button
                type="button"
                onClick={() => applyPreset('all')}
                className="flex-1 py-1 text-xs rounded border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              >
                毎日
              </button>
              <button
                type="button"
                onClick={() => applyPreset('weekdays')}
                className="flex-1 py-1 text-xs rounded border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              >
                平日のみ
              </button>
              <button
                type="button"
                onClick={() => applyPreset('weekends')}
                className="flex-1 py-1 text-xs rounded border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              >
                土日のみ
              </button>
            </div>
          )}

          {/* 曜日チェックボックス */}
          {(!initial || bulkEdit) && (
            <div className="flex gap-1">
              {DAY_ORDER_DISPLAY.map(d => {
                const matchStatus = getDayMatchStatus(d)
                const isCurrent = d === dayOfWeek
                const isChecked = selectedDays.has(d)
                const hasMatch = initial && matchStatus === 'match'

                return (
                  <label
                    key={d}
                    className={`flex flex-col items-center gap-0.5 flex-1 cursor-pointer ${
                      isCurrent ? 'cursor-default' : ''
                    }`}
                  >
                    <span className={`text-[10px] font-medium ${
                      d === 0 ? 'text-red-500' :
                      d === 6 ? 'text-blue-500' :
                      'text-slate-600'
                    }`}>
                      {DAY_NAMES[d]}
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleDay(d)}
                        disabled={isCurrent}
                        className="w-4 h-4 accent-indigo-600"
                      />
                      {initial && hasMatch && !isCurrent && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full" title="同じタスクが存在" />
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          )}

          {initial && bulkEdit && (
            <p className="text-[10px] text-indigo-500 mt-1">
              ●は同じタスク（名前・開始時刻・時間・費用が一致）が存在する曜日です
            </p>
          )}
          {!initial && (
            <p className="text-[10px] text-slate-400 mt-1">
              チェックした曜日に同じタスクを登録します
            </p>
          )}
        </div>

        {/* 費用 + 請求頻度 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">費用（円）</label>
            <input
              type="number"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="未入力の場合は¥0"
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
              「固定費」タブに <strong>{billingFreq}ごと ¥{(cost === '' ? 0 : Number(cost)).toLocaleString()}</strong> として自動登録されます
            </p>
          </div>
        )}
      </div>

      {/* フッター */}
      <div className="flex gap-2 pt-1">
        {initial && (
          <button
            type="button"
            onClick={() => {
              removeActivity(dayOfWeek, initial.id)
              if (bulkEdit) {
                const otherDays = [...selectedDays].filter(d => d !== dayOfWeek)
                otherDays.forEach(d => {
                  const daySchedule = schedules.find(s => s.dayOfWeek === d)
                  const matchingAct = daySchedule?.activities.find(a =>
                    a.name === initial.name &&
                    a.startSlot === initial.startSlot &&
                    a.durationSlots === initial.durationSlots &&
                    a.costPerOccurrence === initial.costPerOccurrence
                  )
                  if (matchingAct) removeActivity(d, matchingAct.id)
                })
              }
              onClose()
            }}
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
