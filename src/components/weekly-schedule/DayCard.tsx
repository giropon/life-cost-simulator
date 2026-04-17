import { Fragment, useState, useRef, useEffect } from 'react'
import { useCostStore } from '../../store/useCostStore'
import { formatYen } from '../../utils/calculations'
import { slotToTimeStr, slotToHourLabel, TOTAL_SLOTS, SLOT_HEIGHT } from '../../types'
import type { Activity } from '../../types'
import ActivityForm from './ActivityForm'

const ACTIVITY_COLORS = [
  'bg-indigo-100 border-l-4 border-l-indigo-400 text-indigo-900',
  'bg-cyan-100 border-l-4 border-l-cyan-400 text-cyan-900',
  'bg-amber-100 border-l-4 border-l-amber-400 text-amber-900',
  'bg-emerald-100 border-l-4 border-l-emerald-400 text-emerald-900',
  'bg-rose-100 border-l-4 border-l-rose-400 text-rose-900',
  'bg-violet-100 border-l-4 border-l-violet-400 text-violet-900',
  'bg-orange-100 border-l-4 border-l-orange-400 text-orange-900',
  'bg-teal-100 border-l-4 border-l-teal-400 text-teal-900',
]

const TAB_W = 20 // 背面タブ1枚あたりの幅(px)

// ──────────────────────────────────────────
// ヘルパー
// ──────────────────────────────────────────

function doOverlap(a: Activity, b: Activity): boolean {
  return a.startSlot < b.startSlot + b.durationSlots &&
         b.startSlot < a.startSlot + a.durationSlots
}

/** 重複するタスクを Union-Find でグループ化 */
function getOverlapGroups(activities: Activity[]): Activity[][] {
  const n = activities.length
  if (n === 0) return []
  const parent = Array.from({ length: n }, (_, i) => i)
  function find(i: number): number {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i] }
    return i
  }
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      if (doOverlap(activities[i], activities[j])) {
        const ri = find(i), rj = find(j)
        if (ri !== rj) parent[ri] = rj
      }
  const map = new Map<number, Activity[]>()
  for (let i = 0; i < n; i++) {
    const r = find(i)
    if (!map.has(r)) map.set(r, [])
    map.get(r)!.push(activities[i])
  }
  return Array.from(map.values())
}

function groupKey(group: Activity[]): string {
  return group.reduce((m, a) => (a.id < m ? a.id : m), group[0].id)
}

interface DisplaySegment {
  startSlot: number
  endSlot: number
  tasks: Activity[]
}

/**
 * タスクの開始/終了スロットを境界点として時間軸をセグメントに分割する。
 * 各セグメント内ではアクティブなタスクセットが一定。
 */
function computeSegments(activities: Activity[]): DisplaySegment[] {
  if (activities.length === 0) return []
  const pts = new Set<number>()
  for (const a of activities) { pts.add(a.startSlot); pts.add(a.startSlot + a.durationSlots) }
  const sorted = [...pts].sort((a, b) => a - b)
  const segs: DisplaySegment[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const s = sorted[i], e = sorted[i + 1]
    const tasks = activities.filter(a => a.startSlot <= s && a.startSlot + a.durationSlots >= e)
    if (tasks.length > 0) segs.push({ startSlot: s, endSlot: e, tasks })
  }
  return segs
}

/** セグメント内のタスクの top 座標 */
function segTop(seg: DisplaySegment, task: Activity): number {
  return seg.startSlot * SLOT_HEIGHT + (seg.startSlot === task.startSlot ? 1 : 0)
}

/** セグメント内のタスクの height（隣接セグメントと継ぎ目なし） */
function segHeight(seg: DisplaySegment, task: Activity): number {
  const first = seg.startSlot === task.startSlot
  const last  = seg.endSlot   === task.startSlot + task.durationSlots
  const raw   = (seg.endSlot - seg.startSlot) * SLOT_HEIGHT
  if (first && last) return raw - 2
  if (first || last) return raw - 1
  return raw
}

/** 角丸クラス：タスクの先頭/末尾セグメントのみ丸める */
function segRounding(seg: DisplaySegment, task: Activity): string {
  const first = seg.startSlot === task.startSlot
  const last  = seg.endSlot   === task.startSlot + task.durationSlots
  if (first && last) return 'rounded-r-md'
  if (first) return 'rounded-tr-md'
  if (last)  return 'rounded-br-md'
  return ''
}

// ──────────────────────────────────────────
// DragInfo
// ──────────────────────────────────────────

interface DragInfo {
  activity: Activity
  offsetSlots: number
  startY: number
  hasDragged: boolean
  currentSlot: number
}

interface Props { dayOfWeek: number }

// ──────────────────────────────────────────
// コンポーネント
// ──────────────────────────────────────────

export default function DayCard({ dayOfWeek }: Props) {
  const { schedules, removeActivity, updateActivity } = useCostStore()
  const day = schedules.find((d) => d.dayOfWeek === dayOfWeek)!
  const gridRef = useRef<HTMLDivElement>(null)
  const dragInfoRef = useRef<DragInfo | null>(null)

  const [showForm, setShowForm]       = useState(false)
  const [formSlot, setFormSlot]       = useState(0)
  const [editing, setEditing]         = useState<Activity | null>(null)
  const [draggingId, setDraggingId]   = useState<string | null>(null)
  const [dragSlot, setDragSlot]       = useState(0)
  // グループキー → 前面タスクID
  const [foregroundIds, setForegroundIds] = useState<Record<string, string>>({})

  function toDailyCost(a: Activity): number {
    if (!a.billingFrequency || a.billingFrequency === '1回') return a.costPerOccurrence
    if (a.billingFrequency === '月') return a.costPerOccurrence / 30
    if (a.billingFrequency === '週') return a.costPerOccurrence / 7
    if (a.billingFrequency === '年') return a.costPerOccurrence / 365
    return a.costPerOccurrence
  }
  const dayTotal = day.activities.reduce((s, a) => s + toDailyCost(a), 0)

  // 常に全タスクでグループ計算（ドラッグ中でも前面状態を保持）
  const overlapGroups = getOverlapGroups(day.activities)

  const getForeground = (group: Activity[]): Activity => {
    const fid = foregroundIds[groupKey(group)]
    return group.find((a) => a.id === fid) ?? group[0]
  }

  const bringToFront = (taskId: string) => {
    const group = overlapGroups.find(g => g.some(a => a.id === taskId))
    if (!group) return
    setForegroundIds(prev => ({ ...prev, [groupKey(group)]: taskId }))
  }

  // ドラッグ中タスクをセグメント計算から除外（ドラッグ中は別途フルブロックで描画）
  const segActivities = draggingId
    ? day.activities.filter(a => a.id !== draggingId)
    : day.activities
  const segments = computeSegments(segActivities)

  /** セグメント内の前面タスクを返す */
  const getSegForeground = (seg: DisplaySegment): Activity => {
    if (seg.tasks.length === 1) return seg.tasks[0]
    const group = overlapGroups.find(g => g.some(a => a.id === seg.tasks[0].id))
    if (!group) return seg.tasks[0]
    const gFg = getForeground(group)
    return seg.tasks.find(t => t.id === gFg.id) ?? seg.tasks[0]
  }

  // タスクIDごとに「最初に前面になるセグメントのstartSlot」を事前計算
  // → そのセグメントでのみ時刻・費用・削除ボタンを表示
  const firstFgSlot = new Map<string, number>()
  for (const seg of segments) {
    const fg = getSegForeground(seg)
    if (!firstFgSlot.has(fg.id)) firstFgSlot.set(fg.id, seg.startSlot)
  }

  // ──────────── ドラッグイベント ────────────
  useEffect(() => {
    if (!draggingId) return
    const handleMouseMove = (e: MouseEvent) => {
      const info = dragInfoRef.current
      if (!info || !gridRef.current) return
      if (!info.hasDragged && Math.abs(e.clientY - info.startY) > 4) info.hasDragged = true
      if (!info.hasDragged) return
      const rect = gridRef.current.getBoundingClientRect()
      const raw  = Math.floor((e.clientY - rect.top) / SLOT_HEIGHT) - info.offsetSlots
      const slot = Math.max(0, Math.min(TOTAL_SLOTS - info.activity.durationSlots, raw))
      info.currentSlot = slot
      setDragSlot(slot)
    }
    const handleMouseUp = () => {
      const info = dragInfoRef.current
      if (!info) return
      if (!info.hasDragged) {
        setEditing(info.activity); setShowForm(false)
      } else if (info.currentSlot !== info.activity.startSlot) {
        updateActivity(dayOfWeek, info.activity.id, {
          name: info.activity.name,
          costPerOccurrence: info.activity.costPerOccurrence,
          startSlot: info.currentSlot,
          durationSlots: info.activity.durationSlots,
        })
      }
      dragInfoRef.current = null
      setDraggingId(null)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingId, dayOfWeek, updateActivity])

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const slot = Math.floor((e.clientY - rect.top) / SLOT_HEIGHT)
    if (slot < 0 || slot >= TOTAL_SLOTS) return
    if (showForm && !editing) { setFormSlot(slot) }
    else { setFormSlot(slot); setEditing(null); setShowForm(true) }
  }

  const handleActivityMouseDown = (e: React.MouseEvent, activity: Activity) => {
    e.stopPropagation(); e.preventDefault()
    const rect = gridRef.current!.getBoundingClientRect()
    const clickedSlot  = Math.floor((e.clientY - rect.top) / SLOT_HEIGHT)
    const offsetSlots  = Math.max(0, Math.min(clickedSlot - activity.startSlot, activity.durationSlots - 1))
    dragInfoRef.current = { activity, offsetSlots, startY: e.clientY, hasDragged: false, currentSlot: activity.startSlot }
    setDragSlot(activity.startSlot)
    setDraggingId(activity.id)
  }

  const handleDelete = (e: React.MouseEvent, activityId: string) => {
    e.stopPropagation(); removeActivity(dayOfWeek, activityId)
  }

  const closeForm = () => { setShowForm(false); setEditing(null) }

  const colorMap = new Map(
    day.activities.map((a, idx) => [a.id, ACTIVITY_COLORS[idx % ACTIVITY_COLORS.length]])
  )
  const totalHeight = TOTAL_SLOTS * SLOT_HEIGHT

  // ──────────── レンダリング ────────────
  return (
    <div className="flex flex-col h-full">
      {dayTotal > 0 && (
        <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-500 flex justify-between">
          <span>1日合計</span>
          <span className="font-medium text-slate-700">{formatYen(dayTotal)}</span>
        </div>
      )}

      <div className="flex overflow-y-auto" style={{ maxHeight: 560 }}>
        {/* 時刻ラベル */}
        <div className="w-14 flex-shrink-0 select-none">
          {Array.from({ length: 25 }, (_, i) => (
            <div key={i} style={{ height: SLOT_HEIGHT * 2 }} className="flex items-start justify-end pr-2 pt-0.5">
              <span className={`text-xs ${i >= 18 ? 'text-blue-400' : 'text-slate-400'}`}>
                {slotToHourLabel(i)}
              </span>
            </div>
          ))}
        </div>

        {/* グリッド本体 */}
        <div
          ref={gridRef}
          className={`flex-1 relative select-none ${draggingId ? 'cursor-grabbing' : 'cursor-crosshair'}`}
          style={{ height: totalHeight }}
          onClick={handleGridClick}
        >
          {/* グリッド線 */}
          {Array.from({ length: TOTAL_SLOTS }, (_, i) => (
            <div key={i}
              className={`absolute w-full pointer-events-none ${i % 2 === 0 ? 'border-t border-slate-200' : 'border-t border-dashed border-slate-100'}`}
              style={{ top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
            />
          ))}
          {/* 深夜帯 */}
          <div className="absolute w-full bg-slate-50 opacity-60 pointer-events-none"
            style={{ top: 36 * SLOT_HEIGHT, height: 12 * SLOT_HEIGHT }} />

          {/* ─── セグメント単位でタスクブロックを描画 ─── */}
          {segments.map((seg) => {
            const fg   = getSegForeground(seg)
            const bgs  = seg.tasks.filter(t => t.id !== fg.id)
            const fgH  = segHeight(seg, fg)
            const fgColor = colorMap.get(fg.id)!

            // コンテンツ表示は「このタスクが最初に前面になるセグメント」のみ
            const isInfoSeg  = firstFgSlot.get(fg.id) === seg.startSlot
            const showTime   = fgH >= SLOT_HEIGHT * 1.5 && isInfoSeg
            const showCost   = fgH >= SLOT_HEIGHT * 2 && isInfoSeg && fg.costPerOccurrence > 0
            const segKey     = `${seg.startSlot}-${seg.endSlot}`

            return (
              <Fragment key={segKey}>
                {/* 前面タスクブロック */}
                <div
                  className={`absolute px-2 py-1 overflow-hidden group transition-shadow cursor-grab hover:brightness-95 ${fgColor} ${segRounding(seg, fg)}`}
                  style={{
                    top:    segTop(seg, fg),
                    left:   2,
                    right:  2 + bgs.length * TAB_W,
                    height: fgH,
                    zIndex: 10,
                  }}
                  onMouseDown={(e) => handleActivityMouseDown(e, fg)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1 overflow-hidden">
                      {isInfoSeg && <p className="text-xs font-semibold leading-tight truncate">{fg.name}</p>}
                      {showTime && (
                        <p className="text-xs opacity-70 mt-0.5">
                          {slotToTimeStr(fg.startSlot)}〜{slotToTimeStr(fg.startSlot + fg.durationSlots)}
                        </p>
                      )}
                      {showCost && (
                        <p className="text-xs opacity-70">
                          {formatYen(fg.costPerOccurrence)}
                          {fg.billingFrequency && fg.billingFrequency !== '1回' && `/${fg.billingFrequency}`}
                        </p>
                      )}
                    </div>
                    {isInfoSeg && (
                      <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => handleDelete(e, fg.id)}
                        className="opacity-0 group-hover:opacity-100 text-xs px-1 hover:bg-black/10 rounded flex-shrink-0 leading-none py-0.5"
                      >×</button>
                    )}
                  </div>
                </div>

                {/* 背面タスクのタブストリップ */}
                {bgs.map((bg, bgIdx) => {
                  const bgH     = segHeight(seg, bg)
                  const bgColor = colorMap.get(bg.id)!
                  // 前面タスクのすぐ右が最も手前の背面(bgIdx=0)
                  const tabRight   = 2 + (bgs.length - 1 - bgIdx) * TAB_W
                  // テキストはタスク本来の先頭セグメントのみ表示
                  const showLabel  = bgH >= SLOT_HEIGHT * 2 && seg.startSlot === bg.startSlot

                  return (
                    <div
                      key={`${segKey}-${bg.id}`}
                      title={bg.name}
                      className={`absolute overflow-hidden cursor-pointer hover:brightness-90 transition-all ${bgColor} ${segRounding(seg, bg)}`}
                      style={{
                        top:    segTop(seg, bg),
                        right:  tabRight,
                        width:  TAB_W,
                        height: bgH,
                        zIndex: 9 - bgIdx,
                      }}
                      onClick={(e) => { e.stopPropagation(); bringToFront(bg.id) }}
                    >
                      {showLabel && (
                        <div className="h-full flex items-center justify-center overflow-hidden">
                          <span className="text-xs font-semibold opacity-60 leading-none"
                            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                            {bg.name}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </Fragment>
            )
          })}

          {/* ドラッグ中タスク（セグメント分割なし・フルブロック） */}
          {(() => {
            if (!draggingId) return null
            const dt = day.activities.find(a => a.id === draggingId)
            if (!dt) return null
            const dtH = dt.durationSlots * SLOT_HEIGHT - 2
            return (
              <div
                className={`absolute rounded-r-md px-2 py-1 overflow-hidden opacity-85 shadow-xl cursor-grabbing ring-2 ring-indigo-400 ring-offset-1 ${colorMap.get(draggingId)!}`}
                style={{ top: dragSlot * SLOT_HEIGHT + 1, left: 2, right: 2, height: dtH, zIndex: 20 }}
              >
                <p className="text-xs font-semibold leading-tight truncate">{dt.name}</p>
                {dtH >= SLOT_HEIGHT * 1.5 && (
                  <p className="text-xs opacity-70 mt-0.5">
                    {slotToTimeStr(dragSlot)}〜{slotToTimeStr(dragSlot + dt.durationSlots)}
                  </p>
                )}
              </div>
            )
          })()}
        </div>
      </div>

      {/* フォーム */}
      {(showForm || editing) && (
        <div className="border-t border-slate-200 p-3">
          <ActivityForm
            key={editing?.id ?? 'new'}
            dayOfWeek={dayOfWeek}
            startSlot={editing ? editing.startSlot : formSlot}
            onStartSlotChange={!editing ? setFormSlot : undefined}
            initial={editing ?? undefined}
            onClose={closeForm}
          />
        </div>
      )}

      {!showForm && !editing && (
        <div className="p-2 border-t border-slate-100">
          <button
            onClick={() => { setFormSlot(14); setEditing(null); setShowForm(true) }}
            className="w-full text-xs text-slate-400 hover:text-indigo-500 py-1.5 border border-dashed border-slate-200 hover:border-indigo-300 rounded-lg transition-colors"
          >
            ＋ タスクを追加
          </button>
        </div>
      )}
    </div>
  )
}
