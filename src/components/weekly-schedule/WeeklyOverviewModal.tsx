import { useEffect, useRef, useState } from 'react'
import { useCostStore } from '../../store/useCostStore'
import { DAY_NAMES, TOTAL_SLOTS, slotToTimeStr, slotToHourLabel } from '../../types'
import { formatYen } from '../../utils/calculations'

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

const HEADER_H = 40  // 曜日ヘッダー高さ(px)
const COL_W    = 96  // 列幅(px)
const TIME_W   = 40  // 時刻ラベル幅(px)
const MIN_SLOT_H = 4 // スロット高さの下限(px)

interface DayColumnProps {
  dayOfWeek: number
  slotH: number
}

function DayColumn({ dayOfWeek, slotH }: DayColumnProps) {
  const { schedules } = useCostStore()
  const day        = schedules.find((d) => d.dayOfWeek === dayOfWeek)
  const activities = day?.activities ?? []

  const colorMap = new Map(
    activities.map((a, idx) => [a.id, ACTIVITY_COLORS[idx % ACTIVITY_COLORS.length]])
  )

  const totalH = TOTAL_SLOTS * slotH

  return (
    <div className="relative flex-shrink-0" style={{ width: COL_W, height: totalH }}>
      {/* グリッド線 */}
      {Array.from({ length: TOTAL_SLOTS }, (_, i) => (
        <div
          key={i}
          className={`absolute w-full pointer-events-none ${
            i % 2 === 0 ? 'border-t border-slate-200' : 'border-t border-dashed border-slate-100'
          }`}
          style={{ top: i * slotH, height: slotH }}
        />
      ))}

      {/* 深夜帯 */}
      <div
        className="absolute w-full bg-slate-50 opacity-60 pointer-events-none"
        style={{ top: 36 * slotH, height: 12 * slotH }}
      />

      {/* アクティビティブロック */}
      {activities.map((a) => {
        const top    = a.startSlot * slotH + 1
        const height = Math.max(a.durationSlots * slotH - 2, 2)
        const color  = colorMap.get(a.id)!
        const showName = height >= 16
        const showTime = height >= slotH * 3
        const showCost = height >= slotH * 4 && a.costPerOccurrence > 0

        return (
          <div
            key={a.id}
            title={`${a.name}\n${slotToTimeStr(a.startSlot)}〜${slotToTimeStr(a.startSlot + a.durationSlots)}${a.costPerOccurrence > 0 ? `\n${formatYen(a.costPerOccurrence)}` : ''}`}
            className={`absolute left-0.5 right-0.5 rounded-r-sm overflow-hidden ${color}`}
            style={{ top, height, paddingLeft: 2, paddingRight: 2, paddingTop: 1 }}
          >
            {showName && (
              <p className="text-[10px] font-semibold leading-tight truncate">{a.name}</p>
            )}
            {showTime && (
              <p className="text-[9px] opacity-70 leading-tight">
                {slotToTimeStr(a.startSlot)}〜{slotToTimeStr(a.startSlot + a.durationSlots)}
              </p>
            )}
            {showCost && (
              <p className="text-[9px] opacity-70 leading-tight">
                {formatYen(a.costPerOccurrence)}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface Props {
  onClose: () => void
}

export default function WeeklyOverviewModal({ onClose }: Props) {
  const { schedules }   = useCostStore()
  const containerRef    = useRef<HTMLDivElement>(null)
  const [slotH, setSlotH] = useState(20)

  // コンテナ高さに合わせてスロット高さを動的計算
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const calc = () => {
      const available = el.clientHeight - HEADER_H
      const h = Math.max(Math.floor(available / TOTAL_SLOTS), MIN_SLOT_H)
      setSlotH(h)
    }
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ESC キーで閉じる
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // body スクロールを止める
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const totalH = TOTAL_SLOTS * slotH

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* モーダルヘッダー */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white flex-shrink-0">
        <h2 className="text-base font-semibold text-slate-800">週間スケジュール一覧</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 transition-colors text-xl leading-none px-2 py-1 rounded hover:bg-slate-100"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>

      {/* タイムライン本体（縦スクロールなし・横スクロールのみ） */}
      <div ref={containerRef} className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
        <div className="flex h-full" style={{ minWidth: TIME_W + COL_W * 7 }}>

          {/* 時刻ラベル列（左固定） */}
          <div className="sticky left-0 z-10 bg-white border-r border-slate-200 flex-shrink-0" style={{ width: TIME_W }}>
            {/* 曜日ヘッダー分スペーサー */}
            <div style={{ height: HEADER_H }} className="border-b border-slate-200" />
            <div className="relative" style={{ height: totalH }}>
              {Array.from({ length: 25 }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-full flex items-start justify-end pr-1 pt-0.5"
                  style={{ top: i * slotH * 2 }}
                >
                  <span className={`text-[9px] leading-none ${i >= 18 ? 'text-blue-400' : 'text-slate-400'}`}>
                    {slotToHourLabel(i)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 7曜日列 */}
          {DAY_ORDER.map((d) => {
            const colorClass  = DAY_COLORS[d] ?? 'text-slate-700'
            const daySchedule = schedules.find((s) => s.dayOfWeek === d)
            const count       = daySchedule?.activities.length ?? 0

            return (
              <div key={d} className="flex-shrink-0 flex flex-col" style={{ width: COL_W }}>
                {/* 曜日ヘッダー */}
                <div
                  className="bg-white border-b border-r border-slate-200 flex flex-col items-center justify-center flex-shrink-0"
                  style={{ height: HEADER_H }}
                >
                  <span className={`text-sm font-bold ${colorClass}`}>{DAY_NAMES[d]}</span>
                  {count > 0 && (
                    <span className="text-[9px] text-slate-400">{count}件</span>
                  )}
                </div>

                {/* タイムライン */}
                <div className="border-r border-slate-100 flex-shrink-0">
                  <DayColumn dayOfWeek={d} slotH={slotH} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
