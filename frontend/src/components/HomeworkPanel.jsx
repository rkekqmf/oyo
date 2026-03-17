import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DAILY_ITEMS, WEEKLY_ITEMS, RAID_ITEMS, getDefaultRaidIdsByLevel, RAID_GOLD_MOCK } from '../data/homeworkChecklist'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { fetchCharacterArmory, fetchCharacterSiblings } from '../services/lostarkApi'
import { getClassShortLabel, getClassIconSrc } from '../utils/classIcon'

const REGISTERED_KEY = 'oyo_homework_registered'
const EXPEDITION_CARDS_KEY = 'oyo_homework_expedition_cards'
const CARD_ORDER_KEY = 'oyo_homework_card_order'
const VIEW_MODE_KEY = 'oyo_homework_view_mode'

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
)
const IconMinus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14" /></svg>
)
const IconGraph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 19h16" />
    <path d="M5 15l4-4 3 2 5-6" />
    <circle cx="9" cy="11" r="1" />
    <circle cx="12" cy="13" r="1" />
    <circle cx="17" cy="7" r="1" />
  </svg>
)
const IconList = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M8 6h12M8 12h12M8 18h12" />
    <circle cx="4" cy="6" r="1" />
    <circle cx="4" cy="12" r="1" />
    <circle cx="4" cy="18" r="1" />
  </svg>
)
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
)
const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" />
  </svg>
)
const IconReset = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 12a9 9 0 1 0 2.64-6.36" />
    <path d="M3 4v5h5" />
  </svg>
)
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6L9 17l-5-5" /></svg>
)

function getCharKey(character) {
  const name = character?.CharacterName ?? ''
  const server = character?.ServerName ?? ''
  return `${name}:${server}`.trim() || 'unknown'
}

function getTodayDateString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekKey() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const start = new Date(d)
  start.setDate(d.getDate() - d.getDay())
  return start.toISOString().slice(0, 10)
}

function loadRegistered() {
  try {
    const raw = localStorage.getItem(REGISTERED_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function saveRegistered(list) {
  try {
    localStorage.setItem(REGISTERED_KEY, JSON.stringify(list))
  } catch {}
}

const EXPEDITION_SINGLE_ID = 'exp-1'

function loadExpeditionCards() {
  try {
    const raw = localStorage.getItem(EXPEDITION_CARDS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr) || arr.length === 0) return []
    return [arr[0]]
  } catch {
    return []
  }
}

function saveExpeditionCards(ids) {
  try {
    localStorage.setItem(EXPEDITION_CARDS_KEY, JSON.stringify(ids))
  } catch {}
}

function loadCardOrder() {
  try {
    const raw = localStorage.getItem(CARD_ORDER_KEY)
    if (!raw) return null
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : null
  } catch {
    return null
  }
}

function saveCardOrder(order) {
  try {
    localStorage.setItem(CARD_ORDER_KEY, JSON.stringify(order))
  } catch {}
}

const USE_CUSTOM_ORDER_KEY = 'oyo_homework_use_custom_order'

function loadUseCustomOrder() {
  try {
    return localStorage.getItem(USE_CUSTOM_ORDER_KEY) === 'true'
  } catch {
    return false
  }
}

function saveUseCustomOrder(value) {
  try {
    localStorage.setItem(USE_CUSTOM_ORDER_KEY, value ? 'true' : 'false')
  } catch {}
}

function loadViewMode() {
  try {
    const v = localStorage.getItem(VIEW_MODE_KEY)
    if (v === 'compact' || v === 'detailed') return v
    return 'detailed'
  } catch {
    return 'detailed'
  }
}

function saveViewMode(mode) {
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode)
  } catch {}
}

function expStorageKeyDaily(expId) {
  return `oyo_expedition_daily_${expId}`
}
function expStorageKeyDailyMeta(expId) {
  return `oyo_expedition_daily_${expId}_date`
}
function expStorageKeyWeekly(expId) {
  return `oyo_expedition_weekly_${expId}`
}
function expStorageKeyWeeklyMeta(expId) {
  return `oyo_expedition_weekly_${expId}_week`
}

/** 정렬용 레벨 숫자 (높을수록 앞에). ItemLevel / ItemAvgLevel / ItemMaxLevel 순으로 사용 */
function getLevelForSort(character) {
  const v = character?.ItemLevel ?? character?.ItemAvgLevel ?? character?.ItemMaxLevel
  if (v == null || v === '') return 0
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

function sortRegisteredByLevel(list) {
  return [...list].sort((a, b) => getLevelForSort(b) - getLevelForSort(a))
}

function storageKeyDaily(charKey) {
  return `oyo_homework_daily_${charKey}`
}
function storageKeyDailyMeta(charKey) {
  return `oyo_homework_daily_${charKey}_date`
}
function storageKeyWeekly(charKey) {
  return `oyo_homework_weekly_${charKey}`
}
function storageKeyWeeklyMeta(charKey) {
  return `oyo_homework_weekly_${charKey}_week`
}
function storageKeyRaid(charKey) {
  return `oyo_homework_raid_${charKey}`
}
function storageKeyRaidMeta(charKey) {
  return `oyo_homework_raid_${charKey}_week`
}
function storageKeyRaidChecked(charKey) {
  return `oyo_homework_raid_checked_${charKey}`
}
function storageKeyRaidCheckedMeta(charKey) {
  return `oyo_homework_raid_checked_${charKey}_week`
}
function storageKeyRaidSlots(charKey) {
  return `oyo_homework_raid_slots_${charKey}`
}

function loadRaidSlots(charKey, itemLevel) {
  try {
    const raw = localStorage.getItem(storageKeyRaidSlots(charKey))
    if (!raw) {
      const defaultIds = getDefaultRaidIdsByLevel(itemLevel)
      if (defaultIds.length) saveRaidSlots(charKey, defaultIds)
      return defaultIds
    }
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : getDefaultRaidIdsByLevel(itemLevel)
  } catch {
    return getDefaultRaidIdsByLevel(itemLevel)
  }
}

function saveRaidSlots(charKey, ids) {
  try {
    localStorage.setItem(storageKeyRaidSlots(charKey), JSON.stringify(ids))
  } catch {}
}

function loadChecked(key, metaKey, currentMeta) {
  try {
    const stored = localStorage.getItem(key)
    const storedMeta = localStorage.getItem(metaKey)
    if (storedMeta !== currentMeta) return null
    if (!stored) return null
    const arr = JSON.parse(stored)
    return Array.isArray(arr) ? new Set(arr) : null
  } catch {
    return null
  }
}

function saveChecked(key, metaKey, currentMeta, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]))
    localStorage.setItem(metaKey, currentMeta)
  } catch {}
}

/** 레이드별 모드: { [raidId]: 'single' | 'bus' }. 예전 배열 형식이면 { id: 'single' } 로 변환 */
function loadRaidModes(charKey, weekKey) {
  try {
    const key = storageKeyRaid(charKey)
    const metaKey = storageKeyRaidMeta(charKey)
    const stored = localStorage.getItem(key)
    const storedMeta = localStorage.getItem(metaKey)
    if (storedMeta !== weekKey) return {}
    if (!stored) return {}
    const parsed = JSON.parse(stored)
    if (Array.isArray(parsed)) {
      const obj = {}
      parsed.forEach((id) => { obj[id] = 'single' })
      return obj
    }
    if (parsed && typeof parsed === 'object') return parsed
    return {}
  } catch {
    return {}
  }
}

function saveRaidModes(charKey, weekKey, modes) {
  try {
    localStorage.setItem(storageKeyRaid(charKey), JSON.stringify(modes))
    localStorage.setItem(storageKeyRaidMeta(charKey), weekKey)
  } catch {}
}

function storageKeyRaidBusFee(charKey) {
  return `oyo_homework_raid_busfee_${charKey}`
}
function storageKeyRaidBusFeeMeta(charKey) {
  return `oyo_homework_raid_busfee_${charKey}_week`
}

function loadRaidBusFees(charKey, weekKey) {
  try {
    const stored = localStorage.getItem(storageKeyRaidBusFee(charKey))
    const storedMeta = localStorage.getItem(storageKeyRaidBusFeeMeta(charKey))
    if (storedMeta !== weekKey) return {}
    if (!stored) return {}
    const parsed = JSON.parse(stored)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveRaidBusFees(charKey, weekKey, fees) {
  try {
    localStorage.setItem(storageKeyRaidBusFee(charKey), JSON.stringify(fees))
    localStorage.setItem(storageKeyRaidBusFeeMeta(charKey), weekKey)
  } catch {}
}

function storageKeyRaidBusRole(charKey) {
  return `oyo_homework_raid_busrole_${charKey}`
}
function storageKeyRaidBusRoleMeta(charKey) {
  return `oyo_homework_raid_busrole_${charKey}_week`
}
function loadRaidBusRoles(charKey, weekKey) {
  try {
    const stored = localStorage.getItem(storageKeyRaidBusRole(charKey))
    const storedMeta = localStorage.getItem(storageKeyRaidBusRoleMeta(charKey))
    if (storedMeta !== weekKey) return {}
    if (!stored) return {}
    const parsed = JSON.parse(stored)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}
function saveRaidBusRoles(charKey, weekKey, roles) {
  try {
    localStorage.setItem(storageKeyRaidBusRole(charKey), JSON.stringify(roles))
    localStorage.setItem(storageKeyRaidBusRoleMeta(charKey), weekKey)
  } catch {}
}

function getCharacterCompletion(character, today, weekKey) {
  const charKey = getCharKey(character)
  const itemLevel = character?.ItemLevel
  const dailyChecked = loadChecked(storageKeyDaily(charKey), storageKeyDailyMeta(charKey), today) ?? new Set()
  const weeklyChecked = loadChecked(storageKeyWeekly(charKey), storageKeyWeeklyMeta(charKey), weekKey) ?? new Set()
  const raidSlots = loadRaidSlots(charKey, itemLevel)
  const raidChecked = loadChecked(storageKeyRaidChecked(charKey), storageKeyRaidCheckedMeta(charKey), weekKey) ?? new Set()
  const raidModes = loadRaidModes(charKey, weekKey)
  const raidBusFees = loadRaidBusFees(charKey, weekKey)
  const dailyRatio = DAILY_ITEMS.length ? dailyChecked.size / DAILY_ITEMS.length : 0
  const weeklyRatio = WEEKLY_ITEMS.length ? weeklyChecked.size / WEEKLY_ITEMS.length : 0
  const hasValidBusFee = (id) => {
    const v = raidBusFees[id]
    if (v == null || v === '') return false
    const n = Number(String(v).replace(/,/g, '').trim())
    return Number.isFinite(n)
  }
  const raidDone = raidSlots.filter((id) => raidChecked.has(id) || (raidModes[id] === 'bus' && hasValidBusFee(id))).length
  const raidRatio = raidSlots.length ? raidDone / raidSlots.length : 0
  return dailyRatio >= 1 && weeklyRatio >= 1 && raidRatio >= 1
}

function formatItemLevel(v) {
  if (v == null || v === '') return null
  const s = String(v).replace(/,/g, '').trim()
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function ClassIcon({ className, size = 36 }) {
  const src = getClassIconSrc(className)
  const [failed, setFailed] = useState(false)
  const showFallback = !className || failed || !src
  if (!className) return <span className="homework-class-logo" style={{ width: size, height: size }}>?</span>
  return (
    <span className="homework-class-icon-wrap" style={{ width: size, height: size }}>
      {src && !failed && (
        <img
          src={src}
          alt=""
          className="homework-class-img"
          draggable={false}
          onError={() => setFailed(true)}
          style={{ width: size, height: size }}
        />
      )}
      <span
        className="homework-class-fallback"
        style={{
          width: size,
          height: size,
          fontSize: Math.round(size * 0.28),
          display: showFallback ? 'flex' : 'none',
        }}
      >
        {getClassShortLabel(className)}
      </span>
    </span>
  )
}

function RaidSelectModal({ characterName, selectedIds, raidModes, onSave, onClose }) {
  const [picked, setPicked] = useState(() => new Set(selectedIds))
  const [modes, setModes] = useState(() => ({ ...raidModes }))

  const toggleRowPick = (id) => {
    if (picked.has(id)) {
      setPicked((prev) => { const n = new Set(prev); n.delete(id); return n })
      setModes((prev) => { const o = { ...prev }; delete o[id]; return o })
    } else {
      setPicked((prev) => new Set(prev).add(id))
    }
  }

  const setRaidModeInModal = (id, mode, e) => {
    if (e) e.stopPropagation()
    const current = modes[id]
    if (current === mode) {
      setPicked((prev) => { const n = new Set(prev); n.delete(id); return n })
      setModes((prev) => { const o = { ...prev }; delete o[id]; return o })
    } else {
      setPicked((prev) => new Set(prev).add(id))
      setModes((prev) => ({ ...prev, [id]: mode }))
    }
  }

  const handleSave = () => {
    const ids = RAID_ITEMS.filter((item) => picked.has(item.id)).map((item) => item.id)
    const cleanedModes = {}
    ids.forEach((id) => { if (modes[id]) cleanedModes[id] = modes[id] })
    onSave(ids, cleanedModes)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-panel homework-raid-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2>레이드 선택</h2>
            <p>{characterName} — 표시할 레이드를 선택하고 싱글/버스를 골라주세요.</p>
          </div>
          <Button type="button" size="sm" variant="secondary" className="modal-close" onClick={onClose}>
            닫기
          </Button>
        </header>
        <div className="modal-content">
          <ul className="homework-raid-modal-list">
            {RAID_ITEMS.map((item) => {
              const mode = modes[item.id]
              const isSelected = picked.has(item.id)
              return (
                <li
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  className={`homework-raid-modal-row ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => toggleRowPick(item.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRowPick(item.id); } }}
                  aria-pressed={isSelected}
                >
                  <span className="homework-raid-modal-row-label">{item.label}</span>
                  <div className="homework-raid-mode-btns">
                    <button
                      type="button"
                      className={`homework-raid-mode-btn ${mode === 'single' ? 'is-active' : ''}`}
                      onClick={(e) => setRaidModeInModal(item.id, 'single', e)}
                      aria-pressed={mode === 'single'}
                      aria-label={`${item.label} 싱글`}
                    >
                      싱글
                    </button>
                    <button
                      type="button"
                      className={`homework-raid-mode-btn ${mode === 'bus' ? 'is-active' : ''}`}
                      onClick={(e) => setRaidModeInModal(item.id, 'bus', e)}
                      aria-pressed={mode === 'bus'}
                      aria-label={`${item.label} 버스`}
                    >
                      버스
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="homework-raid-modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>취소</Button>
            <Button type="button" onClick={handleSave}>저장</Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function DailyEditModal({ checkedIds, onSave, onClose }) {
  const [picked, setPicked] = useState(() => new Set(checkedIds))

  const toggle = (id) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = () => {
    onSave(picked)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-panel homework-raid-modal homework-dailyweekly-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2>일일 숙제 편집</h2>
            <p>완료한 항목을 선택하세요.</p>
          </div>
          <Button type="button" size="sm" variant="secondary" className="modal-close" onClick={onClose}>
            닫기
          </Button>
        </header>
        <div className="modal-content">
          <ul className="homework-raid-modal-list">
            {DAILY_ITEMS.map((item) => (
              <li
                key={item.id}
                role="button"
                tabIndex={0}
                className={`homework-raid-modal-row ${picked.has(item.id) ? 'is-selected' : ''}`}
                onClick={() => toggle(item.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(item.id); } }}
                aria-pressed={picked.has(item.id)}
              >
                <span className="homework-raid-modal-row-label">{item.label}</span>
              </li>
            ))}
          </ul>
          <div className="homework-raid-modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>취소</Button>
            <Button type="button" onClick={handleSave}>저장</Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function WeeklyEditModal({ checkedIds, onSave, onClose }) {
  const [picked, setPicked] = useState(() => new Set(checkedIds))

  const toggle = (id) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = () => {
    onSave(picked)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-panel homework-raid-modal homework-dailyweekly-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2>주간 숙제 편집</h2>
            <p>완료한 항목을 선택하세요.</p>
          </div>
          <Button type="button" size="sm" variant="secondary" className="modal-close" onClick={onClose}>
            닫기
          </Button>
        </header>
        <div className="modal-content">
          <ul className="homework-raid-modal-list">
            {WEEKLY_ITEMS.map((item) => (
              <li
                key={item.id}
                role="button"
                tabIndex={0}
                className={`homework-raid-modal-row ${picked.has(item.id) ? 'is-selected' : ''}`}
                onClick={() => toggle(item.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(item.id); } }}
                aria-pressed={picked.has(item.id)}
              >
                <span className="homework-raid-modal-row-label">{item.label}</span>
              </li>
            ))}
          </ul>
          <div className="homework-raid-modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>취소</Button>
            <Button type="button" onClick={handleSave}>저장</Button>
          </div>
        </div>
      </section>
    </div>
  )
}

const ROW_GAP = 14
const INSERT_ZONE = 0.26
/** 같은 구역에 이 시간만큼 머물렀을 때만 드롭 타깃 반영 (요동 방지) */
const DROP_TARGET_DEBOUNCE_MS = 12
/** 타깃 변경 시 포인터가 이 거리 이상 움직였을 때만 반영 (스왑 시 왔다갔다 방지) */
const DROP_TARGET_MOVE_THRESHOLD_PX = 1

function OrderEditModal({ items, onSave, onClose }) {
  const [list, setList] = useState(() => [...items])
  const [draggingId, setDraggingId] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [justDroppedId, setJustDroppedId] = useState(null)
  const originalListRef = useRef([])
  const droppedRef = useRef(false)
  const rowHeightRef = useRef(52)
  const pendingTargetRef = useRef(null)
  const debounceTimerRef = useRef(null)
  const listRef = useRef(null)
  const dragImageRef = useRef(null)
  const lastCommitPosRef = useRef({ x: 0, y: 0 })
  const pendingPosRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    setList([...items])
  }, [items])

  const commitDropTarget = useCallback((target) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    pendingTargetRef.current = null
    setDropTarget(target)
  }, [])

  const scheduleDropTarget = useCallback((target, clientX, clientY, immediate = false) => {
    if (target != null && target.index === 0) return
    const key = target == null ? '' : target.mode === 'swap' ? `${target.index}-swap-${target.targetId ?? ''}` : `${target.index}-${target.mode}`
    const prev = pendingTargetRef.current
    const prevKey = prev == null ? '' : prev.mode === 'swap' ? `${prev.index}-swap-${prev.targetId ?? ''}` : `${prev.index}-${prev.mode}`
    if (key === prevKey) return
    if (clientX != null && clientY != null) pendingPosRef.current = { x: clientX, y: clientY }
    pendingTargetRef.current = target
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    if (target == null) {
      commitDropTarget(null)
      return
    }
    if (immediate) {
      lastCommitPosRef.current = { x: clientX ?? 0, y: clientY ?? 0 }
      commitDropTarget(target)
      return
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      pendingTargetRef.current = null
      const pos = pendingPosRef.current
      lastCommitPosRef.current = { x: pos.x, y: pos.y }
      setDropTarget(target)
    }, DROP_TARGET_DEBOUNCE_MS)
  }, [commitDropTarget])

  const handleDragStart = (e, itemId) => {
    originalListRef.current = list
    droppedRef.current = false
    setDropTarget(null)
    pendingTargetRef.current = null
    lastCommitPosRef.current = { x: e.clientX, y: e.clientY }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    const el = e.currentTarget
    if (el && el.offsetHeight) rowHeightRef.current = el.offsetHeight + ROW_GAP
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', itemId)
    try {
      const clone = el.cloneNode(true)
      clone.style.position = 'fixed'
      clone.style.left = '-9999px'
      clone.style.top = '0'
      clone.style.width = `${el.offsetWidth}px`
      clone.style.opacity = '1'
      clone.style.pointerEvents = 'none'
      clone.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
      document.body.appendChild(clone)
      dragImageRef.current = clone
      e.dataTransfer.setDragImage(clone, 22, 20)
    } catch (_) {}
    requestAnimationFrame(() => setDraggingId(itemId))
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragOver = (e, index, itemId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggingId == null) return
    if (index === 0) return
    if (itemId === draggingId) return
    const fromIndex = list.findIndex((item) => item.id === draggingId)
    if (fromIndex < 0) return
    if (dropTarget != null && dropTarget.mode === 'swap' && dropTarget.targetId === itemId) return
    const nextTarget = (() => {
      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0.5
      let mode
      let targetIndex = index
      if (index === fromIndex) {
        mode = 'insert'
        targetIndex = fromIndex
      } else if (ratio < INSERT_ZONE) {
        mode = 'insert'
      } else if (ratio > 1 - INSERT_ZONE) {
        mode = 'insert'
        targetIndex = index + 1
      } else {
        mode = 'swap'
      }
      if (targetIndex === 0) return null
      return mode === 'swap' ? { index: targetIndex, mode: 'swap', targetId: itemId } : { index: targetIndex, mode }
    })()
    if (nextTarget == null) return
    let same = false
    if (dropTarget != null) {
      same = dropTarget.mode === nextTarget.mode && dropTarget.index === nextTarget.index && (dropTarget.mode !== 'swap' || dropTarget.targetId === nextTarget.targetId)
      if (!same) {
        const isNearIndex = Math.abs(dropTarget.index - nextTarget.index) <= 1
        const isSwapToInsertSameSlot =
          dropTarget.mode === 'swap' &&
          nextTarget.mode === 'insert' &&
          (nextTarget.index === dropTarget.index || nextTarget.index === dropTarget.index + 1)
        if (!isNearIndex && !isSwapToInsertSameSlot) {
          const last = lastCommitPosRef.current
          const dx = e.clientX - last.x
          const dy = e.clientY - last.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < DROP_TARGET_MOVE_THRESHOLD_PX) return
        }
      }
    }
    const immediateSwitch = dropTarget != null && !same
    scheduleDropTarget(nextTarget, e.clientX, e.clientY, immediateSwitch)
  }

  const handleDragOverInsertZone = (e, insertIndex) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggingId == null) return
    if (insertIndex <= 0) return
    const fromIndex = list.findIndex((item) => item.id === draggingId)
    if (fromIndex >= 0 && (insertIndex === fromIndex || insertIndex === fromIndex + 1)) return
    if (dropTarget != null && dropTarget.mode === 'insert' && dropTarget.index === insertIndex) return
    if (dropTarget != null) {
      const isNearIndex = Math.abs(dropTarget.index - insertIndex) <= 1
      if (!isNearIndex) {
        const last = lastCommitPosRef.current
        const dx = e.clientX - last.x
        const dy = e.clientY - last.y
        if (Math.sqrt(dx * dx + dy * dy) < DROP_TARGET_MOVE_THRESHOLD_PX) return
      }
    }
    const immediateSwitch = dropTarget != null
    scheduleDropTarget({ index: insertIndex, mode: 'insert' }, e.clientX, e.clientY, immediateSwitch)
  }

  const handleDragLeave = (e) => {
    const listEl = listRef.current
    const related = e.relatedTarget
    if (listEl && related && typeof listEl.contains === 'function' && listEl.contains(related)) return
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    pendingTargetRef.current = null
    setDropTarget(null)
  }

  const applyDrop = () => {
    if (dropTarget == null || !draggingId) return
    const fromIndex = list.findIndex((item) => item.id === draggingId)
    if (fromIndex < 0) return
    const draggedItem = list[fromIndex]
    if (dropTarget.mode === 'swap') {
      const toIndex = dropTarget.index
      if (toIndex === fromIndex) return
      const next = [...list]
      next[fromIndex] = next[toIndex]
      next[toIndex] = draggedItem
      setList(next)
    } else {
      const insertAt = Math.min(Math.max(0, dropTarget.index), list.length)
      const without = list.filter((item) => item.id !== draggingId)
      const actualInsert = Math.min(insertAt, without.length)
      const next = [...without.slice(0, actualInsert), draggedItem, ...without.slice(actualInsert)]
      setList(next)
    }
    droppedRef.current = true
  }

  const handleDrop = (e) => {
    e.preventDefault()
    applyDrop()
  }

  const handleDragEnd = () => {
    if (dragImageRef.current && dragImageRef.current.parentNode) {
      dragImageRef.current.parentNode.removeChild(dragImageRef.current)
      dragImageRef.current = null
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    pendingTargetRef.current = null
    if (!draggingId) return
    if (!droppedRef.current) {
      setList(originalListRef.current)
    } else {
      setJustDroppedId(draggingId)
      setTimeout(() => setJustDroppedId(null), 280)
    }
    setDraggingId(null)
    setDropTarget(null)
    droppedRef.current = false
  }

  const handleSave = () => {
    onSave(list.map((item) => item.id))
    onClose()
  }

  const insertLineAt =
    dropTarget?.mode === 'insert' && dropTarget != null
      ? Math.min(Math.max(0, dropTarget.index), list.length)
      : -1
  const draggingIndex = draggingId == null ? -1 : list.findIndex((item) => item.id === draggingId)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-panel homework-raid-modal homework-order-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2>카드 순서 편집</h2>
            <p>항목을 드래그해서 순서를 바꾼 뒤 저장하세요.</p>
          </div>
          <Button type="button" size="sm" variant="secondary" className="modal-close" onClick={onClose}>
            닫기
          </Button>
        </header>
        <div className="modal-content">
          <ul
            ref={listRef}
            className="homework-order-modal-list homework-order-modal-list-draggable"
            onDragLeave={handleDragLeave}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragEnter}
          >
            {list.flatMap((item, index) => {
              const isDragging = draggingId === item.id
              const isExp = item.id === 'exp'
              const isSwapTarget = !isDragging && dropTarget?.mode === 'swap' && dropTarget?.index === index && !isExp
              const insertBeforeThis =
                insertLineAt === index &&
                index > 0 &&
                !(draggingIndex >= 0 && (index === draggingIndex || index === draggingIndex + 1))
              const row = (
                <li
                  key={item.id}
                  className={`homework-order-modal-row ${isDragging ? 'is-dragging is-placeholder' : ''} ${isSwapTarget ? 'is-swap-target' : ''} ${justDroppedId === item.id ? 'is-just-dropped' : ''} ${isExp ? 'is-exp-fixed' : ''}`}
                  data-order-row="true"
                  draggable={!isExp}
                  onDragStart={!isExp ? (e) => handleDragStart(e, item.id) : undefined}
                  onDragEnter={handleDragEnter}
                  onDragOver={(e) => !isExp && handleDragOver(e, index, item.id)}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                >
                  <span className="homework-order-modal-row-content">
                    {!isDragging && (
                      <>
                        {!isExp && <span className="homework-order-modal-drag-handle" aria-hidden>⋮⋮</span>}
                        <span className="homework-order-modal-icon">
                          {item.id === 'exp' ? (
                            <span className="homework-expedition-icon homework-order-expedition-icon">원정대</span>
                          ) : (
                            <ClassIcon className={item.className} size={32} />
                          )}
                        </span>
                        <span className="homework-order-modal-name">{item.label}</span>
                        {item.level != null && <span className="homework-order-modal-level">{item.level}</span>}
                      </>
                    )}
                  </span>
                </li>
              )
              if (insertBeforeThis) {
                return [
                  <li
                    key={`insert-${index}`}
                    className="homework-order-modal-insert-gap"
                    aria-hidden
                    onDragEnter={handleDragEnter}
                    onDragOver={(e) => handleDragOverInsertZone(e, index)}
                    onDrop={handleDrop}
                  >
                    <span className="homework-order-modal-insert-line" />
                  </li>,
                  row,
                ]
              }
              if (
                insertLineAt === list.length &&
                index === list.length - 1 &&
                !(draggingIndex >= 0 && list.length === draggingIndex + 1)
              ) {
                return [
                  row,
                  <li
                    key="insert-end"
                    className="homework-order-modal-insert-gap"
                    aria-hidden
                    onDragEnter={handleDragEnter}
                    onDragOver={(e) => handleDragOverInsertZone(e, list.length)}
                    onDrop={handleDrop}
                  >
                    <span className="homework-order-modal-insert-line" />
                  </li>,
                ]
              }
              return [row]
            })}
          </ul>
          <div className="homework-raid-modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>취소</Button>
            <Button type="button" onClick={handleSave}>저장</Button>
          </div>
        </div>
      </section>
    </div>
  )
}

/** 문자열에서 결정론적 mock 수치 생성 */
function mockHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

function makeDailyDoneHistory(seed, days = 168) {
  const arr = []
  for (let i = 0; i < days; i += 1) {
    // 0/1 기록: 약 65~90% 구간으로 완료 여부 생성
    const p = ((seed >> (i % 16)) + i * 17 + seed) % 100
    arr.push(p < 74 ? 1 : 0)
  }
  return arr
}

function makeWeeklyRateHistory(seed, weeks = 24, min = 45, max = 100) {
  const span = Math.max(1, max - min)
  const arr = []
  for (let i = 0; i < weeks; i += 1) {
    const v = min + (((seed >> (i % 12)) + i * 11 + seed) % (span + 1))
    if ((seed + i * 13) % 9 === 0) {
      arr.push(100)
    } else {
      arr.push(Math.max(0, Math.min(100, v)))
    }
  }
  return arr
}

function makeWeeklyGoldHistory(seed, weeks = 24) {
  const arr = []
  let prev = (seed * 113) % 100001
  for (let i = 0; i < weeks; i += 1) {
    const anchor = Math.abs(seed * (i + 3) * 97 + i * 7919) % 100001
    const drift = (((seed >> (i % 11)) + i * 353) % 28001) - 14000
    const shock = (seed + i * 17) % 5 === 0 ? (((seed >> (i % 7)) + i * 911) % 60001) - 30000 : 0
    const next = Math.round(anchor * 0.5 + prev * 0.32 + drift * 0.38 + shock)
    prev = Math.max(0, Math.min(100000, next))
    arr.push(prev)
  }
  return arr
}

function HomeworkCardFlipWrapper({ isFlipped, chartData, cardLabel, characterClassName, itemLevelValue, isExpedition = false, onBack, onRemove, children }) {
  const FIXED_WEEKS = 4
  const [activeWeekOffset, setActiveWeekOffset] = useState(0)
  const [activeDayIndex, setActiveDayIndex] = useState(null)
  const [isGoldChartHover, setIsGoldChartHover] = useState(false)

  const now = useMemo(() => new Date(), [])
  const startOfCurrentWeek = useMemo(() => {
    const d = new Date(now)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    d.setHours(0, 0, 0, 0)
    return d
  }, [now])
  const formatDate = (date) => `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
  const getWeekRangeLabel = (offset) => {
    const start = new Date(startOfCurrentWeek)
    start.setDate(start.getDate() - offset * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return `${formatDate(start)} ~ ${formatDate(end)}`
  }

  const weeks = FIXED_WEEKS
  const days = weeks * 7

  const dailyDoneSeries = chartData?.dailyDoneHistory?.slice(-days) ?? []
  const weeklyGoldSeries = chartData?.weeklyGoldHistory?.slice(-weeks) ?? []
  const weeklyRateSeries = chartData?.weeklyRateHistory?.slice(-weeks) ?? []
  const raidRateSeries = chartData?.raidRateHistory?.slice(-weeks) ?? []
  const activeIndex = Math.max(0, Math.min(weeks - 1 - activeWeekOffset, weeks - 1))
  useEffect(() => {
    setActiveWeekOffset((prev) => Math.min(prev, weeks - 1))
  }, [weeks])
  useEffect(() => {
    setActiveDayIndex((prev) => {
      if (prev == null) return prev
      return Math.min(prev, Math.max(0, dailyDoneSeries.length - 1))
    })
  }, [dailyDoneSeries.length])

  const doneDays = dailyDoneSeries.reduce((acc, v) => acc + (v ? 1 : 0), 0)
  const activeGold = weeklyGoldSeries.length ? weeklyGoldSeries[activeIndex] : 0
  const activeWeekly = weeklyRateSeries.length ? weeklyRateSeries[activeIndex] : 0
  const activeRaid = raidRateSeries.length ? raidRateSeries[activeIndex] : 0
  const activeGoldLeftPct = weeks > 1 ? (activeIndex / (weeks - 1)) * 100 : 0
  const hoveredDayIdx = activeDayIndex == null ? dailyDoneSeries.length - 1 : activeDayIndex
  const hoveredDayOffset = hoveredDayIdx >= 0 ? days - 1 - hoveredDayIdx : 0
  const hoveredDayDate = useMemo(() => {
    const d = new Date(now)
    d.setDate(d.getDate() - hoveredDayOffset)
    return d
  }, [hoveredDayOffset, now])
  const hoveredDayDone = hoveredDayIdx >= 0 ? dailyDoneSeries[hoveredDayIdx] === 1 : false
  const weakChoreHints = useMemo(() => {
    const hints = []
    if (activeWeekly < 100) hints.push(`주간 숙제 ${100 - activeWeekly}% 남음`)
    if (activeRaid < 100) hints.push(`레이드 ${100 - activeRaid}% 남음`)
    if (hints.length === 0) hints.push('이번 주 숙제 거의 완료')
    return hints
  }, [activeWeekly, activeRaid])

  const buildLineCoords = (values, width, height, fixedMin = null, fixedMax = null) => {
    if (!values || values.length === 0) return []
    const max = fixedMax == null ? Math.max(...values) : fixedMax
    const min = fixedMin == null ? Math.min(...values) : fixedMin
    const span = max - min || 1
    const stepX = values.length > 1 ? width / (values.length - 1) : 0
    return values.map((v, i) => {
      const norm = (v - min) / span
      const x = stepX * i
      const y = height - norm * height
      return { x, y }
    })
  }
  const buildSmoothPath = (coords) => {
    if (!coords || coords.length === 0) return ''
    if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`
    let d = `M ${coords[0].x} ${coords[0].y}`
    for (let i = 0; i < coords.length - 1; i += 1) {
      const p0 = coords[i - 1] ?? coords[i]
      const p1 = coords[i]
      const p2 = coords[i + 1]
      const p3 = coords[i + 2] ?? p2
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }
    return d
  }
  const goldLineWidth = 140
  const goldLineHeight = 56
  const goldLineCoords = buildLineCoords(weeklyGoldSeries, goldLineWidth, goldLineHeight, 0, null)
  const goldLinePath = buildSmoothPath(goldLineCoords)
  const goldAreaPath = goldLineCoords.length
    ? `${goldLinePath} L ${goldLineCoords[goldLineCoords.length - 1].x} ${goldLineHeight} L 0 ${goldLineHeight} Z`
    : ''
  const activeGoldPoint = goldLineCoords[activeIndex]

  return (
    <div className={`homework-card-flip-wrap ${isFlipped ? 'is-flipped' : ''}`}>
      <div className="homework-card-flip-inner">
        <div className="homework-card-flip-front">{children}</div>
        <div className="homework-card-flip-back">
          <Card className="homework-char-card homework-card-graph-back">
            <CardHeader className="homework-char-header">
              <div className="homework-card-graph-head-main">
                <div className="homework-char-info homework-card-graph-char-info">
                  {isExpedition ? (
                    <span className="homework-expedition-icon" aria-hidden>원정대</span>
                  ) : (
                    <ClassIcon className={characterClassName} size={36} />
                  )}
                  <div className="homework-char-name-wrap">
                    <CardTitle className="homework-char-title">{cardLabel}</CardTitle>
                    <span className="homework-char-level">{itemLevelValue != null ? itemLevelValue : '-'}</span>
                  </div>
                </div>
              </div>
              <div className="homework-card-graph-head-meta">
                <span className="homework-card-graph-period-label">최근 4주 고정</span>
                <div className="homework-card-graph-head-actions">
                  <button
                    type="button"
                    className="homework-btn-icon homework-btn-remove"
                    onClick={onBack}
                    title="목록 보기"
                    aria-label="목록 보기"
                  >
                    <IconList />
                  </button>
                  {onRemove ? (
                    <button
                      type="button"
                      className="homework-btn-icon homework-btn-remove"
                      onClick={onRemove}
                      title="삭제"
                      aria-label="삭제"
                    >
                      <IconTrash />
                    </button>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="homework-card-graph-content">
              <div className="homework-card-graph-scrollzone">
                {chartData ? (
                  <>
                  <div className="homework-card-graph-section">
                    <div className="homework-card-graph-section-head">
                      <span>일일 기록</span>
                      <span>{doneDays}/{days}일 완료</span>
                    </div>
                    <div className="homework-card-graph-hover-readout">
                      <span>{formatDate(hoveredDayDate)}</span>
                      <strong>{hoveredDayDone ? '완료' : '미완료'}</strong>
                      {!hoveredDayDone && <em>일일 숙제 남음</em>}
                    </div>
                    <div className="homework-card-daily-strip">
                      {dailyDoneSeries.map((done, idx) => (
                        <span
                          key={idx}
                          className={`homework-card-daily-cell ${done ? 'is-done' : 'is-miss'}`}
                          onMouseEnter={() => setActiveDayIndex(idx)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="homework-card-graph-section">
                    <div className="homework-card-graph-section-head">
                      <span>주간 성과</span>
                      <span>{getWeekRangeLabel(activeWeekOffset)} 선택</span>
                    </div>
                    <div className="homework-card-weekly-gold-panel">
                      <div className="homework-card-weekly-gold-head">
                        <span>골드 획득량 (라인)</span>
                        <strong>{activeGold.toLocaleString()} G</strong>
                      </div>
                      <div className="homework-card-graph-weekly-hint">
                        {weakChoreHints.map((hint) => (
                          <span key={hint}>{hint}</span>
                        ))}
                      </div>
                      <div className="homework-card-weekly-gold-line-wrap" onMouseEnter={() => setIsGoldChartHover(true)} onMouseLeave={() => setIsGoldChartHover(false)}>
                        <div className="homework-card-weekly-gold-plot">
                          <svg className="homework-card-weekly-gold-line" viewBox={`0 0 ${goldLineWidth} ${goldLineHeight}`} preserveAspectRatio="none">
                            <line className="homework-card-weekly-gold-guide" x1="0" y1={goldLineHeight * 0.2} x2={goldLineWidth} y2={goldLineHeight * 0.2} />
                            <line className="homework-card-weekly-gold-guide" x1="0" y1={goldLineHeight * 0.5} x2={goldLineWidth} y2={goldLineHeight * 0.5} />
                            <line className="homework-card-weekly-gold-guide" x1="0" y1={goldLineHeight * 0.8} x2={goldLineWidth} y2={goldLineHeight * 0.8} />
                            <path className="homework-card-weekly-gold-area" d={goldAreaPath} />
                            <path className="homework-card-weekly-gold-path" d={goldLinePath} />
                          </svg>
                          <div className="homework-card-weekly-gold-hitzones">
                            {weeklyGoldSeries.map((value, idx) => {
                              const weekOffset = weeks - 1 - idx
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  className={`homework-card-weekly-gold-hit ${activeWeekOffset === weekOffset ? 'is-active' : ''}`}
                                  aria-label={`${getWeekRangeLabel(weekOffset)} 골드 ${value.toLocaleString()} G`}
                                  onMouseEnter={() => setActiveWeekOffset(weekOffset)}
                                  onFocus={() => setActiveWeekOffset(weekOffset)}
                                />
                              )
                            })}
                          </div>
                          {activeGoldPoint ? (
                            <div
                              className="homework-card-weekly-gold-cursor"
                              style={{
                                left: `${(activeGoldPoint.x / goldLineWidth) * 100}%`,
                                top: `${(activeGoldPoint.y / goldLineHeight) * 100}%`,
                              }}
                            />
                          ) : null}
                          {isGoldChartHover ? (
                            <div className="homework-card-weekly-gold-overlay" style={{ left: `${activeGoldLeftPct}%` }}>
                              <span>{getWeekRangeLabel(activeWeekOffset)}</span>
                              <strong>{activeGold.toLocaleString()} G</strong>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="homework-card-weekly-gold-labels">
                        {weeklyGoldSeries.map((value, idx) => {
                          const weekOffset = weeks - 1 - idx
                          return (
                            <button
                              key={idx}
                              type="button"
                              className={`homework-card-weekly-gold-label-btn ${activeWeekOffset === weekOffset ? 'is-active' : ''}`}
                              title={`${getWeekRangeLabel(weekOffset)}: ${value.toLocaleString()} G`}
                              onMouseEnter={() => setActiveWeekOffset(weekOffset)}
                            >
                              <span className="homework-card-weekly-gold-label">
                              {formatDate(
                                (() => {
                                  const d = new Date(startOfCurrentWeek)
                                  d.setDate(d.getDate() - weekOffset * 7)
                                  return d
                                })()
                              )}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="homework-card-weekly-rate-grid">
                      <div className="homework-card-weekly-rate-card">
                        <div className="homework-card-weekly-rate-head">
                          <span>주간 숙제</span>
                          <strong>{activeWeekly}%</strong>
                        </div>
                        <div className="homework-card-weekly-rate-track">
                          <span className="homework-card-weekly-rate-fill is-weekly" style={{ width: `${activeWeekly}%` }} />
                        </div>
                        <div className="homework-card-weekly-mini-row">
                          {weeklyRateSeries.map((value, idx) => {
                            const weekOffset = weeks - 1 - idx
                            return (
                              <span
                                key={idx}
                                className={`homework-card-weekly-mini-bar is-weekly ${activeWeekOffset === weekOffset ? 'is-active' : ''}`}
                                  style={{ height: `${Math.max(5, (value / 100) * 22)}px` }}
                                title={`${getWeekRangeLabel(weekOffset)}: ${value}%`}
                                onMouseEnter={() => setActiveWeekOffset(weekOffset)}
                              />
                            )
                          })}
                        </div>
                      </div>
                      <div className="homework-card-weekly-rate-card">
                        <div className="homework-card-weekly-rate-head">
                          <span>레이드</span>
                          <strong>{activeRaid}%</strong>
                        </div>
                        <div className="homework-card-weekly-rate-track">
                          <span className="homework-card-weekly-rate-fill is-raid" style={{ width: `${activeRaid}%` }} />
                        </div>
                        <div className="homework-card-weekly-mini-row">
                          {raidRateSeries.map((value, idx) => {
                            const weekOffset = weeks - 1 - idx
                            return (
                              <span
                                key={idx}
                                className={`homework-card-weekly-mini-bar is-raid ${activeWeekOffset === weekOffset ? 'is-active' : ''}`}
                                  style={{ height: `${Math.max(5, (value / 100) * 22)}px` }}
                                title={`${getWeekRangeLabel(weekOffset)}: ${value}%`}
                                onMouseEnter={() => setActiveWeekOffset(weekOffset)}
                              />
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  </>
                ) : (
                  <p className="homework-card-graph-empty">데이터 없음</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ExpeditionHomeworkCard({ expId, today, weekKey, onRemove, onComplete, onDismissComplete, isAnimatingComplete, variant = 'detailed', onOpenGraph, expeditionLevelValue = null }) {
  const wrapRef = useRef(null)
  const prevAllCompleteRef = useRef(false)
  const [dailyChecked, setDailyChecked] = useState(() =>
    loadChecked(expStorageKeyDaily(expId), expStorageKeyDailyMeta(expId), today) ?? new Set()
  )
  const [weeklyChecked, setWeeklyChecked] = useState(() =>
    loadChecked(expStorageKeyWeekly(expId), expStorageKeyWeeklyMeta(expId), weekKey) ?? new Set()
  )
  const [dailyModalOpen, setDailyModalOpen] = useState(false)
  const [weeklyModalOpen, setWeeklyModalOpen] = useState(false)

  useEffect(() => {
    const loaded = loadChecked(expStorageKeyDaily(expId), expStorageKeyDailyMeta(expId), today)
    setDailyChecked(loaded ?? new Set())
  }, [expId, today])
  useEffect(() => {
    const loaded = loadChecked(expStorageKeyWeekly(expId), expStorageKeyWeeklyMeta(expId), weekKey)
    setWeeklyChecked(loaded ?? new Set())
  }, [expId, weekKey])

  const persistDaily = useCallback(
    (next) => {
      setDailyChecked(next)
      saveChecked(expStorageKeyDaily(expId), expStorageKeyDailyMeta(expId), today, next)
    },
    [expId, today]
  )
  const persistWeekly = useCallback(
    (next) => {
      setWeeklyChecked(next)
      saveChecked(expStorageKeyWeekly(expId), expStorageKeyWeeklyMeta(expId), weekKey, next)
    },
    [expId, weekKey]
  )

  const toggleDaily = (id) => {
    persistDaily(dailyChecked.has(id) ? new Set([...dailyChecked].filter((x) => x !== id)) : new Set([...dailyChecked, id]))
  }
  const toggleWeekly = (id) => {
    persistWeekly(weeklyChecked.has(id) ? new Set([...weeklyChecked].filter((x) => x !== id)) : new Set([...weeklyChecked, id]))
  }

  const dailyRatio = DAILY_ITEMS.length ? dailyChecked.size / DAILY_ITEMS.length : 0
  const weeklyRatio = WEEKLY_ITEMS.length ? weeklyChecked.size / WEEKLY_ITEMS.length : 0
  const dailyWeekly100 = dailyRatio >= 1 && weeklyRatio >= 1
  const isCompact = variant === 'compact'

  useEffect(() => {
    if (dailyWeekly100 && !prevAllCompleteRef.current && onComplete) {
      prevAllCompleteRef.current = true
      onComplete(expId, wrapRef.current)
    }
    if (!dailyWeekly100) {
      prevAllCompleteRef.current = false
    }
  }, [dailyWeekly100, expId, onComplete])

  const handleResetDailyWeekly = () => {
    persistDaily(new Set())
    persistWeekly(new Set())
  }
  const handleCheckAllDailyWeekly = () => {
    persistDaily(new Set(DAILY_ITEMS.map((item) => item.id)))
    persistWeekly(new Set(WEEKLY_ITEMS.map((item) => item.id)))
  }

  return (
    <div ref={wrapRef} data-char-key={`exp-${expId}`} className={`homework-char-card-wrap homework-expedition-card-wrap ${isAnimatingComplete ? 'is-complete-animating' : ''}`}>
      <Card className={`homework-char-card homework-expedition-card ${dailyWeekly100 ? 'is-all-complete' : ''}`}>
          <div className={isAnimatingComplete ? 'homework-char-card-dimmed' : ''}>
          {isCompact ? (
            <div className="homework-char-row-compact">
              <div className="homework-char-compact-left">
                <span className="homework-expedition-icon" aria-hidden>원정대</span>
                <div className="homework-char-name-wrap">
                  <span className="homework-char-title">원정대</span>
                  {expeditionLevelValue != null && <span className="homework-char-level">{`원정대 Lv.${expeditionLevelValue}`}</span>}
                </div>
              </div>
              <div className="homework-char-compact-buttons" aria-label="원정대 숙제 체크">
                {DAILY_ITEMS.map((item) => (
                  <button
                    key={`exp-d-${item.id}`}
                    type="button"
                    className={`homework-btn-chip ${dailyChecked.has(item.id) ? 'is-checked' : ''}`}
                    onClick={() => toggleDaily(item.id)}
                    aria-pressed={dailyChecked.has(item.id)}
                    aria-label={`일일 ${item.label}`}
                  >
                    {item.label}
                  </button>
                ))}
                {WEEKLY_ITEMS.map((item) => (
                  <button
                    key={`exp-w-${item.id}`}
                    type="button"
                    className={`homework-btn-chip ${weeklyChecked.has(item.id) ? 'is-checked' : ''}`}
                    onClick={() => toggleWeekly(item.id)}
                    aria-pressed={weeklyChecked.has(item.id)}
                    aria-label={`주간 ${item.label}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="homework-char-compact-actions">
                <button
                  type="button"
                  className="homework-btn-icon homework-btn-quick"
                  onClick={handleResetDailyWeekly}
                  title="일일·주간 숙제 초기화"
                  aria-label="일일·주간 숙제 초기화"
                >
                  <IconReset />
                </button>
                <button
                  type="button"
                  className="homework-btn-icon homework-btn-checkall"
                  onClick={handleCheckAllDailyWeekly}
                  title="일일·주간 숙제 전체 체크"
                  aria-label="일일·주간 숙제 전체 체크"
                >
                  <IconCheck />
                </button>
                {onRemove && (
                  <button type="button" className="homework-btn-icon homework-btn-remove" onClick={() => onRemove(expId)} title="삭제" aria-label="삭제">
                    <IconTrash />
                  </button>
                )}
              </div>
            </div>
          ) : (
          <CardHeader className="homework-char-header">
            <div className="homework-char-info homework-char-header-main">
              <span className="homework-expedition-icon" aria-hidden>원정대</span>
              <div className="homework-char-name-wrap">
                <CardTitle className="homework-char-title">원정대</CardTitle>
                {expeditionLevelValue != null && <span className="homework-char-level">{`원정대 Lv.${expeditionLevelValue}`}</span>}
              </div>
            </div>
            <div className="homework-char-header-meta">
              <div className="homework-char-progress" aria-hidden>
                {(() => {
                  const r = 14
                  const cx = 18
                  const cy = 18
                  const circumference = 2 * Math.PI * r
                  const halfCirc = circumference / 2
                  const ringStroke = 5
                  const dailyDash = dailyRatio * halfCirc
                  const weeklyDash = weeklyRatio * halfCirc
                  return (
                    <div className={`homework-progress-ring homework-progress-ring-dailyweekly ${dailyWeekly100 ? 'is-complete' : ''}`} title={`일일 ${dailyChecked.size}/${DAILY_ITEMS.length} · 주간 ${weeklyChecked.size}/${WEEKLY_ITEMS.length}`}>
                      <svg viewBox="0 0 36 36">
                        <circle className="homework-progress-ring-bg" cx={cx} cy={cy} r={r} />
                        <circle className="homework-progress-fill homework-progress-fill-daily" cx={cx} cy={cy} r={r} fill="none" strokeWidth={ringStroke} strokeDasharray={`${dailyDash} ${circumference - dailyDash}`} strokeDashoffset={-halfCirc} transform={`rotate(-90 ${cx} ${cy})`} />
                        <circle className="homework-progress-fill homework-progress-fill-weekly" cx={cx} cy={cy} r={r} fill="none" strokeWidth={ringStroke} strokeDasharray={`${weeklyDash} ${circumference - weeklyDash}`} strokeDashoffset={0} transform={`rotate(-90 ${cx} ${cy})`} />
                        <circle className="homework-progress-ring-edge homework-progress-edge-daily" cx={cx} cy={cy} r={r} fill="none" strokeWidth={2} strokeDasharray={`${halfCirc} ${circumference}`} strokeDashoffset={-halfCirc} transform={`rotate(-90 ${cx} ${cy})`} />
                        <circle className="homework-progress-ring-edge homework-progress-edge-weekly" cx={cx} cy={cy} r={r} fill="none" strokeWidth={2} strokeDasharray={`${halfCirc} ${circumference}`} strokeDashoffset={0} transform={`rotate(-90 ${cx} ${cy})`} />
                      </svg>
                    </div>
                  )
                })()}
              </div>
              <div className="homework-char-header-actions">
                <button
                  type="button"
                  className="homework-btn-icon homework-btn-checkall"
                  onClick={handleCheckAllDailyWeekly}
                  title="일일·주간 숙제 전체 체크"
                  aria-label="일일·주간 숙제 전체 체크"
                >
                  <IconCheck />
                </button>
                <button
                  type="button"
                  className="homework-btn-icon homework-btn-quick"
                  onClick={handleResetDailyWeekly}
                  title="일일·주간 숙제 초기화"
                  aria-label="일일·주간 숙제 초기화"
                >
                  <IconReset />
                </button>
                {onOpenGraph && (
                  <button type="button" className="homework-btn-icon homework-btn-graph" onClick={onOpenGraph} title="그래프 보기" aria-label="그래프 보기">
                    <IconGraph />
                  </button>
                )}
                {onRemove && (
                  <button type="button" className="homework-btn-icon homework-btn-remove" onClick={() => onRemove(expId)} title="삭제" aria-label="삭제">
                    <IconTrash />
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          )}
          {!isCompact && (
          <CardContent className="homework-char-content">
            <div className="homework-char-section homework-char-section-compact homework-section-daily">
              <div className="homework-char-section-head">
                <CardDescription>일일 숙제</CardDescription>
                <div className="homework-raid-actions">
                  <button type="button" className="homework-btn-icon homework-btn-edit" onClick={() => setDailyModalOpen(true)} title="일일 숙제 편집" aria-label="일일 숙제 편집">
                    <IconEdit />
                  </button>
                  <button type="button" className="homework-btn-icon homework-btn-reset" onClick={() => persistDaily(new Set())} title="초기화" aria-label="초기화">
                    <IconReset />
                  </button>
                </div>
              </div>
              <div className="homework-btns">
                {DAILY_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`homework-btn-chip ${dailyChecked.has(item.id) ? 'is-checked' : ''}`}
                    onClick={() => toggleDaily(item.id)}
                    aria-pressed={dailyChecked.has(item.id)}
                    aria-label={item.label}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="homework-char-section homework-char-section-compact homework-section-weekly">
              <div className="homework-char-section-head">
                <CardDescription>주간 숙제</CardDescription>
                <div className="homework-raid-actions">
                  <button type="button" className="homework-btn-icon homework-btn-edit" onClick={() => setWeeklyModalOpen(true)} title="주간 숙제 편집" aria-label="주간 숙제 편집">
                    <IconEdit />
                  </button>
                  <button type="button" className="homework-btn-icon homework-btn-reset" onClick={() => persistWeekly(new Set())} title="초기화" aria-label="초기화">
                    <IconReset />
                  </button>
                </div>
              </div>
              <div className="homework-btns">
                {WEEKLY_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`homework-btn-chip ${weeklyChecked.has(item.id) ? 'is-checked' : ''}`}
                    onClick={() => toggleWeekly(item.id)}
                    aria-pressed={weeklyChecked.has(item.id)}
                    aria-label={item.label}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
          )}
          </div>
      {isAnimatingComplete && (
        <div
          className="homework-char-card-complete-overlay"
          aria-hidden
          onClick={(e) => { e.stopPropagation(); onDismissComplete?.(expId, wrapRef.current) }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDismissComplete?.(expId, wrapRef.current); } }}
        >
          <span className="homework-char-card-complete-check"><IconCheck /></span>
        </div>
      )}
        </Card>
      {dailyModalOpen && (
        <DailyEditModal
          checkedIds={dailyChecked}
          onSave={(next) => { persistDaily(next); setDailyModalOpen(false); }}
          onClose={() => setDailyModalOpen(false)}
        />
      )}
      {weeklyModalOpen && (
        <WeeklyEditModal
          checkedIds={weeklyChecked}
          onSave={(next) => { persistWeekly(next); setWeeklyModalOpen(false); }}
          onClose={() => setWeeklyModalOpen(false)}
        />
      )}
    </div>
  )
}

function CharacterHomeworkCard({ character, today, weekKey, onRemove, onComplete, onIncomplete, onDismissComplete, isAnimatingComplete, variant = 'detailed', onOpenGraph }) {
  const charKey = getCharKey(character)
  const name = character?.CharacterName ?? '알 수 없음'
  const prevAllCompleteRef = useRef(false)
  const wrapRef = useRef(null)
  const className = character?.CharacterClassName ?? ''
  const itemLevel = formatItemLevel(character?.ItemAvgLevel ?? character?.ItemMaxLevel)

  const [dailyChecked, setDailyChecked] = useState(() =>
    loadChecked(storageKeyDaily(charKey), storageKeyDailyMeta(charKey), today) ?? new Set()
  )
  const [weeklyChecked, setWeeklyChecked] = useState(() =>
    loadChecked(storageKeyWeekly(charKey), storageKeyWeeklyMeta(charKey), weekKey) ?? new Set()
  )
  const [raidModes, setRaidModes] = useState(() => loadRaidModes(charKey, weekKey))
  const [raidChecked, setRaidChecked] = useState(() => loadChecked(storageKeyRaidChecked(charKey), storageKeyRaidCheckedMeta(charKey), weekKey) ?? new Set())
  const [raidBusFees, setRaidBusFees] = useState(() => loadRaidBusFees(charKey, weekKey))
  const [raidBusRoles, setRaidBusRoles] = useState(() => loadRaidBusRoles(charKey, weekKey))
  const [raidSlots, setRaidSlots] = useState(() => loadRaidSlots(charKey, itemLevel))
  const [raidModalOpen, setRaidModalOpen] = useState(false)

  useEffect(() => {
    const loaded = loadChecked(storageKeyDaily(charKey), storageKeyDailyMeta(charKey), today)
    setDailyChecked(loaded ?? new Set())
  }, [charKey, today])
  useEffect(() => {
    const loaded = loadChecked(storageKeyWeekly(charKey), storageKeyWeeklyMeta(charKey), weekKey)
    setWeeklyChecked(loaded ?? new Set())
  }, [charKey, weekKey])
  useEffect(() => {
    setRaidModes(loadRaidModes(charKey, weekKey))
  }, [charKey, weekKey])
  useEffect(() => {
    const loaded = loadChecked(storageKeyRaidChecked(charKey), storageKeyRaidCheckedMeta(charKey), weekKey)
    setRaidChecked(loaded ?? new Set())
  }, [charKey, weekKey])
  useEffect(() => {
    setRaidBusFees(loadRaidBusFees(charKey, weekKey))
  }, [charKey, weekKey])
  useEffect(() => {
    setRaidBusRoles(loadRaidBusRoles(charKey, weekKey))
  }, [charKey, weekKey])
  useEffect(() => {
    setRaidSlots(loadRaidSlots(charKey, itemLevel))
  }, [charKey, itemLevel])

  const persistDaily = useCallback(
    (next) => {
      setDailyChecked(next)
      saveChecked(storageKeyDaily(charKey), storageKeyDailyMeta(charKey), today, next)
    },
    [charKey, today]
  )
  const persistWeekly = useCallback(
    (next) => {
      setWeeklyChecked(next)
      saveChecked(storageKeyWeekly(charKey), storageKeyWeeklyMeta(charKey), weekKey, next)
    },
    [charKey, weekKey]
  )
  const persistRaid = useCallback(
    (next) => {
      setRaidModes(next)
      saveRaidModes(charKey, weekKey, next)
    },
    [charKey, weekKey]
  )

  const setRaidBusFee = useCallback(
    (raidId, value) => {
      const num = value === '' || value == null ? null : Number(String(value).replace(/,/g, '').trim())
      const next = { ...raidBusFees }
      if (num == null || !Number.isFinite(num) || num < 0) delete next[raidId]
      else next[raidId] = num
      setRaidBusFees(next)
      saveRaidBusFees(charKey, weekKey, next)
    },
    [charKey, weekKey, raidBusFees]
  )

  const setRaidBusRole = useCallback(
    (raidId, role) => {
      const next = { ...raidBusRoles, [raidId]: role }
      setRaidBusRoles(next)
      saveRaidBusRoles(charKey, weekKey, next)
    },
    [charKey, weekKey, raidBusRoles]
  )

  const persistRaidChecked = useCallback(
    (next) => {
      setRaidChecked(next)
      saveChecked(storageKeyRaidChecked(charKey), storageKeyRaidCheckedMeta(charKey), weekKey, next)
    },
    [charKey, weekKey]
  )

  const [busFeeAttentionId, setBusFeeAttentionId] = useState(null)
  const triggerBusFeeAttention = useCallback((raidId) => {
    setBusFeeAttentionId(raidId)
    setTimeout(() => setBusFeeAttentionId((prev) => (prev === raidId ? null : prev)), 420)
  }, [])
  const toggleRaid = (id) => {
    const isAlreadyChecked = raidChecked.has(id)
    const mode = raidModes[id]
    if (isAlreadyChecked) {
      persistRaidChecked(new Set([...raidChecked].filter((x) => x !== id)))
      return
    }
    if (mode === 'bus' && !hasValidBusFee(id)) {
      triggerBusFeeAttention(id)
      return
    }
    persistRaidChecked(new Set([...raidChecked, id]))
  }

  const toggleDaily = (id) =>
    persistDaily(dailyChecked.has(id) ? new Set([...dailyChecked].filter((x) => x !== id)) : new Set([...dailyChecked, id]))
  const toggleWeekly = (id) =>
    persistWeekly(weeklyChecked.has(id) ? new Set([...weeklyChecked].filter((x) => x !== id)) : new Set([...weeklyChecked, id]))

  const dailyRatio = DAILY_ITEMS.length ? dailyChecked.size / DAILY_ITEMS.length : 0
  const weeklyRatio = WEEKLY_ITEMS.length ? weeklyChecked.size / WEEKLY_ITEMS.length : 0
  const hasValidBusFee = (id) => {
    const v = raidBusFees[id]
    if (v == null || v === '') return false
    const n = Number(String(v).replace(/,/g, '').trim())
    return Number.isFinite(n)
  }
  const raidDone = raidSlots.filter((id) => raidChecked.has(id) || (raidModes[id] === 'bus' && hasValidBusFee(id))).length
  const raidRatio = raidSlots.length ? raidDone / raidSlots.length : 0
  const dailyWeekly100 = dailyRatio >= 1 && weeklyRatio >= 1
  const raid100 = raidRatio >= 1
  const allComplete = dailyWeekly100 && raid100
  const isCompact = variant === 'compact'

  useEffect(() => {
    if (allComplete && !prevAllCompleteRef.current && onComplete) {
      prevAllCompleteRef.current = true
      onComplete(character, wrapRef.current)
    }
    if (!allComplete) {
      if (prevAllCompleteRef.current && onIncomplete) {
        onIncomplete(character)
      }
      prevAllCompleteRef.current = false
    }
  }, [allComplete, character, onComplete, onIncomplete])

  const handleResetAllHomework = () => {
    persistDaily(new Set())
    persistWeekly(new Set())
    persistRaidChecked(new Set())
    setRaidBusFees({})
    saveRaidBusFees(charKey, weekKey, {})
  }
  const handleCheckAllHomework = () => {
    persistDaily(new Set(DAILY_ITEMS.map((item) => item.id)))
    persistWeekly(new Set(WEEKLY_ITEMS.map((item) => item.id)))
    persistRaidChecked(new Set(raidSlots))
  }

  return (
    <>
    <div
      ref={wrapRef}
      data-char-key={charKey}
      className={`homework-char-card-wrap ${isAnimatingComplete ? 'is-complete-animating' : ''}`}
    >
    <Card className={`homework-char-card ${allComplete ? 'is-all-complete' : ''}`}>
      <div className={isAnimatingComplete ? 'homework-char-card-dimmed' : ''}>
      {isCompact ? (
        <div className="homework-char-row-compact">
          <div className="homework-char-compact-left">
            <ClassIcon className={className} size={24} />
            <div className="homework-char-name-wrap">
              <span className="homework-char-title">{name}</span>
              <span className="homework-char-level">{itemLevel != null ? itemLevel : '-'}</span>
            </div>
          </div>
          <div className="homework-char-compact-buttons" aria-label="숙제 체크">
            {DAILY_ITEMS.map((item) => (
              <button
                key={`d-${item.id}`}
                type="button"
                className={`homework-btn-chip ${dailyChecked.has(item.id) ? 'is-checked' : ''}`}
                onClick={() => toggleDaily(item.id)}
                aria-pressed={dailyChecked.has(item.id)}
                aria-label={`일일 ${item.label}`}
              >
                {item.label}
              </button>
            ))}
            {WEEKLY_ITEMS.map((item) => (
              <button
                key={`w-${item.id}`}
                type="button"
                className={`homework-btn-chip ${weeklyChecked.has(item.id) ? 'is-checked' : ''}`}
                onClick={() => toggleWeekly(item.id)}
                aria-pressed={weeklyChecked.has(item.id)}
                aria-label={`주간 ${item.label}`}
              >
                {item.label}
              </button>
            ))}
            {raidSlots
              .map((id) => RAID_ITEMS.find((r) => r.id === id))
              .filter(Boolean)
              .map((item) => {
                const mode = raidModes[item.id]
                const isChecked = raidChecked.has(item.id) || (mode === 'bus' && hasValidBusFee(item.id))
                return (
                  <button
                    key={`r-${item.id}`}
                    type="button"
                    className={`homework-btn-chip ${isChecked ? 'is-checked' : ''}`}
                    onClick={() => toggleRaid(item.id)}
                    aria-pressed={isChecked}
                    aria-label={`레이드 ${item.label}`}
                  >
                    {item.label}
                  </button>
                )
              })}
          </div>
          <div className="homework-char-compact-actions">
            <button
              type="button"
              className="homework-btn-icon homework-btn-quick"
              onClick={handleResetAllHomework}
              title="전체 숙제 초기화"
              aria-label="전체 숙제 초기화"
            >
              <IconReset />
            </button>
            <button
              type="button"
              className="homework-btn-icon homework-btn-checkall"
              onClick={handleCheckAllHomework}
              title="모든 숙제 전체 체크"
              aria-label="모든 숙제 전체 체크"
            >
              <IconCheck />
            </button>
            {onRemove && (
              <button type="button" className="homework-btn-icon homework-btn-remove" onClick={() => onRemove(character)} title="삭제" aria-label="삭제">
                <IconTrash />
              </button>
            )}
          </div>
        </div>
      ) : (
      <CardHeader className="homework-char-header">
        <div className="homework-char-info homework-char-header-main">
          <ClassIcon className={className} size={36} />
          <div className="homework-char-name-wrap">
            <CardTitle className="homework-char-title">{name}</CardTitle>
            <span className="homework-char-level">{itemLevel != null ? itemLevel : '-'}</span>
          </div>
        </div>
        <div className="homework-char-header-meta">
          <div className="homework-char-progress" aria-hidden>
            {(() => {
              const r = 14
              const cx = 18
              const cy = 18
              const circumference = 2 * Math.PI * r
              const halfCirc = circumference / 2
              const ringStroke = 5
              const dailyDash = dailyRatio * halfCirc
              const weeklyDash = weeklyRatio * halfCirc
              const raidDash = Math.min(raidRatio * circumference, circumference - 0.01)
              return (
                <>
                  <div className={`homework-progress-ring homework-progress-ring-dailyweekly ${dailyWeekly100 ? 'is-complete' : ''}`} title={`일일 ${dailyChecked.size}/${DAILY_ITEMS.length} · 주간 ${weeklyChecked.size}/${WEEKLY_ITEMS.length}`}>
                    <svg viewBox="0 0 36 36">
                      <circle className="homework-progress-ring-bg" cx={cx} cy={cy} r={r} />
                      <circle className="homework-progress-fill homework-progress-fill-daily" cx={cx} cy={cy} r={r} fill="none" strokeWidth={ringStroke} strokeDasharray={`${dailyDash} ${circumference - dailyDash}`} strokeDashoffset={-halfCirc} transform={`rotate(-90 ${cx} ${cy})`} />
                      <circle className="homework-progress-fill homework-progress-fill-weekly" cx={cx} cy={cy} r={r} fill="none" strokeWidth={ringStroke} strokeDasharray={`${weeklyDash} ${circumference - weeklyDash}`} strokeDashoffset={0} transform={`rotate(-90 ${cx} ${cy})`} />
                      <circle className="homework-progress-ring-edge homework-progress-edge-daily" cx={cx} cy={cy} r={r} fill="none" strokeWidth={2} strokeDasharray={`${halfCirc} ${circumference}`} strokeDashoffset={-halfCirc} transform={`rotate(-90 ${cx} ${cy})`} />
                      <circle className="homework-progress-ring-edge homework-progress-edge-weekly" cx={cx} cy={cy} r={r} fill="none" strokeWidth={2} strokeDasharray={`${halfCirc} ${circumference}`} strokeDashoffset={0} transform={`rotate(-90 ${cx} ${cy})`} />
                    </svg>
                  </div>
                  <div className={`homework-progress-ring homework-progress-ring-raid ${raid100 ? 'is-complete' : ''}`} title={`레이드 ${raidDone}/${raidSlots.length}`}>
                    <svg viewBox="0 0 36 36">
                      <circle className="homework-progress-ring-bg" cx={cx} cy={cy} r={r} />
                      <circle className="homework-progress-fill homework-progress-fill-raid" cx={cx} cy={cy} r={r} fill="none" strokeWidth={ringStroke} strokeDasharray={`${raidDash} ${circumference - raidDash}`} strokeDashoffset={0} transform={`rotate(-90 ${cx} ${cy})`} />
                    </svg>
                  </div>
                </>
              )
            })()}
          </div>
          <div className="homework-char-header-actions">
            <button
              type="button"
              className="homework-btn-icon homework-btn-checkall"
              onClick={handleCheckAllHomework}
              title="모든 숙제 전체 체크"
              aria-label="모든 숙제 전체 체크"
            >
              <IconCheck />
            </button>
            <button
              type="button"
              className="homework-btn-icon homework-btn-quick"
              onClick={handleResetAllHomework}
              title="전체 숙제 초기화"
              aria-label="전체 숙제 초기화"
            >
              <IconReset />
            </button>
            {onOpenGraph && (
              <button
                type="button"
                className="homework-btn-icon homework-btn-graph"
                onClick={onOpenGraph}
                title="그래프 보기"
                aria-label="그래프 보기"
              >
                <IconGraph />
              </button>
            )}
            {onRemove && (
              <button type="button" className="homework-btn-icon homework-btn-remove" onClick={() => onRemove(character)} title="삭제" aria-label="삭제">
                <IconTrash />
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      )}
      {!isCompact && (
      <CardContent className="homework-char-content">
        <div className="homework-char-section homework-char-section-compact homework-section-daily">
          <div className="homework-char-section-head">
            <CardDescription>일일 숙제</CardDescription>
            <button type="button" className="homework-btn-icon homework-btn-reset" onClick={() => persistDaily(new Set())} title="초기화" aria-label="초기화">
              <IconReset />
            </button>
          </div>
          <div className="homework-btns">
            {DAILY_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`homework-btn-chip ${dailyChecked.has(item.id) ? 'is-checked' : ''}`}
                onClick={() => toggleDaily(item.id)}
                aria-pressed={dailyChecked.has(item.id)}
                aria-label={item.label}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="homework-char-section homework-char-section-compact homework-section-weekly">
          <div className="homework-char-section-head">
            <CardDescription>주간 숙제</CardDescription>
            <button type="button" className="homework-btn-icon homework-btn-reset" onClick={() => persistWeekly(new Set())} title="초기화" aria-label="초기화">
              <IconReset />
            </button>
          </div>
          <div className="homework-btns">
            {WEEKLY_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`homework-btn-chip ${weeklyChecked.has(item.id) ? 'is-checked' : ''}`}
                onClick={() => toggleWeekly(item.id)}
                aria-pressed={weeklyChecked.has(item.id)}
                aria-label={item.label}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="homework-char-section homework-raid-section homework-section-raid">
          <div className="homework-char-section-head">
            <CardDescription>레이드</CardDescription>
            <div className="homework-raid-actions">
              <button type="button" className="homework-btn-icon homework-btn-edit" onClick={() => setRaidModalOpen(true)} title="레이드 목록 편집" aria-label="레이드 목록 편집">
                <IconEdit />
              </button>
              <button type="button" className="homework-btn-icon homework-btn-reset" onClick={() => { persistRaid({}); persistRaidChecked(new Set()); setRaidBusFees({}); setRaidBusRoles({}); saveRaidBusFees(charKey, weekKey, {}); saveRaidBusRoles(charKey, weekKey, {}); }} title="초기화" aria-label="초기화">
                <IconReset />
              </button>
            </div>
          </div>
          <div className="homework-list homework-raid-list" role="list">
            {raidSlots.length === 0 ? (
              <div className="homework-raid-empty">편집에서 표시할 레이드를 선택하세요.</div>
            ) : (
              raidSlots
                .map((id) => RAID_ITEMS.find((r) => r.id === id))
                .filter(Boolean)
                .map((item) => {
                  const mode = raidModes[item.id]
                  const mock = RAID_GOLD_MOCK[item.id]
                  const busFee = raidBusFees[item.id]
                  const busRole = raidBusRoles[item.id] ?? 'driver'
                  const isChecked = raidChecked.has(item.id) || (mode === 'bus' && hasValidBusFee(item.id))
                  return (
                    <div key={item.id} className={`homework-raid-card ${isChecked ? 'is-checked' : ''}`} role="listitem">
                      <button
                        type="button"
                        className={`homework-raid-row homework-raid-row-display ${isChecked ? 'is-checked' : ''}`}
                        onClick={() => toggleRaid(item.id)}
                        aria-pressed={isChecked}
                      >
                        <div className="homework-raid-chip-head">
                        <div className="homework-raid-row-main">
                          <span className="homework-item-label">{item.label}</span>
                          {mode && <span className={`homework-raid-badge homework-raid-badge-${mode}`}>{mode === 'single' ? '싱글' : '버스'}</span>}
                        </div>
                        {mock && (mock.gold > 0 || mock.boundGold > 0) && (
                          <div className="homework-raid-gold">
                            {mock.gold > 0 && (
                              <span className="homework-raid-gold-item homework-gold">
                                <span className="homework-gold-label">골드 </span>
                                <span className="homework-gold-value">{mock.gold.toLocaleString()}</span>
                              </span>
                            )}
                            {mock.gold > 0 && mock.boundGold > 0 && <span className="homework-raid-gold-sep">/</span>}
                            {mock.boundGold > 0 && (
                              <span className="homework-raid-gold-item homework-bound-gold">
                                <span className="homework-bound-gold-label">귀속 </span>
                                <span className="homework-bound-gold-value">{mock.boundGold.toLocaleString()}</span>
                              </span>
                            )}
                          </div>
                        )}
                        </div>
                      </button>
                      {mode === 'bus' && (
                        <div
                          className={`homework-raid-busfee-wrap ${busFeeAttentionId === item.id ? 'is-attention' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!hasValidBusFee(item.id)) {
                              triggerBusFeeAttention(item.id)
                            }
                            const input = e.currentTarget.querySelector('.homework-raid-busfee-input')
                            if (input instanceof HTMLInputElement) input.focus()
                          }}
                        >
                          <div className="homework-raid-busrow-inline">
                          <div className="homework-raid-busfee">
                            <input
                              type="text"
                              inputMode="numeric"
                              className={`homework-raid-busfee-input ${busFeeAttentionId === item.id ? 'is-attention' : ''}`}
                              value={busFee != null ? busFee : ''}
                              onChange={(e) => {
                                const raw = e.target.value
                                const v = raw.replace(/[^\d]/g, '')
                                setRaidBusFee(item.id, v === '' ? '' : v)
                              }}
                              onBlur={(e) => {
                                const raw = e.target.value.replace(/[^\d]/g, '')
                                const n = raw === '' ? null : Number(raw)
                                const isValid = n != null && Number.isFinite(n) && n >= 0
                                if (isValid) {
                                  persistRaidChecked(new Set([...raidChecked, item.id]))
                                  setBusFeeAttentionId((prev) => (prev === item.id ? null : prev))
                                } else {
                                  persistRaidChecked(new Set([...raidChecked].filter((x) => x !== item.id)))
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key !== 'Enter') return
                                const raw = e.currentTarget.value.replace(/[^\d]/g, '')
                                const n = raw === '' ? null : Number(raw)
                                const isValid = n != null && Number.isFinite(n) && n >= 0
                                if (isValid) {
                                  persistRaidChecked(new Set([...raidChecked, item.id]))
                                  setBusFeeAttentionId((prev) => (prev === item.id ? null : prev))
                                } else {
                                  triggerBusFeeAttention(item.id)
                                }
                              }}
                              placeholder="버스비 입력"
                            />
                            <span className="homework-raid-busfee-unit">G</span>
                          </div>
                            <div className={`homework-raid-busrole-switch ${busRole === 'passenger' ? 'is-passenger' : 'is-driver'}`}>
                              <span className="homework-raid-busrole-thumb" aria-hidden />
                              <button
                                type="button"
                                className="homework-raid-busrole-opt"
                                onClick={(e) => { e.stopPropagation(); setRaidBusRole(item.id, 'driver') }}
                                aria-pressed={busRole === 'driver'}
                                aria-label="기사"
                              >
                                기사
                              </button>
                              <button
                                type="button"
                                className="homework-raid-busrole-opt"
                                onClick={(e) => { e.stopPropagation(); setRaidBusRole(item.id, 'passenger') }}
                                aria-pressed={busRole === 'passenger'}
                                aria-label="승객"
                              >
                                승객
                              </button>
                            </div>
                          </div>
                          <div className="homework-raid-total-gold">
                            총 획득골드 <strong>{(() => {
                              const base = (mock?.gold ?? 0) + (mock?.boundGold ?? 0)
                              const fee = (busFee != null && Number.isFinite(Number(busFee)) ? Number(busFee) : 0)
                              const sign = busRole === 'driver' ? 1 : -1
                              return (base + sign * fee).toLocaleString()
                            })()}</strong> <span className="homework-g-unit">G</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
            )}
          </div>
        </div>
      </CardContent>
      )}
      </div>
      {isAnimatingComplete && (
        <div
          className="homework-char-card-complete-overlay"
          aria-hidden
          onClick={(e) => { e.stopPropagation(); onDismissComplete?.(character, wrapRef.current) }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDismissComplete?.(character, wrapRef.current) } }}
        >
          <span className="homework-char-card-complete-check"><IconCheck /></span>
        </div>
      )}
    </Card>
    </div>
    {raidModalOpen && typeof document !== 'undefined' && createPortal(
      <RaidSelectModal
        characterName={name}
        selectedIds={raidSlots}
        raidModes={raidModes}
        onSave={(ids, modes) => {
          setRaidSlots(ids)
          saveRaidSlots(charKey, ids)
          setRaidModes(modes)
          saveRaidModes(charKey, weekKey, modes)
          setRaidModalOpen(false)
        }}
        onClose={() => setRaidModalOpen(false)}
      />,
      document.body
    )}
    </>
  )
}

export function HomeworkPanel() {
  const today = getTodayDateString()
  const weekKey = getWeekKey()

  const [registered, setRegistered] = useState(() => loadRegistered())
  const [expeditionCards, setExpeditionCards] = useState(() => loadExpeditionCards())
  const [completedKeys, setCompletedKeys] = useState(() => {
    const list = loadRegistered()
    const todayStr = getTodayDateString()
    const weekStr = getWeekKey()
    return list.filter((c) => getCharacterCompletion(c, todayStr, weekStr)).map(getCharKey)
  })
  const [animatingCompleteKeys, setAnimatingCompleteKeys] = useState(() => new Set())
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [registerInput, setRegisterInput] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerError, setRegisterError] = useState('')
  const [viewMode, setViewMode] = useState(() => loadViewMode())
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [cardGraphFlippedKeys, setCardGraphFlippedKeys] = useState(() => new Set())
  const [graphBlockedShakeKey, setGraphBlockedShakeKey] = useState(0)
  const [useCustomOrder, setUseCustomOrder] = useState(() => loadUseCustomOrder())
  const [loginShakeTarget, setLoginShakeTarget] = useState('')
  const isCompactView = viewMode === 'compact'

  const hasRegistered = registered.length > 0
  const hasExpeditionCard = expeditionCards.length > 0

  /** 카드 표시 순서: 수동 저장 시에만 사용. 없으면 레벨순+완료 맨 끝 */
  const [cardOrder, setCardOrder] = useState(() => {
    const saved = loadCardOrder()
    return Array.isArray(saved) && saved.length > 0 ? saved : []
  })

  /** 등록/원정대 변경 시 cardOrder에서 없어진 항목 제거; 수동 순서 사용 중일 때만 병합 */
  useEffect(() => {
    const charKeys = new Set(registered.map(getCharKey))
    const hasExp = expeditionCards.length > 0
    setCardOrder((prev) => {
      const next = prev.filter((id) => (id === 'exp' ? hasExp : charKeys.has(id)))
      if (next.length === prev.length) return prev
      if (next.length > 0) saveCardOrder(next)
      return next
    })
  }, [registered, expeditionCards])

  useEffect(() => {
    const nextSet = new Set()
    for (const c of registered) {
      if (getCharacterCompletion(c, today, weekKey)) nextSet.add(getCharKey(c))
    }
    setCompletedKeys((prev) => {
      const ordered = prev.filter((k) => nextSet.has(k))
      const added = registered.filter((c) => nextSet.has(getCharKey(c)) && !ordered.includes(getCharKey(c))).map(getCharKey)
      return ordered.length || added.length ? [...ordered, ...added] : [...added]
    })
  }, [registered, today, weekKey])

  const addRegistered = useCallback((character) => {
    if (!character?.CharacterName || !character?.ServerName) return
    const key = getCharKey(character)
    const ensureExpeditionLevel = async (src) => {
      const existing = Number(String(src?.ExpeditionLevel ?? '').replace(/[^\d.]/g, ''))
      if (Number.isFinite(existing) && existing > 0) return src
      try {
        const armory = await fetchCharacterArmory(src.CharacterName)
        const rawLevel = armory?.ArmoryProfile?.ExpeditionLevel ?? armory?.ExpeditionLevel
        const nextLevel = Number(String(rawLevel ?? '').replace(/[^\d.]/g, ''))
        if (!Number.isFinite(nextLevel) || nextLevel <= 0) return src
        return { ...src, ExpeditionLevel: nextLevel }
      } catch {
        return src
      }
    }
    ;(async () => {
      const enriched = await ensureExpeditionLevel(character)
      setRegistered((prev) => {
        if (prev.some((c) => getCharKey(c) === key)) return prev
        const next = [...prev, { ...enriched }]
        saveRegistered(next)
        return next
      })
      setCardOrder((prev) => {
        if (prev.includes(key)) return prev
        const next = [...prev, key]
        saveCardOrder(next)
        return next
      })
    })()
  }, [])

  const gridRef = useRef(null)
  const completeTimeoutsRef = useRef({})
  const searchRequestIdRef = useRef(0)

  const MOVE_DELAY_MS = 1000

  /** 전부 완료되면 체크 오버레이 표시 → 1초 뒤 완료 목록에만 반영 (이동 애니 없음) */
  const handleCharacterComplete = useCallback((character, _wrapEl) => {
    const key = getCharKey(character)
    setAnimatingCompleteKeys((prev) => new Set([...prev, key]))
    const timeouts = completeTimeoutsRef.current
    if (timeouts[key] != null) {
      clearTimeout(timeouts[key])
      delete timeouts[key]
    }
    timeouts[key] = setTimeout(() => {
      delete completeTimeoutsRef.current[key]
      setCompletedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]))
    }, MOVE_DELAY_MS)
  }, [])

  /** 체크 오버레이 클릭 시 = 진행 중으로 복귀 (타이머 취소, 이동 애니 없음) */
  const handleDismissComplete = useCallback((character, _wrapEl) => {
    const key = getCharKey(character)
    const timeouts = completeTimeoutsRef.current
    if (timeouts[key] != null) {
      clearTimeout(timeouts[key])
      delete timeouts[key]
    }
    setCompletedKeys((prev) => prev.filter((k) => k !== key))
    setAnimatingCompleteKeys((prev) => new Set([...prev].filter((k) => k !== key)))
  }, [])

  /** 원정대 100% 완료 시 체크 오버레이 표시 */
  const handleExpeditionComplete = useCallback(() => {
    setAnimatingCompleteKeys((prev) => new Set([...prev, 'exp']))
  }, [])

  /** 원정대 체크 오버레이 클릭 시 해제 */
  const handleExpeditionDismissComplete = useCallback(() => {
    setAnimatingCompleteKeys((prev) => new Set([...prev].filter((k) => k !== 'exp')))
  }, [])

  /** 100% 깨질 때(숙제 체크 해제): 목록만 갱신 */
  const handleIncomplete = useCallback((character) => {
    const key = getCharKey(character)
    setCompletedKeys((prev) => prev.filter((k) => k !== key))
    setAnimatingCompleteKeys((prev) => new Set([...prev].filter((k) => k !== key)))
  }, [])

  const removeRegistered = useCallback((character) => {
    const key = getCharKey(character)
    setRegistered((prev) => {
      const next = sortRegisteredByLevel(prev.filter((c) => getCharKey(c) !== key))
      saveRegistered(next)
      return next
    })
    setCardOrder((prev) => {
      const next = prev.filter((id) => id !== key)
      saveCardOrder(next)
      return next
    })
  }, [])

  const addExpeditionCard = useCallback(() => {
    setExpeditionCards((prev) => {
      if (prev.length > 0) return prev
      const next = [EXPEDITION_SINGLE_ID]
      saveExpeditionCards(next)
      return next
    })
    setCardOrder((prev) => {
      if (prev.includes('exp')) return prev
      const next = ['exp', ...prev]
      saveCardOrder(next)
      return next
    })
  }, [])

  const setViewModeAndSave = useCallback((mode) => {
    if (mode === viewMode) return
    setViewMode(mode)
    saveViewMode(mode)
    if (mode === 'compact') {
      setCardGraphFlippedKeys(new Set())
    }
  }, [viewMode])

  const openCardGraph = useCallback((key) => {
    setCardGraphFlippedKeys((prev) => new Set([...prev, key]))
  }, [])
  const closeCardGraph = useCallback((key) => {
    setCardGraphFlippedKeys((prev) => {
      if (!prev.has(key)) return prev
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }, [])

  const handleLoginRequiredClick = useCallback((target) => {
    setLoginShakeTarget(target)
    setTimeout(() => {
      setLoginShakeTarget((prev) => (prev === target ? '' : prev))
    }, 220)
  }, [])

  const removeExpeditionCard = useCallback((expId) => {
    setExpeditionCards((prev) => {
      const next = prev.filter((id) => id !== expId)
      saveExpeditionCards(next)
      return next
    })
    setCardOrder((prev) => {
      const next = prev.filter((id) => id !== 'exp')
      saveCardOrder(next)
      return next
    })
  }, [])

  const handleSearch = async () => {
    const requestId = searchRequestIdRef.current + 1
    searchRequestIdRef.current = requestId
    const name = String(registerInput || '').trim()
    if (!name) return
    setRegisterError('')
    setSearchResults([])
    setRegisterLoading(true)
    try {
      const data = await fetchCharacterSiblings(name)
      const list = Array.isArray(data) ? data : []
      setSearchResults(list)
      if (list.length === 0) setRegisterError('검색 결과가 없습니다.')
      if (list.length > 0) {
        const enriched = await Promise.all(
          list.slice(0, 10).map(async (char) => {
            const raw = Number(String(char?.ExpeditionLevel ?? '').replace(/[^\d.]/g, ''))
            if (Number.isFinite(raw) && raw > 0) return char
            try {
              const armory = await fetchCharacterArmory(char.CharacterName)
              const fromArmory = armory?.ArmoryProfile?.ExpeditionLevel ?? armory?.ExpeditionLevel
              const parsed = Number(String(fromArmory ?? '').replace(/[^\d.]/g, ''))
              if (!Number.isFinite(parsed) || parsed <= 0) return char
              return { ...char, ExpeditionLevel: parsed }
            } catch {
              return char
            }
          })
        )
        if (searchRequestIdRef.current === requestId) {
          const byKey = new Map(enriched.map((c) => [getCharKey(c), c]))
          setSearchResults((prev) => prev.map((c) => byKey.get(getCharKey(c)) ?? c))
        }
      }
    } catch (e) {
      setRegisterError(e instanceof Error ? e.message : '검색에 실패했습니다.')
      setSearchResults([])
    } finally {
      setRegisterLoading(false)
    }
  }

  const toggleRemoteRegisterForm = useCallback(() => {
    setShowRegisterForm((prev) => {
      const next = !prev
      if (!next) {
        setRegisterInput('')
        setSearchResults([])
        setRegisterError('')
        setRegisterLoading(false)
      }
      return next
    })
  }, [])

  const keysRegistered = useMemo(() => new Set(registered.map(getCharKey)), [registered])
  const expeditionLevelFetchAttemptedRef = useRef(new Set())

  useEffect(() => {
    const target = registered.find((c) => {
      const key = getCharKey(c)
      if (expeditionLevelFetchAttemptedRef.current.has(key)) return false
      return Number.isNaN(Number(c?.ExpeditionLevel))
    })
    if (!target?.CharacterName) return

    const key = getCharKey(target)
    expeditionLevelFetchAttemptedRef.current.add(key)
    let cancelled = false

    ;(async () => {
      try {
        const armory = await fetchCharacterArmory(target.CharacterName)
        const rawLevel = armory?.ArmoryProfile?.ExpeditionLevel ?? armory?.ExpeditionLevel
        const nextLevel = Number(String(rawLevel ?? '').replace(/[^\d.]/g, ''))
        if (!Number.isFinite(nextLevel) || cancelled) return

        setRegistered((prev) => {
          let changed = false
          const next = prev.map((c) => {
            if (getCharKey(c) !== key) return c
            const current = Number(String(c?.ExpeditionLevel ?? '').replace(/[^\d.]/g, ''))
            if (Number.isFinite(current)) return c
            changed = true
            return { ...c, ExpeditionLevel: nextLevel }
          })
          if (changed) saveRegistered(next)
          return changed ? next : prev
        })
      } catch {
        // optional enrichment only
      }
    })()

    return () => {
      cancelled = true
    }
  }, [registered])

  const [columnCount, setColumnCount] = useState(() => {
    if (typeof window === 'undefined') return 2
    const w = window.innerWidth
    return w >= 1040 ? 4 : w >= 780 ? 3 : w >= 520 ? 2 : 1
  })
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      const count = w >= 1040 ? 4 : w >= 780 ? 3 : w >= 520 ? 2 : 1
      setColumnCount((c) => (c !== count ? count : c))
    }
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const MASONRY_GAP = 12
  const MASONRY_GAP_WIDE = 14
  const gapPx = columnCount >= 3 ? MASONRY_GAP_WIDE : MASONRY_GAP
  const APP_CONTENT_MAX_PX = 1000
  const DETAILED_CARD_MIN_WIDTH_PX = 256

  /** 레벨 높은 순, 완료한 캐릭터는 맨 끝 */
  const autoOrder = useMemo(() => {
    const hasExp = expeditionCards.length > 0
    const incomplete = registered.filter((c) => !completedKeys.includes(getCharKey(c)))
    const completed = registered.filter((c) => completedKeys.includes(getCharKey(c)))
    const incompleteSorted = sortRegisteredByLevel(incomplete)
    const completedSorted = sortRegisteredByLevel(completed)
    return [...(hasExp ? ['exp'] : []), ...incompleteSorted.map(getCharKey), ...completedSorted.map(getCharKey)]
  }, [expeditionCards.length, registered, completedKeys])

  /** 수동 순서 사용 시 cardOrder, 아니면 레벨순+완료 맨 끝. 원정대는 항상 맨 앞 고정 */
  const gridItems = useMemo(() => {
    const charByKey = new Map(registered.map((c) => [getCharKey(c), c]))
    const hasExp = expeditionCards.length > 0
    const customFiltered = useCustomOrder && cardOrder.length > 0
      ? cardOrder.filter((id) => (id === 'exp' ? hasExp : charByKey.has(id)))
      : []
    const order = customFiltered.length > 0 ? customFiltered : autoOrder
    const withExpFirst = hasExp && order[0] !== 'exp' ? ['exp', ...order.filter((id) => id !== 'exp')] : order
    return withExpFirst
      .map((id) => {
        if (id === 'exp') return hasExp ? { type: 'expedition', id: EXPEDITION_SINGLE_ID } : null
        const char = charByKey.get(id)
        return char ? { type: 'character', character: char } : null
      })
      .filter(Boolean)
  }, [useCustomOrder, cardOrder, autoOrder, expeditionCards, registered])

  const displayOrder = gridItems

  const allCardGraphKeys = useMemo(
    () =>
      displayOrder.map((item) =>
        item.type === 'expedition' ? 'exp' : getCharKey(item.character)
      ),
    [displayOrder]
  )
  const allCardsFlipped =
    allCardGraphKeys.length > 0 &&
    allCardGraphKeys.every((key) => cardGraphFlippedKeys.has(key))

  useEffect(() => {
    setCardGraphFlippedKeys((prev) => {
      const valid = new Set(allCardGraphKeys)
      const next = new Set([...prev].filter((k) => valid.has(k)))
      return next.size === prev.size ? prev : next
    })
  }, [allCardGraphKeys])

  const updateMasonryLayout = useCallback(() => {
    if (isCompactView) return
    const grid = gridRef.current
    if (!grid) return
    const parent = grid.parentElement
    const rawWidth = parent ? parent.getBoundingClientRect().width : 0
    const cap = typeof window !== 'undefined'
      ? Math.min(window.innerWidth - 48, APP_CONTENT_MAX_PX)
      : APP_CONTENT_MAX_PX
    const gridWidth = rawWidth > 0 ? Math.min(rawWidth, cap) : 0
    // 카드 최소 너비를 보장해 버튼/텍스트 잘림 방지
    const colsByMinWidth = gridWidth > 0
      ? Math.max(1, Math.floor((gridWidth + gapPx) / (DETAILED_CARD_MIN_WIDTH_PX + gapPx)))
      : 1
    // 카드 개수/브레이크포인트/최소너비 기준을 함께 적용
    const cols = Math.max(1, Math.min(columnCount, colsByMinWidth, Math.max(1, displayOrder.length)))
    const cardWidthPx = gridWidth > 0 ? (gridWidth - (cols - 1) * gapPx) / cols : 0
    grid.style.setProperty('--masonry-card-width-px', `${Math.max(0, cardWidthPx)}px`)

    if (displayOrder.length === 0 || columnCount < 1) {
      grid.style.height = '0'
      return
    }
    grid.style.height = 'auto'
  }, [displayOrder.length, columnCount, gapPx, isCompactView])

  useLayoutEffect(() => {
    updateMasonryLayout()
  }, [updateMasonryLayout, isCompactView])
  useEffect(() => {
    if (isCompactView) return
    const grid = gridRef.current
    if (!grid) return
    const ro = new ResizeObserver(updateMasonryLayout)
    ro.observe(grid)
    if (grid.parentElement) ro.observe(grid.parentElement)
    Array.from(grid.children).forEach((c) => c && ro.observe(c))
    return () => ro.disconnect()
  }, [updateMasonryLayout, displayOrder.length, isCompactView])
  useEffect(() => {
    if (isCompactView) return
    updateMasonryLayout()
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => updateMasonryLayout())
      window.setTimeout(() => updateMasonryLayout(), 220)
    }
  }, [cardGraphFlippedKeys, updateMasonryLayout, isCompactView])

  const hasAnyCards = registered.length > 0 || expeditionCards.length > 0

  const orderItemsForModal = useMemo(
    () =>
      gridItems.map((item) => {
        if (item.type === 'expedition') {
          return { id: 'exp', label: '원정대', level: null, className: null }
        }
        const c = item.character
        return {
          id: getCharKey(c),
          label: c?.CharacterName ?? '알 수 없음',
          level: formatItemLevel(c?.ItemAvgLevel ?? c?.ItemMaxLevel),
          className: c?.CharacterClassName ?? null,
        }
      }),
    [gridItems]
  )

  const chartDataByKey = useMemo(() => {
    const byKey = {}
    let expGold = 0
    let expDaily = 0
    let expWeekly = 0
    let expRaid = 0
    let expCount = 0
    const expDailyDoneHistory = new Array(168).fill(0)
    const expWeeklyRateHistory = new Array(24).fill(0)
    const expRaidRateHistory = new Array(24).fill(0)
    const expWeeklyGoldHistory = new Array(24).fill(0)
    for (const item of displayOrder) {
      if (item.type === 'character' && item.character) {
        const c = item.character
        const key = getCharKey(c)
        const h = mockHash(key)
        const gold = 5000 + (h % 15000)
        const dailyRate = 60 + (h % 41)
        const weeklyRate = 50 + ((h >> 4) % 51)
        const raidRate = 40 + ((h >> 8) % 61)
        const dailyDoneHistory = makeDailyDoneHistory(h, 168)
        const weeklyRateHistory = makeWeeklyRateHistory(h, 24, 45, 100)
        const raidRateHistory = makeWeeklyRateHistory(h + 13, 24, 35, 100)
        const weeklyGoldHistory = makeWeeklyGoldHistory(h + 29, 24)
        byKey[key] = {
          name: c?.CharacterName ?? '알 수 없음',
          gold,
          dailyRate,
          weeklyRate,
          raidRate,
          dailyDoneHistory,
          weeklyRateHistory,
          raidRateHistory,
          weeklyGoldHistory,
        }
        expGold += gold
        expDaily += dailyRate
        expWeekly += weeklyRate
        expRaid += raidRate
        for (let i = 0; i < 168; i += 1) expDailyDoneHistory[i] += dailyDoneHistory[i]
        for (let i = 0; i < 24; i += 1) {
          expWeeklyRateHistory[i] += weeklyRateHistory[i]
          expRaidRateHistory[i] += raidRateHistory[i]
          expWeeklyGoldHistory[i] += weeklyGoldHistory[i]
        }
        expCount += 1
      }
    }
    const hasExp = displayOrder.some((i) => i.type === 'expedition')
    if (hasExp) {
      byKey.exp = {
        name: '원정대',
        gold: expCount > 0 ? expGold : 0,
        dailyRate: expCount > 0 ? Math.round(expDaily / expCount) : 0,
        weeklyRate: expCount > 0 ? Math.round(expWeekly / expCount) : 0,
        raidRate: expCount > 0 ? Math.round(expRaid / expCount) : 0,
        dailyDoneHistory: expCount > 0 ? expDailyDoneHistory.map((v) => (v > 0 ? 1 : 0)) : new Array(168).fill(0),
        weeklyRateHistory: expCount > 0 ? expWeeklyRateHistory.map((v) => Math.round(v / expCount)) : new Array(24).fill(0),
        raidRateHistory: expCount > 0 ? expRaidRateHistory.map((v) => Math.round(v / expCount)) : new Array(24).fill(0),
        weeklyGoldHistory: expWeeklyGoldHistory,
      }
    }
    return byKey
  }, [displayOrder, getCharKey])

  const expeditionLevelValue = useMemo(() => {
    const levels = registered
      .map((c) => Number(String(c?.ExpeditionLevel ?? '').replace(/[^\d.]/g, '')))
      .filter((v) => Number.isFinite(v) && v > 0)
    if (levels.length === 0) return null
    return Math.max(...levels)
  }, [registered])

  return (
    <section className={`view-panel homework-panel homework-panel-${viewMode}`}>
      <div className="homework-layout">
        <div className="homework-main">
          {!hasAnyCards ? (
            <Card className="homework-empty-card">
              <CardContent>
                <p className="homework-empty-text">등록된 캐릭터가 없습니다. 리모콘에서 캐릭터를 검색해 등록하거나, 원정대 숙제 카드를 추가해 주세요.</p>
              </CardContent>
            </Card>
          ) : isCompactView ? (
            <div className="homework-by-server">
              <div className="homework-char-list-flow">
                {displayOrder.map((item) => {
                  if (item.type === 'expedition') {
                    return (
                      <ExpeditionHomeworkCard
                        key={item.id}
                        expId={item.id}
                        today={today}
                        weekKey={weekKey}
                        onRemove={removeExpeditionCard}
                        onComplete={handleExpeditionComplete}
                        onDismissComplete={handleExpeditionDismissComplete}
                        isAnimatingComplete={animatingCompleteKeys.has('exp')}
                        variant="compact"
                        expeditionLevelValue={expeditionLevelValue}
                      />
                    )
                  }
                  const charKey = getCharKey(item.character)
                  return (
                    <CharacterHomeworkCard
                      key={charKey}
                      character={item.character}
                      today={today}
                      weekKey={weekKey}
                      onRemove={removeRegistered}
                      onComplete={handleCharacterComplete}
                      onIncomplete={handleIncomplete}
                      onDismissComplete={handleDismissComplete}
                      isAnimatingComplete={animatingCompleteKeys.has(charKey)}
                      variant="compact"
                    />
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="homework-by-server">
              <div
                className="homework-char-grid homework-char-grid-masonry"
                ref={gridRef}
                style={{ gap: gapPx }}
              >
                {displayOrder.map((item) => {
                  const chartDataForCard = chartDataByKey[item.type === 'expedition' ? 'exp' : getCharKey(item.character)]
                  const cardLabelForCard = item.type === 'expedition' ? '원정대' : (item.character?.CharacterName ?? '알 수 없음')
                  if (item.type === 'expedition') {
                    return (
                      <HomeworkCardFlipWrapper
                        key={item.id}
                        isFlipped={cardGraphFlippedKeys.has('exp')}
                        chartData={chartDataForCard}
                        cardLabel={cardLabelForCard}
                        isExpedition
                        itemLevelValue={expeditionLevelValue != null ? `원정대 Lv.${expeditionLevelValue}` : null}
                        onBack={() => closeCardGraph('exp')}
                        onRemove={() => removeExpeditionCard(item.id)}
                      >
                        <ExpeditionHomeworkCard
                          expId={item.id}
                          today={today}
                          weekKey={weekKey}
                          onRemove={removeExpeditionCard}
                          onComplete={handleExpeditionComplete}
                          onDismissComplete={handleExpeditionDismissComplete}
                          isAnimatingComplete={animatingCompleteKeys.has('exp')}
                          onOpenGraph={() => openCardGraph('exp')}
                        expeditionLevelValue={expeditionLevelValue}
                        />
                      </HomeworkCardFlipWrapper>
                    )
                  }
                  const charKey = getCharKey(item.character)
                  return (
                    <HomeworkCardFlipWrapper
                      key={charKey}
                      isFlipped={cardGraphFlippedKeys.has(charKey)}
                      chartData={chartDataForCard}
                      cardLabel={cardLabelForCard}
                      characterClassName={item.character?.CharacterClassName ?? null}
                      itemLevelValue={formatItemLevel(item.character?.ItemAvgLevel ?? item.character?.ItemMaxLevel)}
                      onBack={() => closeCardGraph(charKey)}
                      onRemove={() => removeRegistered(item.character)}
                    >
                      <CharacterHomeworkCard
                        character={item.character}
                        today={today}
                        weekKey={weekKey}
                        onRemove={removeRegistered}
                        onComplete={handleCharacterComplete}
                        onIncomplete={handleIncomplete}
                        onDismissComplete={handleDismissComplete}
                        isAnimatingComplete={animatingCompleteKeys.has(charKey)}
                        onOpenGraph={() => openCardGraph(charKey)}
                      />
                    </HomeworkCardFlipWrapper>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <aside className="homework-aside">
          <Card className="homework-remote">
            <CardHeader>
              <CardTitle className="homework-remote-title">숙제</CardTitle>
              <CardDescription className="homework-remote-desc">캐릭터·원정대 카드와 보기 방식을 설정합니다.</CardDescription>
            </CardHeader>
            <CardContent className="homework-remote-actions">
              <button
                type="button"
                className={`homework-toolbar-btn homework-toolbar-btn-expedition ${hasExpeditionCard ? 'is-remove' : ''}`}
                onClick={() => {
                  if (hasExpeditionCard) {
                    removeExpeditionCard(EXPEDITION_SINGLE_ID)
                    return
                  }
                  addExpeditionCard()
                }}
                title={hasExpeditionCard ? '원정대 숙제 카드 제거' : '원정대 숙제 카드 추가'}
                aria-label={hasExpeditionCard ? '원정대 숙제 제거' : '원정대 숙제 추가'}
              >
                {hasExpeditionCard ? <IconMinus /> : <IconPlus />}
                <span>원정대</span>
              </button>
              <div className="homework-remote-register-toggle">
                <button
                  type="button"
                  className={`homework-toolbar-btn homework-toolbar-btn-register homework-toolbar-btn-register-trigger ${showRegisterForm ? 'is-open' : ''}`}
                  onClick={toggleRemoteRegisterForm}
                  title="캐릭터 등록"
                >
                  {showRegisterForm ? <IconMinus /> : <IconPlus />}
                  {!showRegisterForm && <span>캐릭터</span>}
                </button>
                <div className={`homework-remote-register ${showRegisterForm ? 'is-open' : ''}`}>
                  {showRegisterForm && (
                    <>
                    <div className="homework-remote-register-row">
                      <Input
                        placeholder="닉네임 검색"
                        value={registerInput}
                        onChange={(e) => setRegisterInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="homework-remote-register-input"
                      />
                      <button type="button" className="homework-toolbar-btn homework-toolbar-btn-remote-search" onClick={handleSearch} disabled={registerLoading}>
                        {registerLoading ? '검색 중…' : '검색'}
                      </button>
                    </div>
                    {registerError && <p className="homework-register-error">{registerError}</p>}
                    {searchResults.length > 0 && (
                      <ul className="homework-remote-search-results">
                        {searchResults.map((char, idx) => {
                          const key = getCharKey(char)
                          const isAdded = keysRegistered.has(key)
                          const level = formatItemLevel(char?.ItemAvgLevel ?? char?.ItemMaxLevel)
                          return (
                          <li
                            key={key}
                            className={`homework-remote-search-item ${isAdded ? 'is-added' : ''}`}
                            style={{ '--result-index': idx }}
                            role="button"
                            tabIndex={0}
                            onClick={() => (isAdded ? removeRegistered(char) : addRegistered(char))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                isAdded ? removeRegistered(char) : addRegistered(char)
                              }
                            }}
                            aria-pressed={isAdded}
                          >
                            <ClassIcon className={char?.CharacterClassName} size={18} />
                              <span className="homework-remote-search-name">{char.CharacterName}</span>
                              <span className="homework-remote-search-level">{level != null ? level : '-'}</span>
                              {isAdded && <span className="homework-remote-search-added-mark" aria-hidden><IconCheck /></span>}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                    </>
                  )}
                </div>
              </div>
              <button type="button" className="homework-toolbar-btn homework-toolbar-btn-order" onClick={() => setOrderModalOpen(true)} title="카드 순서 편집" aria-label="카드 순서 편집" disabled={gridItems.length < 2}>
                <IconEdit />
                <span>순서</span>
              </button>
              <button
                type="button"
                className={`homework-toolbar-btn homework-toolbar-btn-extra homework-toolbar-btn-graph-remote ${graphBlockedShakeKey ? 'homework-toolbar-btn-inactive-feedback is-shake' : ''}`}
                onClick={() => {
                  if (isCompactView) {
                    setGraphBlockedShakeKey((k) => k + 1)
                    setTimeout(() => setGraphBlockedShakeKey(0), 220)
                    return
                  }
                  setCardGraphFlippedKeys((prev) => {
                    if (allCardsFlipped) return new Set()
                    return new Set(allCardGraphKeys)
                  })
                }}
                title={allCardsFlipped ? '목록 보기' : '숙제 현황 그래프'}
              >
                {allCardsFlipped ? <IconList /> : <IconGraph />}
                <span>{allCardsFlipped ? '목록' : '그래프'}</span>
              </button>
              <button
                type="button"
                className={`homework-toolbar-btn homework-toolbar-btn-extra homework-toolbar-btn-login-required ${loginShakeTarget === 'friend' ? 'is-shake' : ''}`}
                onClick={() => handleLoginRequiredClick('friend')}
                title="깐부"
              >
                깐부
              </button>
              <button
                type="button"
                className={`homework-toolbar-btn homework-toolbar-btn-extra homework-toolbar-btn-login-required ${loginShakeTarget === 'party' ? 'is-shake' : ''}`}
                onClick={() => handleLoginRequiredClick('party')}
                title="파티"
              >
                파티
              </button>
              <button
                type="button"
                className={`homework-toolbar-btn homework-toolbar-btn-extra homework-toolbar-btn-login-required ${loginShakeTarget === 'raid' ? 'is-shake' : ''}`}
                onClick={() => handleLoginRequiredClick('raid')}
                title="공대"
              >
                공대
              </button>
              <button
                type="button"
                className={`homework-mode-switch ${viewMode === 'detailed' ? 'is-detailed' : 'is-compact'}`}
                onClick={() => setViewModeAndSave(viewMode === 'compact' ? 'detailed' : 'compact')}
                aria-label={`보기 방식 전환: 현재 ${viewMode === 'compact' ? '간략하게' : '자세히'}`}
              >
                <span className="homework-mode-switch-label is-left">간략하게</span>
                <span className="homework-mode-switch-label is-right">자세히</span>
                <span className="homework-mode-switch-thumb" aria-hidden />
              </button>
            </CardContent>
          </Card>
        </aside>
      </div>

      {orderModalOpen && (
        <OrderEditModal
          items={orderItemsForModal}
          onSave={(newOrder) => {
            setCardOrder(newOrder)
            saveCardOrder(newOrder)
            setUseCustomOrder(true)
            saveUseCustomOrder(true)
            setOrderModalOpen(false)
          }}
          onClose={() => setOrderModalOpen(false)}
        />
      )}

    </section>
  )
}
