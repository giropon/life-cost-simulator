import { useEffect, useRef, useState, useMemo } from 'react'
import { useCostStore } from '../../store/useCostStore'
import { DAY_NAMES, TOTAL_SLOTS, slotToTimeStr } from '../../types'
import { formatYen } from '../../utils/calculations'
import type { Activity, DaySchedule } from '../../types'

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

const DAY_COLORS: Record<number, string> = {
  0: 'text-red-500',
  6: 'text-blue-500',
}

const ACTIVITY_COLORS = [
  'bg-indigo-100 border-l-2 border-l-indigo-400 text-indigo-900',
  'bg-cyan-100 border-l-2 border-l-cyan-400 text-cyan-900',
  'bg-amber-100 border-l-2 border-l-amber-400 text-amber-900',
  'bg-emerald-100 border-l-2 border-l-emerald-400 text-emerald-900',
  'bg-rose-100 border-l-2 border-l-rose-400 text-rose-900',
  'bg-violet-100 border-l-2 border-l-violet-400 text-violet-900',
  'bg-orange-100 border-l-2 border-l-orange-400 text-orange-900',
  'bg-teal-100 border-l-2 border-l-teal-400 text-teal-900',
]

const HEADER_H  = 40
const COL_W     = 96
const TIME_W    = 44
const MIN_SLOT_H = 4
// 圧縮フリンジゾーンの高さ（スロット高さの2倍 = 1時間分）
const FRINGE_SLOTS = 2

interface DisplayParams {
  coreStart:       number   // 表示開始スロット
  coreEnd:         number   // 表示終了スロット
  hasFringeTop:    boolean  // 上端に圧縮ゾーンあり
  hasFringeBottom: boolean  // 下端に圧縮ゾーンあり
  fringeTopLabel:  string   // 例: "〜08:00"
  fringeBottomLabel: string // 例: "24:00〜"
  effectiveStart:  number
  effectiveEnd:    number
}

function computeDisplayParams(schedules: DaySchedule[]): DisplayParams {
  const nonEmptyDayActs = DAY_ORDER
    .map(d => schedules.find(s => s.dayOfWeek === d)?.activities ?? [])
    .filter(acts => acts.length > 0)

  if (nonEmptyDayActs.length === 0) {
    return {
      coreStart: 0, coreEnd: TOTAL_SLOTS,
      hasFringeTop: false, hasFringeBottom: false,
      fringeTopLabel: '', fringeBottomLabel: '',
      effectiveStart: 0, effectiveEnd: TOTAL_SLOTS,
    }
  }

  const allActs = nonEmptyDayActs.flat()
  const effectiveStart = Math.min(...allActs.map(a => a.startSlot))
  const effectiveEnd   = Math.max(...allActs.map(a => a.startSlot + a.durationSlots))

  // 上端フリンジ検出: 全曜日で effectiveStart から始まるタスクがあり、かつ2スロット超の幅がある
  const topFringeCandidates = nonEmptyDayActs.map(acts =>
    acts.filter(a => a.startSlot === effectiveStart)
  )
  const allHaveTopFringe = topFringeCandidates.every(acts => acts.length > 0)
  const minTopFringeEnd = allHaveTopFringe
    ? Math.min(...topFringeCandidates.map(acts =>
        Math.min(...acts.map(a => a.startSlot + a.durationSlots))
      ))
    : effectiveStart

  const hasFringeTop = allHaveTopFringe && (minTopFringeEnd - effectiveStart) > FRINGE_SLOTS
  const coreStart = hasFringeTop ? minTopFringeEnd : effectiveStart
  const fringeTopLabel = hasFringeTop ? `〜${slotToTimeStr(coreStart)}` : ''

  // 下端フリンジ検出: 全曜日で effectiveEnd で終わるタスクがあり、かつ2スロット超の幅がある
  const bottomFringeCandidates = nonEmptyDayActs.map(acts =>
    acts.filter(a => a.startSlot + a.durationSlots === effectiveEnd)
  )
  const allHaveBottomFringe = bottomFringeCandidates.every(acts => acts.length > 0)
  const maxBottomFringeStart = allHaveBottomFringe
    ? Math.max(...bottomFringeCandidates.map(acts =>
        Math.max(...acts.map(a => a.startSlot))
      ))
    : effectiveEnd

  const hasFringeBottom = allHaveBottomFringe && (effectiveEnd - maxBottomFringeStart) > FRINGE_SLOTS
  const coreEnd = hasFringeBottom ? maxBottomFringeStart : effectiveEnd
  const fringeBottomLabel = hasFringeBottom ? `${slotToTimeStr(coreEnd)}〜` : ''

  return {
    coreStart, coreEnd,
    hasFringeTop, hasFringeBottom,
    fringeTopLabel, fringeBottomLabel,
    effectiveStart, effectiveEnd,
  }
}

// ──────────────────────────────────────────
// まとめ表示: 曜日グループ計算
// ──────────────────────────────────────────

interface DayGroup {
  days:       number[]
  activities: Activity[]
  label:      string
}

function activitySignature(a: Activity): string {
  return `${a.name}|${a.startSlot}|${a.durationSlots}|${a.costPerOccurrence}`
}

function daySignature(activities: Activity[]): string {
  return [...activities]
    .sort((a, b) => a.startSlot - b.startSlot || a.name.localeCompare(b.name))
    .map(activitySignature)
    .join(';;')
}

function makeDayLabel(days: number[]): string {
  const inOrder = [...days].sort((a, b) => DAY_ORDER.indexOf(a as typeof DAY_ORDER[number]) - DAY_ORDER.indexOf(b as typeof DAY_ORDER[number]))
  if (inOrder.length === 7) return '毎日'
  const weekdays = [1, 2, 3, 4, 5]
  const weekends = [0, 6]
  if (inOrder.length === 5 && weekdays.every(d => inOrder.includes(d))) return '平日'
  if (inOrder.length === 2 && weekends.every(d => inOrder.includes(d))) return '土日'
  return inOrder.map(d => DAY_NAMES[d]).join('/')
}

function computeDayGroups(schedules: DaySchedule[]): DayGroup[] {
  const sigMap = new Map<string, number[]>()
  DAY_ORDER.forEach(d => {
    const acts = schedules.find(s => s.dayOfWeek === d)?.activities ?? []
    const sig = daySignature(acts)
    if (!sigMap.has(sig)) sigMap.set(sig, [])
    sigMap.get(sig)!.push(d)
  })

  return Array.from(sigMap.entries()).map(([, days]) => {
    const activities = schedules.find(s => s.dayOfWeek === days[0])?.activities ?? []
    return { days, activities, label: makeDayLabel(days) }
  })
}

// ──────────────────────────────────────────
// DayColumn
// ──────────────────────────────────────────

interface DayColumnProps {
  activities: Activity[]
  slotH: number
  dp: DisplayParams
}

function DayColumn({ activities, slotH, dp }: DayColumnProps) {
  const { coreStart, coreEnd, hasFringeTop, hasFringeBottom, fringeTopLabel, fringeBottomLabel } = dp

  const fringeH   = FRINGE_SLOTS * slotH
  const coreH     = (coreEnd - coreStart) * slotH
  const topOffset = hasFringeTop ? fringeH : 0
  const totalH    = topOffset + coreH + (hasFringeBottom ? fringeH : 0)

  const colorMap = new Map(
    activities.map((a, idx) => [a.id, ACTIVITY_COLORS[idx % ACTIVITY_COLORS.length]])
  )

  // スロットをY座標に変換
  const slotToY = (slot: number): number => {
    if (slot <= coreStart) return topOffset
    if (slot >= coreEnd)   return topOffset + coreH
    return topOffset + (slot - coreStart) * slotH
  }

  // フリンジゾーンのアクティビティ分類
  const topFringeActs    = activities.filter(a => hasFringeTop && a.startSlot < coreStart)
  const bottomFringeActs = activities.filter(a => hasFringeBottom && a.startSlot >= coreEnd)
  const coreActs         = activities.filter(a => {
    if (hasFringeTop && a.startSlot < coreStart) return false
    if (hasFringeBottom && a.startSlot >= coreEnd) return false
    return true
  })

  return (
    <div className="relative flex-shrink-0" style={{ width: COL_W, height: totalH }}>

      {/* 上端圧縮ゾーン */}
      {hasFringeTop && (
        <div
          className="absolute w-full bg-slate-100 border-b border-slate-300 overflow-hidden flex flex-col justify-center items-start px-1"
          style={{ top: 0, height: fringeH }}
        >
          <span className="text-[9px] text-slate-500 font-medium leading-tight">{fringeTopLabel}</span>
          {topFringeActs.map(a => (
            <span key={a.id} className="text-[8px] text-slate-400 leading-tight truncate w-full">{a.name}</span>
          ))}
        </div>
      )}

      {/* グリッド線（コアゾーン） */}
      {Array.from({ length: coreEnd - coreStart }, (_, i) => (
        <div
          key={i}
          className={`absolute w-full pointer-events-none ${
            i % 2 === 0 ? 'border-t border-slate-200' : 'border-t border-dashed border-slate-100'
          }`}
          style={{ top: topOffset + i * slotH, height: slotH }}
        />
      ))}

      {/* コアアクティビティ（コアゾーン内） */}
      {coreActs.map(a => {
        const clampedStart = Math.max(a.startSlot, coreStart)
        const clampedEnd   = Math.min(a.startSlot + a.durationSlots, coreEnd)
        const top          = slotToY(clampedStart) + 1
        const height       = Math.max(slotToY(clampedEnd) - top - 2, 2)
        const color        = colorMap.get(a.id)!
        const showName     = height >= 16
        const showTime     = height >= slotH * 3
        const showCost     = height >= slotH * 4 && a.costPerOccurrence > 0

        return (
          <div
            key={a.id}
            title={`${a.name}\n${slotToTimeStr(a.startSlot)}〜${slotToTimeStr(a.startSlot + a.durationSlots)}${a.costPerOccurrence > 0 ? `\n${formatYen(a.costPerOccurrence)}` : ''}`}
            className={`absolute left-0.5 right-0.5 rounded-r-sm overflow-hidden ${color}`}
            style={{ top, height, paddingLeft: 2, paddingRight: 2, paddingTop: 1 }}
          >
            {showName && <p className="text-[10px] font-semibold leading-tight truncate">{a.name}</p>}
            {showTime && (
              <p className="text-[9px] opacity-70 leading-tight">
                {slotToTimeStr(a.startSlot)}〜{slotToTimeStr(a.startSlot + a.durationSlots)}
              </p>
            )}
            {showCost && <p className="text-[9px] opacity-70 leading-tight">{formatYen(a.costPerOccurrence)}</p>}
          </div>
        )
      })}

      {/* 下端圧縮ゾーン */}
      {hasFringeBottom && (
        <div
          className="absolute w-full bg-slate-100 border-t border-slate-300 overflow-hidden flex flex-col justify-center items-start px-1"
          style={{ top: topOffset + coreH, height: fringeH }}
        >
          <span className="text-[9px] text-slate-500 font-medium leading-tight">{fringeBottomLabel}</span>
          {bottomFringeActs.map(a => (
            <span key={a.id} className="text-[8px] text-slate-400 leading-tight truncate w-full">{a.name}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────
// WeeklyOverviewModal
// ──────────────────────────────────────────

interface Props {
  onClose: () => void
}

export default function WeeklyOverviewModal({ onClose }: Props) {
  const { schedules }   = useCostStore()
  const containerRef    = useRef<HTMLDivElement>(null)
  const [slotH, setSlotH]         = useState(20)
  const [summarize, setSummarize] = useState(false)

  const dp         = useMemo(() => computeDisplayParams(schedules), [schedules])
  const dayGroups  = useMemo(() => computeDayGroups(schedules), [schedules])

  const fringeH  = FRINGE_SLOTS * slotH
  const coreH    = (dp.coreEnd - dp.coreStart) * slotH
  const topOffset = dp.hasFringeTop ? fringeH : 0
  const totalH   = topOffset + coreH + (dp.hasFringeBottom ? fringeH : 0)

  // 表示列（通常 or まとめ）
  const columns: { key: string; label: string; colorClass: string; activities: Activity[] }[] =
    summarize
      ? dayGroups.map(g => ({
          key: g.days.join('-'),
          label: g.label,
          colorClass: g.days.length === 1
            ? (DAY_COLORS[g.days[0]] ?? 'text-slate-700')
            : 'text-slate-700',
          activities: g.activities,
        }))
      : DAY_ORDER.map(d => ({
          key: String(d),
          label: DAY_NAMES[d],
          colorClass: DAY_COLORS[d] ?? 'text-slate-700',
          activities: schedules.find(s => s.dayOfWeek === d)?.activities ?? [],
        }))

  // コンテナ高さに合わせてスロット高さを動的計算
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const calc = () => {
      const available = el.clientHeight - HEADER_H
      const visibleSlots = (dp.coreEnd - dp.coreStart)
        + (dp.hasFringeTop    ? FRINGE_SLOTS : 0)
        + (dp.hasFringeBottom ? FRINGE_SLOTS : 0)
      const h = Math.max(Math.floor(available / Math.max(visibleSlots, 1)), MIN_SLOT_H)
      setSlotH(h)
    }
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [dp])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // 時刻ラベル生成（コアゾーン内の偶数スロット = 1時間ごと）
  const firstLabelSlot = dp.coreStart % 2 === 0 ? dp.coreStart : dp.coreStart + 1
  const timeLabels: { slot: number; y: number; label: string }[] = []
  for (let s = firstLabelSlot; s <= dp.coreEnd; s += 2) {
    const y = topOffset + (s - dp.coreStart) * slotH
    const totalMins = s * 30 + 6 * 60
    const h = Math.floor(totalMins / 60) % 24
    const isNextDay = totalMins >= 24 * 60
    timeLabels.push({ slot: s, y, label: `${isNextDay ? '翌' : ''}${String(h).padStart(2, '0')}:00` })
  }

  const minColW = TIME_W + COL_W * columns.length

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* モーダルヘッダー */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white flex-shrink-0">
        <h2 className="text-base font-semibold text-slate-800">週間スケジュール一覧</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSummarize(v => !v)}
            className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
              summarize
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            まとめ表示
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors text-xl leading-none px-2 py-1 rounded hover:bg-slate-100"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
      </div>

      {/* タイムライン本体 */}
      <div ref={containerRef} className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
        <div className="flex h-full" style={{ minWidth: minColW }}>

          {/* 時刻ラベル列（左固定） */}
          <div className="sticky left-0 z-10 bg-white border-r border-slate-200 flex-shrink-0" style={{ width: TIME_W }}>
            <div style={{ height: HEADER_H }} className="border-b border-slate-200" />
            <div className="relative" style={{ height: totalH }}>
              {/* 上端フリンジラベル */}
              {dp.hasFringeTop && (
                <div
                  className="absolute w-full flex items-center justify-end pr-1"
                  style={{ top: 0, height: fringeH }}
                >
                  <span className="text-[8px] text-slate-400 leading-none text-right">
                    {dp.fringeTopLabel}
                  </span>
                </div>
              )}

              {/* コアゾーン時刻ラベル */}
              {timeLabels.map(({ slot, y, label }) => (
                <div
                  key={slot}
                  className="absolute w-full flex items-start justify-end pr-1 pt-0.5"
                  style={{ top: y }}
                >
                  <span className={`text-[9px] leading-none ${
                    slot >= (18 * 2) ? 'text-blue-400' : 'text-slate-400'
                  }`}>
                    {label}
                  </span>
                </div>
              ))}

              {/* 下端フリンジラベル */}
              {dp.hasFringeBottom && (
                <div
                  className="absolute w-full flex items-center justify-end pr-1"
                  style={{ top: topOffset + coreH, height: fringeH }}
                >
                  <span className="text-[8px] text-slate-400 leading-none text-right">
                    {dp.fringeBottomLabel}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 曜日列 */}
          {columns.map(col => {
            const count = col.activities.length
            return (
              <div key={col.key} className="flex-shrink-0 flex flex-col" style={{ width: COL_W }}>
                {/* 曜日ヘッダー */}
                <div
                  className="bg-white border-b border-r border-slate-200 flex flex-col items-center justify-center flex-shrink-0"
                  style={{ height: HEADER_H }}
                >
                  <span className={`text-sm font-bold ${col.colorClass}`}>{col.label}</span>
                  {count > 0 && (
                    <span className="text-[9px] text-slate-400">{count}件</span>
                  )}
                </div>

                {/* タイムライン */}
                <div className="border-r border-slate-100 flex-shrink-0">
                  <DayColumn activities={col.activities} slotH={slotH} dp={dp} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
