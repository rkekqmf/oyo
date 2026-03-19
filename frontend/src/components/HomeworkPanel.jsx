import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DAILY_ITEMS, WEEKLY_ITEMS, RAID_ITEMS, getDefaultRaidIdsByLevel } from '../data/homeworkChecklist'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { fetchCharacterArmory, fetchCharacterSiblings } from '../services/lostarkApi'
import { getClassShortLabel, getClassIconSrc } from '../utils/classIcon'

const REGISTERED_KEY = 'oyo_homework_registered'
const EXPEDITION_CARDS_KEY = 'oyo_homework_expedition_cards'
const CARD_ORDER_KEY = 'oyo_homework_card_order'
const VIEW_MODE_KEY = 'oyo_homework_view_mode'
const EXPEDITION_LEVEL_HINT_KEY = 'oyo_homework_expedition_level_hint'
const WEEKLY_SLOTS_KEY_PREFIX = 'oyo_homework_weekly_slots_'
const EXPEDITION_DAILY_SLOTS_KEY_PREFIX = 'oyo_expedition_daily_slots_'
const EXPEDITION_WEEKLY_SLOTS_KEY_PREFIX = 'oyo_expedition_weekly_slots_'

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
  const name = normalizeText(character?.CharacterName, '')
  const server = normalizeText(character?.ServerName, '')
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

function loadExpeditionLevelHint() {
  try {
    const raw = localStorage.getItem(EXPEDITION_LEVEL_HINT_KEY)
    const v = Number(String(raw ?? '').replace(/[^\d.]/g, ''))
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : null
  } catch {
    return null
  }
}

function saveExpeditionLevelHint(v) {
  try {
    if (v == null || !Number.isFinite(v) || v <= 0) return
    localStorage.setItem(EXPEDITION_LEVEL_HINT_KEY, String(Math.floor(v)))
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
    const RAID_ID_ALIASES = {
      'behemoth-normal': 'behemoth-n',
    }
    const raw = localStorage.getItem(storageKeyRaidSlots(charKey))
    if (!raw) {
      const defaultIds = getDefaultRaidIdsByLevel(itemLevel)
      if (defaultIds.length) saveRaidSlots(charKey, defaultIds)
      return defaultIds
    }
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return getDefaultRaidIdsByLevel(itemLevel)
    return arr.map((id) => RAID_ID_ALIASES[id] ?? id)
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

function loadWeeklySlots(charKey) {
  try {
    const stored = localStorage.getItem(`${WEEKLY_SLOTS_KEY_PREFIX}${charKey}`)
    if (!stored) return WEEKLY_ITEMS.map((x) => x.id)
    const parsed = JSON.parse(stored)
    const ids = Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
    const allowed = new Set(WEEKLY_ITEMS.map((x) => x.id))
    const cleaned = ids.filter((id) => allowed.has(id))
    return cleaned
  } catch {
    return WEEKLY_ITEMS.map((x) => x.id)
  }
}
function saveWeeklySlots(charKey, ids) {
  try {
    localStorage.setItem(`${WEEKLY_SLOTS_KEY_PREFIX}${charKey}`, JSON.stringify(ids))
  } catch {}
}

function loadExpeditionSlots(prefix, expId, allIds) {
  try {
    const stored = localStorage.getItem(`${prefix}${expId}`)
    if (!stored) return allIds
    const parsed = JSON.parse(stored)
    const ids = Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
    const allowed = new Set(allIds)
    const cleaned = ids.filter((id) => allowed.has(id))
    return cleaned
  } catch {
    return allIds
  }
}
function saveExpeditionSlots(prefix, expId, ids) {
  try {
    localStorage.setItem(`${prefix}${expId}`, JSON.stringify(ids))
  } catch {}
}

function getCharacterCompletion(character, today, weekKey) {
  const charKey = getCharKey(character)
  const itemLevel = character?.ItemLevel
  const dailyChecked = loadChecked(storageKeyDaily(charKey), storageKeyDailyMeta(charKey), today) ?? new Set()
  const weeklyChecked = loadChecked(storageKeyWeekly(charKey), storageKeyWeeklyMeta(charKey), weekKey) ?? new Set()
  const weeklySlots = loadWeeklySlots(charKey)
  const raidSlots = loadRaidSlots(charKey, itemLevel)
  const raidChecked = loadChecked(storageKeyRaidChecked(charKey), storageKeyRaidCheckedMeta(charKey), weekKey) ?? new Set()
  const raidModes = loadRaidModes(charKey, weekKey)
  const raidBusFees = loadRaidBusFees(charKey, weekKey)
  const dailyRatio = DAILY_ITEMS.length ? dailyChecked.size / DAILY_ITEMS.length : 0
  const weeklyRatio = weeklySlots.length ? [...weeklyChecked].filter((id) => weeklySlots.includes(id)).length / weeklySlots.length : 1
  const hasValidBusFee = (id) => {
    const v = raidBusFees[id]
    if (v == null || v === '') return false
    const n = Number(String(v).replace(/,/g, '').trim())
    return Number.isFinite(n)
  }
  const raidDone = raidSlots.filter((id) => {
    const meta = RAID_ITEMS.find((it) => it.id === id)
    const defaultEffectiveMode = 'single'
    const effectiveMode = raidModes[id] ?? defaultEffectiveMode
    return raidChecked.has(id)
  }).length
  const raidRatio = raidSlots.length ? raidDone / raidSlots.length : 1
  return dailyRatio >= 1 && weeklyRatio >= 1 && raidRatio >= 1
}

function formatItemLevel(v) {
  if (v == null || v === '') return null
  const s = String(v).replace(/,/g, '').trim()
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function formatSearchItemLevel(v) {
  const n = formatItemLevel(v)
  return n != null ? Math.floor(n) : null
}

function normalizeText(v, fallback = '') {
  if (v == null) return fallback
  const s = String(v).trim()
  const lower = s.toLowerCase()
  if (s === '' || lower === 'null' || lower === 'undefined') return fallback
  return s
}

function compactTaskLabel(label, kind = 'generic') {
  const map = {
    '카오스 던전': '카던',
    '가디언 토벌': '가토',
    '낙원 - 천상': '천상',
    '낙원 - 증명': '증명',
    '낙원 - 지옥': '옥',
    '발탄 노말': '발노',
    '발탄 하드': '발하',
    '비아키스 노말': '비노',
    '비아키스 하드': '비하',
    '쿠크세이튼 노말': '쿠노',
    '쿠크세이튼 하드': '쿠하',
    '카양겔 노말': '카노',
    '카양겔 하드': '카하',
    '일리아칸 노말': '일노',
    '일리아칸 하드': '일하',
    '상아탑 노말': '상노',
    '상아탑 하드': '상하',
    '에키드나 노말': '에노',
    '에키드나 하드': '에하',
    '베히모스': '베히',
    '세르카': '세르카',
    '지평의 성당': '성당',
    '종막:카제로스': '종막',
    '4막:아르모체': '4막',
    '3막:모르둠': '3막',
    '2막:아브렐슈드': '2막',
    '아브렐슈드 노말': '아브노',
    '아브렐슈드 하드': '아브하',
    '카멘 노말': '카멘노',
    '카멘 하드': '카멘하',
  }
  if (map[label]) return map[label]
  if (kind === 'weekly' && label.includes('-')) return label.split('-').pop()?.trim() || label
  if (label.length <= 4) return label
  return label.replace(/\s+/g, '').slice(0, 4)
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
    ids.forEach((id) => {
      const meta = RAID_ITEMS.find((x) => x.id === id)
      const isBusOnly = Boolean(meta?.busOnly)
      const mode = modes[id]
      if (isBusOnly) cleanedModes[id] = 'bus'
      else if (mode) cleanedModes[id] = mode
    })
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
            {(() => {
              const raidCategoryDefs = [
                { key: 'shadow', label: '그림자 레이드' },
                { key: 'abyss', label: '어비스 던전' },
                { key: 'kazerus', label: '카제로스 레이드' },
                { key: 'epic', label: '에픽 레이드' },
              ]

              const normalizeCategoryKey = (value) => {
                if (value == null) return 'shadow'
                const s = String(value).trim().toLowerCase()
                if (!s) return 'shadow'
                if (s.includes('그림자') || s.includes('shadow')) return 'shadow'
                if (s.includes('카제로스') || s.includes('kazerus')) return 'kazerus'
                if (s.includes('어비스') || s.includes('abyss') || s.includes('던전')) return 'abyss'
                if (s.includes('에픽') || s.includes('epic')) return 'epic'
                return 'shadow'
              }

              return raidCategoryDefs.flatMap((cat) => {
                const categoryItems = RAID_ITEMS.filter((it) => normalizeCategoryKey(it.category ?? it.group ?? it.raidCategory ?? it.raidGroup) === cat.key)
                return [
                  <li key={`${cat.key}-head`} className="homework-raid-modal-category-head">
                    {cat.label}
                  </li>,
                  ...(categoryItems.length
                    ? categoryItems.map((item) => {
                        const mode = modes[item.id]
                        const isSelected = picked.has(item.id)
                        const isBusOnly = Boolean(item.busOnly)
                        const effectiveMode = isBusOnly ? 'bus' : mode
                        const difficultyLabel =
                          item.difficulty === 'nightmare' ? '나메' : item.difficulty === 'hard' ? '하드' : '노말'
                        return (
                          <li
                            key={item.id}
                            role="button"
                            tabIndex={0}
                            className={`homework-raid-modal-row ${isSelected ? 'is-selected' : ''}`}
                            onClick={() => toggleRowPick(item.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                toggleRowPick(item.id)
                              }
                            }}
                            aria-pressed={isSelected}
                          >
                            <span className="homework-raid-modal-row-label">
                              {item.label}
                              {isBusOnly ? <span className="homework-raid-badge homework-raid-badge-bus" style={{ marginLeft: 8 }}>{difficultyLabel}</span> : null}
                            </span>
                            <div className="homework-raid-mode-btns">
                              {!isBusOnly && (
                                <button
                                  type="button"
                                  className={`homework-raid-mode-btn ${effectiveMode === 'single' ? 'is-active' : ''}`}
                                  onClick={(e) => setRaidModeInModal(item.id, 'single', e)}
                                  aria-pressed={effectiveMode === 'single'}
                                  aria-label={`${item.label} 싱글`}
                                >
                                  싱글
                                </button>
                              )}
                              <button
                                type="button"
                                className={`homework-raid-mode-btn ${effectiveMode === 'bus' ? 'is-active' : ''}`}
                                onClick={(e) => setRaidModeInModal(item.id, 'bus', e)}
                                aria-pressed={effectiveMode === 'bus'}
                                aria-label={`${item.label} 버스`}
                              >
                                버스
                              </button>
                            </div>
                          </li>
                        )
                      })
                    : [
                        <li key={`${cat.key}-empty`} className="homework-raid-empty">
                          {cat.key === 'epic' ? '추가 예정' : '표시할 레이드 없음'}
                        </li>,
                      ]),
                ]
              })
            })()}
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

/** 캐릭터 카드용: 주간 숙제 + 레이드 한 번에 편집 */
function CharacterEditModal({ characterName, characterClassName, itemLevelValue, weeklyChecked, raidSlots, raidModes, onSave, onClose }) {
  const [pickedWeekly, setPickedWeekly] = useState(() => new Set(weeklyChecked))
  const [pickedRaid, setPickedRaid] = useState(() => {
    const byGroup = new Map()
    for (const id of raidSlots) {
      const meta = RAID_ITEMS.find((x) => x.id === id)
      const groupKey = meta?.groupKey ?? meta?.id ?? id
      byGroup.set(groupKey, id)
    }
    return new Set(byGroup.values())
  })
  // 모달 진입 시, 토글 가능한 레이드(싱글/버스 모두 허용)에서
  // 로컬스토리지 잔존값 때문에 버스가 자동 활성되는 현상을 방지합니다.
  const [modes, setModes] = useState(() => {
    const init = { ...raidModes }
    for (const id of raidSlots) {
      init[id] = 'single'
    }
    return init
  })
  const raidItemById = useMemo(() => new Map(RAID_ITEMS.map((it) => [it.id, it])), [])
  const [denyBusClickGroupKey, setDenyBusClickGroupKey] = useState(null)
  const flashDenyBus = (groupKey) => {
    setDenyBusClickGroupKey(groupKey)
    setTimeout(() => setDenyBusClickGroupKey((prev) => (prev === groupKey ? null : prev)), 220)
  }
  const [denyDifficultyClickGroupKey, setDenyDifficultyClickGroupKey] = useState(null)
  const flashDenyDifficulty = (groupKey) => {
    setDenyDifficultyClickGroupKey(groupKey)
    setTimeout(() => setDenyDifficultyClickGroupKey((prev) => (prev === groupKey ? null : prev)), 220)
  }
  const [denyLevelRaidId, setDenyLevelRaidId] = useState(null)
  const [toast, setToast] = useState(null)
  const showToast = (message) => {
    const id = Date.now()
    setToast({ id, message })
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev))
    }, 1800)
  }
  const flashLevelDeny = (raidId, message) => {
    setDenyLevelRaidId(raidId)
    setTimeout(() => setDenyLevelRaidId((prev) => (prev === raidId ? null : prev)), 220)
    showToast(message)
  }

  const toggleWeekly = (id) => {
    setPickedWeekly((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getDefaultModeForRaidId = (raidId) => {
    return 'single'
  }

  // 그룹(예: 세르카)에서 선택을 완전히 해제
  const clearGroupSelection = (groupKey) => {
    const groupIds = RAID_ITEMS.filter((x) => (x.groupKey ?? x.id) === groupKey).map((x) => x.id)
    setPickedRaid((prev) => {
      const next = new Set(prev)
      groupIds.forEach((gid) => next.delete(gid))
      return next
    })
    setModes((prev) => {
      const next = { ...prev }
      groupIds.forEach((gid) => { delete next[gid] })
      return next
    })
  }

  // 그룹(예: 세르카) 안에서는 난이도(raidId) 하나만 고르도록 강제
  const selectRaidDifficulty = (raidId) => {
    const meta = raidItemById.get(raidId)
    if (!meta) return
    const myLevel = Number(itemLevelValue)
    const raidEntry = Number(meta.entryLevel)
    if (Number.isFinite(myLevel) && Number.isFinite(raidEntry) && raidEntry > myLevel) {
      flashLevelDeny(raidId, `입장 레벨 부족 (요구 Lv.${raidEntry})`)
      return
    }
    const groupKey = meta.groupKey ?? meta.id
    const groupIds = RAID_ITEMS.filter((x) => (x.groupKey ?? x.id) === groupKey).map((x) => x.id)

    // 같은 난이도 버튼을 다시 누르면 해제
    if (pickedRaid.has(raidId)) {
      clearGroupSelection(groupKey)
      return
    }

    setPickedRaid((prev) => {
      const next = new Set(prev)
      groupIds.forEach((gid) => next.delete(gid))
      next.add(raidId)
      return next
    })

    setModes((prev) => {
      const next = { ...prev }
      groupIds.forEach((gid) => { if (gid !== raidId) delete next[gid] })
      // 난이도 선택 시 버스태그는 "기본값(싱글/버스)"으로 리셋
      next[raidId] = getDefaultModeForRaidId(raidId)

      // disallowed mode 강제 방지
      const currentMode = next[raidId]
      if (currentMode === 'bus' && meta.difficulty === 'single') next[raidId] = 'single'
      return next
    })
  }

  const setRaidModeInModal = (raidId, mode, e) => {
    if (e) e.stopPropagation()
    const meta = raidItemById.get(raidId)
    if (!meta) return
    const allow = mode === 'bus' ? meta.difficulty !== 'single' : true
    if (!allow) return
    setPickedRaid((prev) => new Set(prev).add(raidId))
    setModes((prev) => ({ ...prev, [raidId]: mode }))
  }

  const handleSave = () => {
    const raidIds = RAID_ITEMS.filter((item) => pickedRaid.has(item.id)).map((item) => item.id)
    const cleanedModes = {}
    raidIds.forEach((id) => {
      const mode = modes[id] ?? getDefaultModeForRaidId(id)
      const defaultMode = getDefaultModeForRaidId(id)
      if (mode && mode !== defaultMode) cleanedModes[id] = mode
    })
    onSave(pickedWeekly, raidIds, cleanedModes)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-panel homework-raid-modal homework-card-edit-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header homework-edit-header">
          <div className="homework-edit-hero">
            <ClassIcon className={characterClassName} size={46} />
            <div className="homework-edit-meta">
              <h2 className="homework-edit-name">{characterName}</h2>
              <div className="homework-edit-level">{itemLevelValue != null ? `Lv.${itemLevelValue}` : '-'}</div>
            </div>
          </div>
          <div aria-hidden />
        </header>
        <div className="modal-content">
          <div className="homework-card-edit-section">
            <h3 className="homework-card-edit-section-title">주간 숙제</h3>
            <ul className="homework-raid-modal-list">
              {WEEKLY_ITEMS.map((item) => (
                <li
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  className={`homework-raid-modal-row ${pickedWeekly.has(item.id) ? 'is-selected' : ''}`}
                  onClick={() => toggleWeekly(item.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleWeekly(item.id); } }}
                  aria-pressed={pickedWeekly.has(item.id)}
                >
                  <span className="homework-raid-modal-row-label">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="homework-card-edit-section">
            <h3 className="homework-card-edit-section-title">레이드</h3>
            <ul className="homework-raid-modal-list">
              {(() => {
                const raidCategoryDefs = [
                  { key: 'shadow', label: '그림자 레이드' },
                  { key: 'abyss', label: '어비스 던전' },
                  { key: 'kazerus', label: '카제로스 레이드' },
                  { key: 'epic', label: '에픽 레이드' },
                ]

                const normalizeCategoryKey = (value) => {
                  if (value == null) return 'shadow'
                  const s = String(value).trim().toLowerCase()
                  if (!s) return 'shadow'
                  if (s.includes('그림자') || s.includes('shadow')) return 'shadow'
                  if (s.includes('카제로스') || s.includes('kazerus')) return 'kazerus'
                  if (s.includes('어비스') || s.includes('abyss') || s.includes('던전')) return 'abyss'
                  if (s.includes('에픽') || s.includes('epic')) return 'epic'
                  return 'shadow'
                }

                return raidCategoryDefs.flatMap((cat) => {
                  const categoryItems = RAID_ITEMS.filter((it) => normalizeCategoryKey(it.category ?? it.group ?? it.raidCategory ?? it.raidGroup) === cat.key)
                  const difficultyToLabel = (diff) => (
                    diff === 'single'
                      ? '싱글'
                      : diff === 'stage1'
                        ? '1단'
                        : diff === 'stage2'
                          ? '2단'
                          : diff === 'stage3'
                            ? '3단'
                            : diff === 'nightmare'
                              ? '나메'
                              : diff === 'hard'
                                ? '하드'
                                : '노말'
                  )
                  const groupKeys = Array.from(new Set(categoryItems.map((it) => it.groupKey ?? it.id)))
                  return [
                    <li key={`${cat.key}-head`} className="homework-raid-modal-category-head">
                      {cat.label}
                    </li>,
                    ...(categoryItems.length
                      ? groupKeys.map((groupKey) => {
                        const groupItems = categoryItems
                          .filter((it) => (it.groupKey ?? it.id) === groupKey)
                          .sort((a, b) => {
                            const order = { single: 0, normal: 1, hard: 2, nightmare: 3 }
                            return (order[a.difficulty] ?? 99) - (order[b.difficulty] ?? 99)
                          })
                        const pickedId = groupItems.find((it) => pickedRaid.has(it.id))?.id ?? null
                        const selectedId = pickedId
                        const groupHasBusOption = groupItems.some((it) => {
                          const m = raidItemById.get(it.id)
                          return m?.difficulty !== 'single'
                        })
                        const selectedMode = selectedId
                          ? (modes[selectedId] ?? getDefaultModeForRaidId(selectedId))
                          : null
                        const groupLabel = groupItems[0]?.label ?? groupKey

                        return (
                          <li
                            key={groupKey}
                            className={`homework-raid-modal-row ${selectedId ? 'is-selected' : ''}`}
                            onClick={() => {
                              // 버튼 영역 밖(행 클릭)에서는 선택 해제
                              if (pickedId) {
                                clearGroupSelection(groupKey)
                                return
                              }
                              // 행 자체를 눌러 선택하려는 경우에도 난이도 선택을 유도
                              flashDenyDifficulty(groupKey)
                              showToast('난이도를 선택해 주세요.')
                            }}
                          >
                            <span className="homework-raid-modal-row-label">{groupLabel}</span>
                            <div className="homework-raid-mode-btns" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              {groupItems.map((it) => {
                                const isSelected = selectedId === it.id
                                const diffKey =
                                  it.difficulty === 'single'
                                    ? 'single'
                                    : it.difficulty === 'stage1'
                                      ? 'normal'
                                      : it.difficulty === 'stage2'
                                        ? 'hard'
                                        : it.difficulty === 'stage3'
                                          ? 'nightmare'
                                          : it.difficulty === 'nightmare'
                                            ? 'nightmare'
                                            : it.difficulty === 'hard'
                                              ? 'hard'
                                              : 'normal'
                                return (
                                  <button
                                    key={it.id}
                                    type="button"
                                    className={`homework-raid-mode-btn homework-raid-mode-btn-diff-${diffKey} ${isSelected ? 'is-active' : ''} ${denyDifficultyClickGroupKey === groupKey && !selectedId ? 'is-denied' : ''} ${denyLevelRaidId === it.id ? 'is-denied' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); selectRaidDifficulty(it.id) }}
                                    aria-pressed={isSelected}
                                    aria-label={`${groupLabel} ${difficultyToLabel(it.difficulty)}`}
                                  >
                                    {difficultyToLabel(it.difficulty)}
                                  </button>
                                )
                              })}
                              {groupHasBusOption ? (
                                (() => {
                                  const meta = selectedId ? raidItemById.get(selectedId) : undefined
                                  const canBus = Boolean(meta?.difficulty !== 'single') && Boolean(selectedId)
                                  const isDeniedUi = !canBus && denyBusClickGroupKey === groupKey
                                  return (
                                    <button
                                      type="button"
                                      className={`homework-raid-mode-btn homework-raid-mode-btn-bus ${selectedMode === 'bus' ? 'is-active' : ''} ${!canBus ? 'is-disabled' : ''} ${isDeniedUi ? 'is-denied' : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (!selectedId || !meta) {
                                          // 난이도 미선택 상태에서 버스를 누르면 "난이도 먼저" 효과(빨간 테두리)
                                          flashDenyDifficulty(groupKey)
                                          showToast('난이도를 먼저 선택해 주세요.')
                                          return
                                        }
                                        if (!canBus) {
                                          flashDenyBus(groupKey)
                                          showToast('싱글 난이도에서는 버스를 선택할 수 없어요.')
                                          return
                                        }
                                        if (selectedMode === 'bus') {
                                          setRaidModeInModal(selectedId, 'single', e)
                                        } else {
                                          setRaidModeInModal(selectedId, 'bus', e)
                                        }
                                      }}
                                      aria-pressed={selectedMode === 'bus'}
                                      aria-disabled={!canBus}
                                      aria-label={`${groupLabel} 버스`}
                                    >
                                      버스
                                    </button>
                                  )
                                })()
                              ) : null}
                            </div>
                          </li>
                        )
                      })
                      : [
                        <li key={`${cat.key}-empty`} className="homework-raid-empty">
                          {cat.key === 'epic' ? '추가 예정' : '표시할 레이드 없음'}
                        </li>,
                      ]),
                  ]
                })
              })()}
            </ul>
          </div>
        </div>
        {toast ? <div className="homework-modal-toast">{toast.message}</div> : null}
        <div className="homework-raid-modal-actions">
          <Button type="button" onClick={handleSave}>저장</Button>
          <Button type="button" variant="secondary" onClick={onClose}>취소</Button>
        </div>
      </section>
    </div>
  )
}

/** 원정대 카드용: 일일 + 주간 숙제 한 번에 편집 */
function ExpeditionEditModal({ dailyChecked, weeklyChecked, onSave, onClose }) {
  const [pickedDaily, setPickedDaily] = useState(() => new Set(dailyChecked))
  const [pickedWeekly, setPickedWeekly] = useState(() => new Set(weeklyChecked))

  const toggleDaily = (id) => {
    setPickedDaily((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleWeekly = (id) => {
    setPickedWeekly((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = () => {
    onSave(pickedDaily, pickedWeekly)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-panel homework-raid-modal homework-card-edit-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2>편집 — 원정대</h2>
            <p>일일·주간 숙제 목록을 설정하세요.</p>
          </div>
          <Button type="button" size="sm" variant="secondary" className="modal-close" onClick={onClose}>
            닫기
          </Button>
        </header>
        <div className="modal-content">
          <div className="homework-card-edit-section">
            <h3 className="homework-card-edit-section-title">일일 숙제</h3>
            <ul className="homework-raid-modal-list">
              {DAILY_ITEMS.map((item) => (
                <li
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  className={`homework-raid-modal-row ${pickedDaily.has(item.id) ? 'is-selected' : ''}`}
                  onClick={() => toggleDaily(item.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDaily(item.id); } }}
                  aria-pressed={pickedDaily.has(item.id)}
                >
                  <span className="homework-raid-modal-row-label">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="homework-card-edit-section">
            <h3 className="homework-card-edit-section-title">주간 숙제</h3>
            <ul className="homework-raid-modal-list">
              {WEEKLY_ITEMS.map((item) => (
                <li
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  className={`homework-raid-modal-row ${pickedWeekly.has(item.id) ? 'is-selected' : ''}`}
                  onClick={() => toggleWeekly(item.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleWeekly(item.id); } }}
                  aria-pressed={pickedWeekly.has(item.id)}
                >
                  <span className="homework-raid-modal-row-label">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
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

function makeDailyTaskHistory(seed, items, days = 168) {
  const history = []
  for (let dayIdx = 0; dayIdx < days; dayIdx += 1) {
    const done = []
    const miss = []
    items.forEach((item, itemIdx) => {
      const v = ((seed >> ((dayIdx + itemIdx) % 16)) + dayIdx * 19 + itemIdx * 31 + seed) % 100
      const isDone = v < 70
      if (isDone) done.push(item.label)
      else miss.push(item.label)
    })
    const ratio = items.length > 0 ? done.length / items.length : 0
    history.push({ done, miss, ratio })
  }
  return history
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

function makeWeeklyTaskHistory(seed, items, weeks = 24) {
  const history = []
  for (let weekIdx = 0; weekIdx < weeks; weekIdx += 1) {
    const done = []
    const miss = []
    items.forEach((item, itemIdx) => {
      const v = ((seed >> ((weekIdx + itemIdx) % 12)) + weekIdx * 17 + itemIdx * 29 + seed) % 100
      const isDone = v < 68
      if (isDone) done.push(item.label)
      else miss.push(item.label)
    })
    const ratio = items.length > 0 ? done.length / items.length : 0
    history.push({ done, miss, ratio })
  }
  return history
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
  const [hoveredRateType, setHoveredRateType] = useState(null)

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
  const dailyTaskSeries = chartData?.dailyTaskHistory?.slice(-days) ?? []
  const weeklyGoldSeries = chartData?.weeklyGoldHistory?.slice(-weeks) ?? []
  const weeklyBoundGoldSeries = chartData?.weeklyBoundGoldHistory?.slice(-weeks) ?? []
  const weeklyRateSeries = chartData?.weeklyRateHistory?.slice(-weeks) ?? []
  const weeklyTaskSeries = chartData?.weeklyTaskHistory?.slice(-weeks) ?? []
  const raidRateSeries = chartData?.raidRateHistory?.slice(-weeks) ?? []
  const raidTaskSeries = chartData?.raidTaskHistory?.slice(-weeks) ?? []
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

  const doneDays = dailyDoneSeries.reduce((acc, v) => acc + (v >= 1 ? 1 : 0), 0)
  const halfDays = dailyDoneSeries.reduce((acc, v) => acc + (v > 0 && v < 1 ? 1 : 0), 0)
  const activeGold = weeklyGoldSeries.length ? weeklyGoldSeries[activeIndex] : 0
  const activeBoundGold = weeklyBoundGoldSeries.length ? weeklyBoundGoldSeries[activeIndex] : 0
  const activeWeekly = weeklyRateSeries.length ? weeklyRateSeries[activeIndex] : 0
  const activeRaid = raidRateSeries.length ? raidRateSeries[activeIndex] : 0
  const activeGoldLeftPct = weeks > 1 ? (activeIndex / (weeks - 1)) * 100 : 0
  const goldOverlayEdgeClass = activeGoldLeftPct <= 16 ? 'is-left' : activeGoldLeftPct >= 84 ? 'is-right' : ''
  const hoveredDayIdx = activeDayIndex == null ? dailyDoneSeries.length - 1 : activeDayIndex
  const hoveredDayOffset = hoveredDayIdx >= 0 ? days - 1 - hoveredDayIdx : 0
  const hoveredDayDate = useMemo(() => {
    const d = new Date(now)
    d.setDate(d.getDate() - hoveredDayOffset)
    return d
  }, [hoveredDayOffset, now])
  const hoveredDayRatio = hoveredDayIdx >= 0 ? Number(dailyDoneSeries[hoveredDayIdx] ?? 0) : 0
  const hoveredDayDone = hoveredDayRatio >= 1
  const hoveredDayPartial = hoveredDayRatio > 0 && hoveredDayRatio < 1
  const hoveredDayTasks = hoveredDayIdx >= 0 ? (dailyTaskSeries[hoveredDayIdx] ?? { done: [], miss: [] }) : { done: [], miss: [] }
  const activeWeeklyTasks = weeklyTaskSeries[activeIndex] ?? { done: [], miss: [] }
  const activeRaidTasks = raidTaskSeries[activeIndex] ?? { done: [], miss: [] }
  const dailyStatusText = useMemo(() => {
    if (hoveredDayDone) return '완료'
    const miss = hoveredDayTasks.miss
    if (miss.length >= 2) return '미완료'
    if (miss.length === 1) return `${miss[0]} 미완료`
    return '미완료'
  }, [hoveredDayDone, hoveredDayTasks])

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
  const commonGoldMax = Math.max(1, ...weeklyGoldSeries, ...weeklyBoundGoldSeries)
  const goldLineCoords = buildLineCoords(weeklyGoldSeries, goldLineWidth, goldLineHeight, 0, commonGoldMax)
  const goldLinePath = buildSmoothPath(goldLineCoords)
  const goldAreaPath = goldLineCoords.length
    ? `${goldLinePath} L ${goldLineCoords[goldLineCoords.length - 1].x} ${goldLineHeight} L 0 ${goldLineHeight} Z`
    : ''

  const boundLineCoords = buildLineCoords(weeklyBoundGoldSeries, goldLineWidth, goldLineHeight, 0, commonGoldMax)
  const boundLinePath = buildSmoothPath(boundLineCoords)

  const activeGoldPoint = goldLineCoords[activeIndex]
  const activeBoundGoldPoint = boundLineCoords[activeIndex]

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
                      <span>{doneDays}/{days}일 완료 · 반완 {halfDays}일</span>
                    </div>
                    <div className="homework-card-graph-hover-readout">
                      <span>{formatDate(hoveredDayDate)}</span>
                      <strong>{dailyStatusText}</strong>
                    </div>
                    <div className="homework-card-daily-strip">
                      {dailyDoneSeries.map((done, idx) => (
                        <span
                          key={idx}
                          className={`homework-card-daily-cell ${done >= 1 ? 'is-done' : done > 0 ? 'is-half' : 'is-miss'}`}
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
                        <div className="homework-card-weekly-gold-head-values">
                          <strong>{activeGold.toLocaleString()} G</strong>
                          <strong className="is-bound">{activeBoundGold.toLocaleString()} 귀속골</strong>
                        </div>
                      </div>
                      <div className="homework-card-weekly-gold-line-wrap" onMouseEnter={() => setIsGoldChartHover(true)} onMouseLeave={() => setIsGoldChartHover(false)}>
                        <div className="homework-card-weekly-gold-plot">
                          <svg className="homework-card-weekly-gold-line" viewBox={`0 0 ${goldLineWidth} ${goldLineHeight}`} preserveAspectRatio="none">
                            <line className="homework-card-weekly-gold-guide" x1="0" y1={goldLineHeight * 0.2} x2={goldLineWidth} y2={goldLineHeight * 0.2} />
                            <line className="homework-card-weekly-gold-guide" x1="0" y1={goldLineHeight * 0.5} x2={goldLineWidth} y2={goldLineHeight * 0.5} />
                            <line className="homework-card-weekly-gold-guide" x1="0" y1={goldLineHeight * 0.8} x2={goldLineWidth} y2={goldLineHeight * 0.8} />
                            <path className="homework-card-weekly-gold-area" d={goldAreaPath} />
                            <path className="homework-card-weekly-gold-path" d={goldLinePath} />
                            {boundLinePath ? <path className="homework-card-weekly-gold-bound-path" d={boundLinePath} /> : null}
                          </svg>
                          <div className="homework-card-weekly-gold-hitzones">
                            {weeklyGoldSeries.map((value, idx) => {
                              const weekOffset = weeks - 1 - idx
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  className={`homework-card-weekly-gold-hit ${activeWeekOffset === weekOffset ? 'is-active' : ''}`}
                                  aria-label={`${getWeekRangeLabel(weekOffset)} 골드 ${value.toLocaleString()} G / 귀속골 ${(weeklyBoundGoldSeries[idx] ?? 0).toLocaleString()}`}
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
                          {activeBoundGoldPoint ? (
                            <div
                              className="homework-card-weekly-gold-bound-cursor"
                              style={{
                                left: `${(activeBoundGoldPoint.x / goldLineWidth) * 100}%`,
                                top: `${(activeBoundGoldPoint.y / goldLineHeight) * 100}%`,
                              }}
                            />
                          ) : null}
                          {isGoldChartHover ? (
                          <div className={`homework-card-weekly-gold-overlay ${goldOverlayEdgeClass}`} style={{ left: `${activeGoldLeftPct}%` }}>
                              <span>{getWeekRangeLabel(activeWeekOffset)}</span>
                              <div className="homework-card-weekly-gold-overlay-values">
                                <div className="homework-card-weekly-gold-overlay-row">
                                  <span>골드</span>
                                  <strong>{activeGold.toLocaleString()} G</strong>
                                </div>
                                <div className="homework-card-weekly-gold-overlay-row">
                                  <span>귀속골</span>
                                  <strong className="is-bound">{activeBoundGold.toLocaleString()}</strong>
                                </div>
                              </div>
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
                              title={`${getWeekRangeLabel(weekOffset)}: 골드 ${value.toLocaleString()} G / 귀속골 ${(weeklyBoundGoldSeries[idx] ?? 0).toLocaleString()}`}
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
                                onMouseEnter={() => { setActiveWeekOffset(weekOffset); setHoveredRateType('weekly') }}
                                onMouseLeave={() => setHoveredRateType(null)}
                              />
                            )
                          })}
                        </div>
                        {hoveredRateType === 'weekly' && (
                          <div className="homework-card-weekly-inline-readout">
                            <span>완료: {activeWeeklyTasks.done.length ? activeWeeklyTasks.done.join(', ') : '-'}</span>
                            <span>미완료: {activeWeeklyTasks.miss.length ? activeWeeklyTasks.miss.join(', ') : '-'}</span>
                          </div>
                        )}
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
                                onMouseEnter={() => { setActiveWeekOffset(weekOffset); setHoveredRateType('raid') }}
                                onMouseLeave={() => setHoveredRateType(null)}
                              />
                            )
                          })}
                        </div>
                        {hoveredRateType === 'raid' && (
                          <div className="homework-card-weekly-inline-readout">
                            <span>완료: {activeRaidTasks.done.length ? activeRaidTasks.done.join(', ') : '-'}</span>
                            <span>미완료: {activeRaidTasks.miss.length ? activeRaidTasks.miss.join(', ') : '-'}</span>
                          </div>
                        )}
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
  const [dailySlots, setDailySlots] = useState(() =>
    loadExpeditionSlots(EXPEDITION_DAILY_SLOTS_KEY_PREFIX, expId, DAILY_ITEMS.map((x) => x.id))
  )
  const [weeklySlots, setWeeklySlots] = useState(() =>
    loadExpeditionSlots(EXPEDITION_WEEKLY_SLOTS_KEY_PREFIX, expId, WEEKLY_ITEMS.map((x) => x.id))
  )
  const [editModalOpen, setEditModalOpen] = useState(false)

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

  const dailyDone = dailySlots.filter((id) => dailyChecked.has(id)).length
  const weeklyDone = weeklySlots.filter((id) => weeklyChecked.has(id)).length
  const dailyRatio = dailySlots.length ? dailyDone / dailySlots.length : 1
  const weeklyRatio = weeklySlots.length ? weeklyDone / weeklySlots.length : 1
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
    persistDaily(new Set(dailySlots))
    persistWeekly(new Set(weeklySlots))
    // 사용자가 "전체 체크" 버튼으로 100%를 만들 때는 완료 오버레이를 항상 다시 보여준다.
    if (onComplete) {
      prevAllCompleteRef.current = true
      onComplete(expId, wrapRef.current)
    }
  }

  return (
    <div ref={wrapRef} data-char-key={`exp-${expId}`} className={`homework-char-card-wrap homework-expedition-card-wrap ${isAnimatingComplete ? 'is-complete-animating' : ''}`}>
      <Card className={`homework-char-card homework-expedition-card ${dailyWeekly100 ? 'is-all-complete' : ''}`}>
          <div className={isAnimatingComplete ? 'homework-char-card-dimmed' : ''}>
          {isCompact ? (
            <div className="homework-char-row-compact">
              <div className="homework-char-row-compact-top">
                <div className="homework-char-compact-left">
                <span className="homework-expedition-icon" aria-hidden>원정대</span>
                <div className="homework-char-name-wrap">
                  <span className="homework-char-title">원정대</span>
                  {expeditionLevelValue != null && <span className="homework-char-level">{`원정대 Lv.${expeditionLevelValue}`}</span>}
                </div>
              </div>
                <div className="homework-char-compact-actions">
                <div className="homework-char-compact-progress" aria-hidden title={`일일 ${dailyDone}/${dailySlots.length} · 주간 ${weeklyDone}/${weeklySlots.length}`}>
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
                      <div className={`homework-progress-ring homework-progress-ring-dailyweekly ${dailyWeekly100 ? 'is-complete' : ''}`}>
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
                <button
                  type="button"
                  className="homework-btn-icon homework-btn-edit"
                  onClick={() => setEditModalOpen(true)}
                  title="편집"
                  aria-label="편집"
                >
                  <IconEdit />
                </button>
                {onRemove && (
                  <button type="button" className="homework-btn-icon homework-btn-remove" onClick={() => onRemove(expId)} title="삭제" aria-label="삭제">
                    <IconTrash />
                  </button>
                )}
              </div>
              </div>
              <div className="homework-char-row-compact-bottom">
                <div className="homework-char-compact-buttons" aria-label="원정대 숙제 체크">
                  {dailySlots
                    .map((id) => DAILY_ITEMS.find((x) => x.id === id))
                    .filter(Boolean)
                    .map((item) => (
                      <button
                        key={`exp-d-${item.id}`}
                        type="button"
                        className={`homework-btn-chip homework-chip-daily ${dailyChecked.has(item.id) ? 'is-checked' : ''}`}
                        onClick={() => toggleDaily(item.id)}
                        aria-pressed={dailyChecked.has(item.id)}
                        aria-label={`일일 ${item.label}`}
                      >
                        {compactTaskLabel(item.label, 'daily')}
                      </button>
                    ))}
                  {weeklySlots
                    .map((id) => WEEKLY_ITEMS.find((x) => x.id === id))
                    .filter(Boolean)
                    .map((item) => (
                      <button
                        key={`exp-w-${item.id}`}
                        type="button"
                        className={`homework-btn-chip homework-chip-weekly ${weeklyChecked.has(item.id) ? 'is-checked' : ''}`}
                        onClick={() => toggleWeekly(item.id)}
                        aria-pressed={weeklyChecked.has(item.id)}
                        aria-label={`주간 ${item.label}`}
                      >
                        {compactTaskLabel(item.label, 'weekly')}
                      </button>
                    ))}
                </div>
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
                <button
                  type="button"
                  className="homework-btn-icon homework-btn-edit"
                  onClick={() => setEditModalOpen(true)}
                  title="편집"
                  aria-label="편집"
                >
                  <IconEdit />
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
              </div>
              <div className="homework-btns">
                {dailySlots
                  .map((id) => DAILY_ITEMS.find((x) => x.id === id))
                  .filter(Boolean)
                  .map((item) => (
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
              </div>
              <div className="homework-btns">
                {weeklySlots
                  .map((id) => WEEKLY_ITEMS.find((x) => x.id === id))
                  .filter(Boolean)
                  .map((item) => (
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
      {editModalOpen && typeof document !== 'undefined' && createPortal(
        <ExpeditionEditModal
          dailyChecked={dailySlots}
          weeklyChecked={weeklySlots}
          onSave={(nextDaily, nextWeekly) => {
            const dailyIds = DAILY_ITEMS.filter((x) => nextDaily.has(x.id)).map((x) => x.id)
            const weeklyIds = WEEKLY_ITEMS.filter((x) => nextWeekly.has(x.id)).map((x) => x.id)
            setDailySlots(dailyIds)
            setWeeklySlots(weeklyIds)
            saveExpeditionSlots(EXPEDITION_DAILY_SLOTS_KEY_PREFIX, expId, dailyIds)
            saveExpeditionSlots(EXPEDITION_WEEKLY_SLOTS_KEY_PREFIX, expId, weeklyIds)
            setEditModalOpen(false)
          }}
          onClose={() => setEditModalOpen(false)}
        />,
        document.body
      )}
    </div>
  )
}

function CharacterHomeworkCard({ character, today, weekKey, onRemove, onComplete, onIncomplete, onDismissComplete, isAnimatingComplete, variant = 'detailed', onOpenGraph, onShowToast }) {
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
  const [weeklySlots, setWeeklySlots] = useState(() => loadWeeklySlots(charKey))
  const [raidModes, setRaidModes] = useState(() => loadRaidModes(charKey, weekKey))
  const [raidChecked, setRaidChecked] = useState(() => loadChecked(storageKeyRaidChecked(charKey), storageKeyRaidCheckedMeta(charKey), weekKey) ?? new Set())
  const [raidBusFees, setRaidBusFees] = useState(() => loadRaidBusFees(charKey, weekKey))
  const [raidBusRoles, setRaidBusRoles] = useState(() => loadRaidBusRoles(charKey, weekKey))
  const [raidSlots, setRaidSlots] = useState(() => loadRaidSlots(charKey, itemLevel))
  const [editModalOpen, setEditModalOpen] = useState(false)
  const raidItemById = useMemo(() => new Map(RAID_ITEMS.map((it) => [it.id, it])), [])
  const didSanitizeBusTagRef = useRef(false)

  useEffect(() => {
    const loaded = loadChecked(storageKeyDaily(charKey), storageKeyDailyMeta(charKey), today)
    setDailyChecked(loaded ?? new Set())
  }, [charKey, today])
  useEffect(() => {
    const loaded = loadChecked(storageKeyWeekly(charKey), storageKeyWeeklyMeta(charKey), weekKey)
    setWeeklyChecked(loaded ?? new Set())
  }, [charKey, weekKey])
  useEffect(() => {
    setWeeklySlots(loadWeeklySlots(charKey))
  }, [charKey])
  useEffect(() => {
    const loaded = loadRaidModes(charKey, weekKey)
    const alias = { 'behemoth-normal': 'behemoth-n' }
    const next = {}
    for (const [id, mode] of Object.entries(loaded ?? {})) next[alias[id] ?? id] = mode
    setRaidModes(next)
  }, [charKey, weekKey])
  useEffect(() => {
    const loaded = loadChecked(storageKeyRaidChecked(charKey), storageKeyRaidCheckedMeta(charKey), weekKey)
    const alias = { 'behemoth-normal': 'behemoth-n' }
    const mapped = loaded
      ? new Set(Array.from(loaded).map((id) => alias[id] ?? id))
      : new Set()
    setRaidChecked(mapped)
  }, [charKey, weekKey])
  useEffect(() => {
    const loaded = loadRaidBusFees(charKey, weekKey)
    const alias = { 'behemoth-normal': 'behemoth-n' }
    const next = {}
    for (const [id, v] of Object.entries(loaded ?? {})) next[alias[id] ?? id] = v
    setRaidBusFees(next)
  }, [charKey, weekKey])
  // (이전 버전에서) "버스 태그"가 강제로 켜지던 케이스를 완화:
  // 세르카처럼 싱글/버스 모두 가능한 레이드는, 버스비가 비어있으면 UI에서는 싱글로 취급.
  useEffect(() => {
    if (didSanitizeBusTagRef.current) return
    const next = { ...raidModes }
    let changed = false
    for (const [id, mode] of Object.entries(next)) {
      const meta = raidItemById.get(id)
      if (!meta) continue
      if (mode === 'bus' && meta.difficulty !== 'single') {
        const fee = raidBusFees[id]
        if (fee == null || fee === '') {
          next[id] = 'single'
          changed = true
        }
      }
    }
    if (changed) {
      setRaidModes(next)
      saveRaidModes(charKey, weekKey, next)
    }
    didSanitizeBusTagRef.current = true
  }, [raidBusFees])
  useEffect(() => {
    didSanitizeBusTagRef.current = false
  }, [charKey, weekKey])
  useEffect(() => {
    const loaded = loadRaidBusRoles(charKey, weekKey)
    const alias = { 'behemoth-normal': 'behemoth-n' }
    const next = {}
    for (const [id, v] of Object.entries(loaded ?? {})) next[alias[id] ?? id] = v
    setRaidBusRoles(next)
  }, [charKey, weekKey])
  useEffect(() => {
    const loaded = loadRaidSlots(charKey, itemLevel)
    const byGroup = new Map()
    for (const id of loaded) {
      const meta = raidItemById.get(id)
      const groupKey = meta?.groupKey ?? meta?.id ?? id
      byGroup.set(groupKey, id)
    }
    setRaidSlots([...byGroup.values()])
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
  const busAutoCheckTimersRef = useRef({})
  const showCardToast = useCallback((message) => {
    onShowToast?.(message)
  }, [onShowToast])
  const triggerBusFeeAttention = useCallback((raidId) => {
    setBusFeeAttentionId(raidId)
    setTimeout(() => setBusFeeAttentionId((prev) => (prev === raidId ? null : prev)), 420)
  }, [])
  const clearBusAutoCheckTimer = useCallback((raidId) => {
    const timers = busAutoCheckTimersRef.current
    if (timers[raidId] != null) {
      clearTimeout(timers[raidId])
      delete timers[raidId]
    }
  }, [])
  const scheduleBusAutoCheck = useCallback((raidId, rawValue) => {
    clearBusAutoCheckTimer(raidId)
    const digits = String(rawValue ?? '').replace(/[^\d]/g, '')
    const timers = busAutoCheckTimersRef.current
    timers[raidId] = setTimeout(() => {
      delete timers[raidId]
      if (digits === '') {
        persistRaidChecked(new Set([...raidChecked].filter((x) => x !== raidId)))
        return
      }
      const n = Number(digits)
      const isValid = Number.isFinite(n) && n >= 0
      if (isValid) {
        persistRaidChecked(new Set([...raidChecked, raidId]))
        setBusFeeAttentionId((prev) => (prev === raidId ? null : prev))
      }
    }, 2000)
  }, [clearBusAutoCheckTimer, persistRaidChecked, raidChecked])
  const getDefaultRaidMode = (raidId) => {
    return 'single'
  }
  const isCompact = variant === 'compact'
  const hasValidBusFee = (id) => {
    const v = raidBusFees[id]
    if (v == null || v === '') return false
    const n = Number(String(v).replace(/,/g, '').trim())
    return Number.isFinite(n)
  }
  const toggleRaid = (id) => {
    const isAlreadyChecked = raidChecked.has(id)
    const effectiveMode = raidModes[id] ?? getDefaultRaidMode(id)
    if (isAlreadyChecked) {
      persistRaidChecked(new Set([...raidChecked].filter((x) => x !== id)))
      return
    }
    if (effectiveMode === 'bus' && !hasValidBusFee(id)) {
      // compact(간략)에서는 버스비 입력 UI가 없어서 체크 자체가 불가능해짐.
      // detailed(자세히)에서는 기존처럼 입력 유도(빨간 강조)를 유지한다.
      if (isCompact) {
        persistRaidChecked(new Set([...raidChecked, id]))
        return
      }
      triggerBusFeeAttention(id)
      showCardToast('버스비를 입력해 주세요.')
      return
    }
    persistRaidChecked(new Set([...raidChecked, id]))
  }

  const toggleDaily = (id) =>
    persistDaily(dailyChecked.has(id) ? new Set([...dailyChecked].filter((x) => x !== id)) : new Set([...dailyChecked, id]))
  const toggleWeekly = (id) =>
    persistWeekly(weeklyChecked.has(id) ? new Set([...weeklyChecked].filter((x) => x !== id)) : new Set([...weeklyChecked, id]))

  const dailyRatio = DAILY_ITEMS.length ? dailyChecked.size / DAILY_ITEMS.length : 0
  const weeklyDone = weeklySlots.filter((id) => weeklyChecked.has(id)).length
  const weeklyRatio = weeklySlots.length ? weeklyDone / weeklySlots.length : 1
  const raidDone = raidSlots.filter((id) => {
    const effectiveMode = raidModes[id] ?? getDefaultRaidMode(id)
    return raidChecked.has(id)
  }).length
  const raidRatio = raidSlots.length ? raidDone / raidSlots.length : 1
  const dailyWeekly100 = dailyRatio >= 1 && weeklyRatio >= 1
  const raid100 = raidRatio >= 1
  const allComplete = dailyWeekly100 && raid100

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
    persistWeekly(new Set(weeklySlots))
    persistRaidChecked(new Set(raidSlots))
    // 사용자가 상단 "모든 숙제 100%" 버튼을 누르면 완료 오버레이를 재표시한다.
    if (onComplete) {
      prevAllCompleteRef.current = true
      onComplete(character, wrapRef.current)
    }
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
          <div className="homework-char-row-compact-top">
          <div className="homework-char-compact-left">
            <ClassIcon className={className} size={24} />
            <div className="homework-char-name-wrap">
              <span className="homework-char-title">{name}</span>
              <span className="homework-char-level">{itemLevel != null ? itemLevel : '-'}</span>
            </div>
          </div>
          <div className="homework-char-compact-actions">
            <div className="homework-char-compact-progress" aria-hidden title={`일일 ${dailyChecked.size}/${DAILY_ITEMS.length} · 주간 ${weeklyDone}/${weeklySlots.length} · 레이드 ${raidDone}/${raidSlots.length}`}>
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
                    <div className={`homework-progress-ring homework-progress-ring-dailyweekly ${dailyWeekly100 ? 'is-complete' : ''}`}>
                      <svg viewBox="0 0 36 36">
                        <circle className="homework-progress-ring-bg" cx={cx} cy={cy} r={r} />
                        <circle className="homework-progress-fill homework-progress-fill-daily" cx={cx} cy={cy} r={r} fill="none" strokeWidth={ringStroke} strokeDasharray={`${dailyDash} ${circumference - dailyDash}`} strokeDashoffset={-halfCirc} transform={`rotate(-90 ${cx} ${cy})`} />
                        <circle className="homework-progress-fill homework-progress-fill-weekly" cx={cx} cy={cy} r={r} fill="none" strokeWidth={ringStroke} strokeDasharray={`${weeklyDash} ${circumference - weeklyDash}`} strokeDashoffset={0} transform={`rotate(-90 ${cx} ${cy})`} />
                        <circle className="homework-progress-ring-edge homework-progress-edge-daily" cx={cx} cy={cy} r={r} fill="none" strokeWidth={2} strokeDasharray={`${halfCirc} ${circumference}`} strokeDashoffset={-halfCirc} transform={`rotate(-90 ${cx} ${cy})`} />
                        <circle className="homework-progress-ring-edge homework-progress-edge-weekly" cx={cx} cy={cy} r={r} fill="none" strokeWidth={2} strokeDasharray={`${halfCirc} ${circumference}`} strokeDashoffset={0} transform={`rotate(-90 ${cx} ${cy})`} />
                      </svg>
                    </div>
                    <div className={`homework-progress-ring homework-progress-ring-raid ${raid100 ? 'is-complete' : ''}`}>
                      <svg viewBox="0 0 36 36">
                        <circle className="homework-progress-ring-bg" cx={cx} cy={cy} r={r} />
                        <circle className="homework-progress-fill homework-progress-fill-raid" cx={cx} cy={cy} r={r} fill="none" strokeWidth={ringStroke} strokeDasharray={`${raidDash} ${circumference - raidDash}`} strokeDashoffset={0} transform={`rotate(-90 ${cx} ${cy})`} />
                      </svg>
                    </div>
                  </>
                )
              })()}
            </div>
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
            <button
              type="button"
              className="homework-btn-icon homework-btn-edit"
              onClick={() => setEditModalOpen(true)}
              title="편집"
              aria-label="편집"
            >
              <IconEdit />
            </button>
            {onRemove && (
              <button type="button" className="homework-btn-icon homework-btn-remove" onClick={() => onRemove(character)} title="삭제" aria-label="삭제">
                <IconTrash />
              </button>
            )}
          </div>
          </div>
          <div className="homework-char-row-compact-bottom">
            <div className="homework-char-compact-buttons" aria-label="숙제 체크">
              {DAILY_ITEMS.map((item) => (
                <button
                  key={`d-${item.id}`}
                  type="button"
                  className={`homework-btn-chip homework-chip-daily ${dailyChecked.has(item.id) ? 'is-checked' : ''}`}
                  onClick={() => toggleDaily(item.id)}
                  aria-pressed={dailyChecked.has(item.id)}
                  aria-label={`일일 ${item.label}`}
                >
                  {compactTaskLabel(item.label, 'daily')}
                </button>
              ))}
              {weeklySlots
                .map((id) => WEEKLY_ITEMS.find((x) => x.id === id))
                .filter(Boolean)
                .map((item) => (
                  <button
                    key={`w-${item.id}`}
                    type="button"
                    className={`homework-btn-chip homework-chip-weekly ${weeklyChecked.has(item.id) ? 'is-checked' : ''}`}
                    onClick={() => toggleWeekly(item.id)}
                    aria-pressed={weeklyChecked.has(item.id)}
                    aria-label={`주간 ${item.label}`}
                  >
                    {compactTaskLabel(item.label, 'weekly')}
                  </button>
                ))}
              {raidSlots
                .map((id) => RAID_ITEMS.find((r) => r.id === id))
                .filter(Boolean)
                .map((item) => {
                  const defaultMode = 'single'
                  const effectiveMode = raidModes[item.id] ?? defaultMode
                  const isChecked = raidChecked.has(item.id)
                  const difficultyCompact =
                    item.difficulty === 'single'
                      ? '싱글'
                      : item.difficulty === 'stage1'
                        ? '1단'
                        : item.difficulty === 'stage2'
                          ? '2단'
                          : item.difficulty === 'stage3'
                            ? '3단'
                            : item.difficulty === 'nightmare'
                              ? '나메'
                              : item.difficulty === 'hard'
                                ? '하드'
                                : '노말'
                  const busSuffix = effectiveMode === 'bus' ? ' 버스' : ''
                  const chipText = `${compactTaskLabel(item.label, 'raid')} ${difficultyCompact}${busSuffix}`
                  return (
                    <button
                      key={`r-${item.id}`}
                      type="button"
                      className={`homework-btn-chip homework-chip-raid ${isChecked ? 'is-checked' : ''}`}
                      onClick={() => toggleRaid(item.id)}
                      aria-pressed={isChecked}
                      aria-label={`레이드 ${item.label}`}
                    >
                      {chipText}
                    </button>
                  )
                })}
            </div>
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
            <button
              type="button"
              className="homework-btn-icon homework-btn-edit"
              onClick={() => setEditModalOpen(true)}
              title="편집"
              aria-label="편집"
            >
              <IconEdit />
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
          </div>
          <div className="homework-btns">
            {weeklySlots
              .map((id) => WEEKLY_ITEMS.find((x) => x.id === id))
              .filter(Boolean)
              .map((item) => (
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
          </div>
          <ul className="homework-list homework-raid-list">
            {raidSlots.length === 0 ? null : (
              raidSlots
                .map((id) => RAID_ITEMS.find((r) => r.id === id))
                .filter(Boolean)
                .map((item) => {
                  const defaultMode = 'single'
                  const effectiveMode = raidModes[item.id] ?? defaultMode
                  const difficultyLabel =
                    item.difficulty === 'single'
                      ? '싱글'
                      : item.difficulty === 'nightmare'
                        ? '나메'
                        : item.difficulty === 'hard'
                          ? '하드'
                          : '노말'
                  const reward = { gold: item.gold ?? 0, boundGold: item.boundGold ?? 0 }
                  const busFee = raidBusFees[item.id]
                  const busRole = raidBusRoles[item.id] ?? 'driver'
                  const isChecked = raidChecked.has(item.id)
                  return (
                    <li
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      className={`homework-raid-row homework-raid-row-display ${effectiveMode === 'bus' ? 'is-bus' : 'is-nonbus'} ${isChecked ? 'is-checked' : ''}`}
                      onClick={(e) => {
                        if (effectiveMode === 'bus' && !hasValidBusFee(item.id)) {
                          if (isCompact) {
                            toggleRaid(item.id)
                            return
                          }
                          triggerBusFeeAttention(item.id)
                          showCardToast('버스비를 입력해 주세요.')
                          const input = e.currentTarget.querySelector('.homework-raid-busfee-input')
                          if (input instanceof HTMLInputElement) input.focus()
                          return
                        }
                        toggleRaid(item.id)
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRaid(item.id); } }}
                      aria-pressed={isChecked}
                    >
                        {/* 1줄: 레이드 제목+입장레벨(왼쪽), 태그(오른쪽) */}
                        <div className="homework-raid-line homework-raid-line-head">
                          <div className="homework-raid-line-head-left">
                            <span className="homework-raid-title">{item.label}</span>
                          </div>
                        {(() => {
                          const diffKey =
                            item.difficulty === 'single'
                              ? 'single'
                              : item.difficulty === 'stage1'
                                ? 'normal'
                                : item.difficulty === 'stage2'
                                  ? 'hard'
                                  : item.difficulty === 'stage3'
                                    ? 'nightmare'
                                    : item.difficulty === 'nightmare'
                                      ? 'nightmare'
                                      : item.difficulty === 'hard'
                                        ? 'hard'
                                        : 'normal'
                          return (
                            <>
                              <span className={`homework-raid-badge homework-raid-badge-diff-${diffKey}`}>
                                {item.difficulty === 'stage1'
                                  ? '1단'
                                  : item.difficulty === 'stage2'
                                    ? '2단'
                                    : item.difficulty === 'stage3'
                                      ? '3단'
                                      : difficultyLabel}
                              </span>
                              {effectiveMode === 'bus' ? <span className="homework-raid-badge homework-raid-badge-bus">버스</span> : null}
                            </>
                          )
                        })()}
                        </div>
                        {/* 2줄: 골드/귀속 (버스면 골드에 버스비 반영, 귀속만 있어도 버스면 골드 0 ± 버스비 표시) */}
                      {reward && (reward.gold > 0 || reward.boundGold > 0 || effectiveMode === 'bus') && (
                          <div className="homework-raid-line homework-raid-line-gold">
                            {(reward.gold > 0 || effectiveMode === 'bus') && (
                              <span className="homework-raid-gold-item homework-gold">
                                <span className="homework-gold-label">골드 </span>
                                <span className="homework-gold-value">
                                  {(() => {
                                    let g = reward.gold ?? 0
                                    if (effectiveMode === 'bus' && busFee != null && Number.isFinite(Number(busFee))) {
                                      const fee = Number(busFee)
                                      const sign = busRole === 'driver' ? 1 : -1
                                      g += sign * fee
                                    }
                                    return g.toLocaleString()
                                  })()}
                                </span>
                              </span>
                            )}
                            {(reward.gold > 0 || effectiveMode === 'bus') && reward.boundGold > 0 && <span className="homework-raid-gold-sep">/</span>}
                            {reward.boundGold > 0 && (
                              <span className="homework-raid-gold-item homework-bound-gold">
                                <span className="homework-bound-gold-label">귀속 </span>
                                <span className="homework-bound-gold-value">{reward.boundGold.toLocaleString()}</span>
                              </span>
                            )}
                          </div>
                        )}
                      {effectiveMode === 'bus' && (
                        <div
                          className={`homework-raid-busfee-wrap ${busFeeAttentionId === item.id ? 'is-attention' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            const clickedInput = e.target instanceof HTMLElement && e.target.closest('.homework-raid-busfee-input')
                            if (clickedInput) return
                            if (!hasValidBusFee(item.id)) {
                              triggerBusFeeAttention(item.id)
                              showCardToast('버스비를 입력해 주세요.')
                            }
                            const input = e.currentTarget.querySelector('.homework-raid-busfee-input')
                            if (input instanceof HTMLInputElement) input.focus()
                          }}
                        >
                          <div className="homework-raid-busrow-inline">
                            <div
                              className={`homework-raid-busrole-switch ${busRole === 'passenger' ? 'is-passenger' : 'is-driver'}`}
                              role="button"
                              tabIndex={0}
                              aria-label="기사 승객 전환"
                              aria-pressed={busRole === 'passenger'}
                              onClick={(e) => {
                                e.stopPropagation()
                                setRaidBusRole(item.id, busRole === 'passenger' ? 'driver' : 'passenger')
                              }}
                              onKeyDown={(e) => {
                                if (e.key !== 'Enter' && e.key !== ' ') return
                                e.preventDefault()
                                e.stopPropagation()
                                setRaidBusRole(item.id, busRole === 'passenger' ? 'driver' : 'passenger')
                              }}
                            >
                              <span className="homework-raid-busrole-thumb" aria-hidden />
                              <span className="homework-raid-busrole-opt" aria-hidden>기사</span>
                              <span className="homework-raid-busrole-opt" aria-hidden>승객</span>
                            </div>
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
                                  scheduleBusAutoCheck(item.id, v)
                                }}
                                onBlur={(e) => {
                                  clearBusAutoCheckTimer(item.id)
                                  const raw = e.target.value.replace(/[^\d]/g, '')
                                  const n = raw === '' ? null : Number(raw)
                                  const isValid = n != null && Number.isFinite(n) && n >= 0
                                  if (isValid) {
                                    persistRaidChecked(new Set([...raidChecked, item.id]))
                                    setBusFeeAttentionId((prev) => (prev === item.id ? null : prev))
                                  } else {
                                    persistRaidChecked(new Set([...raidChecked].filter((x) => x !== item.id)))
                                    triggerBusFeeAttention(item.id)
                                    showCardToast('버스비를 입력해 주세요.')
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key !== 'Enter') return
                                  clearBusAutoCheckTimer(item.id)
                                  const raw = e.currentTarget.value.replace(/[^\d]/g, '')
                                  const n = raw === '' ? null : Number(raw)
                                  const isValid = n != null && Number.isFinite(n) && n >= 0
                                  if (isValid) {
                                    persistRaidChecked(new Set([...raidChecked, item.id]))
                                    setBusFeeAttentionId((prev) => (prev === item.id ? null : prev))
                                  } else {
                                    persistRaidChecked(new Set([...raidChecked].filter((x) => x !== item.id)))
                                    triggerBusFeeAttention(item.id)
                                    showCardToast('버스비를 입력해 주세요.')
                                  }
                                }}
                                placeholder="버스비 입력"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })
            )}
          </ul>
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
    {editModalOpen && typeof document !== 'undefined' && createPortal(
      <CharacterEditModal
        characterName={name}
        characterClassName={className}
        itemLevelValue={itemLevel}
        weeklyChecked={weeklySlots}
        raidSlots={raidSlots}
        raidModes={raidModes}
        onSave={(nextWeekly, raidIds, raidModesNext) => {
          const weeklyIds = WEEKLY_ITEMS.filter((x) => nextWeekly.has(x.id)).map((x) => x.id)
          setWeeklySlots(weeklyIds)
          saveWeeklySlots(charKey, weeklyIds)
          setRaidSlots(raidIds)
          saveRaidSlots(charKey, raidIds)
          setRaidModes(raidModesNext)
          saveRaidModes(charKey, weekKey, raidModesNext)
          setEditModalOpen(false)
        }}
        onClose={() => setEditModalOpen(false)}
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
  const [instantSelectedKeys, setInstantSelectedKeys] = useState(() => new Set())
  const [isRegisterClosing, setIsRegisterClosing] = useState(false)
  const [expeditionLevelHint, setExpeditionLevelHint] = useState(() => loadExpeditionLevelHint())
  const [viewMode, setViewMode] = useState(() => loadViewMode())
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [cardGraphFlippedKeys, setCardGraphFlippedKeys] = useState(() => new Set())
  const [graphBlockedShakeKey, setGraphBlockedShakeKey] = useState(0)
  const [useCustomOrder, setUseCustomOrder] = useState(() => loadUseCustomOrder())
  const [loginShakeTarget, setLoginShakeTarget] = useState('')
  const [panelToast, setPanelToast] = useState(null)
  const registerResetTimeoutRef = useRef(null)
  const panelToastTimerRef = useRef(null)
  const panelRef = useRef(null)
  const isCompactView = viewMode === 'compact'
  const showPanelToast = useCallback((message) => {
    const id = Date.now()
    setPanelToast({ id, message })
    if (panelToastTimerRef.current != null) clearTimeout(panelToastTimerRef.current)
    panelToastTimerRef.current = setTimeout(() => {
      setPanelToast((prev) => (prev?.id === id ? null : prev))
      panelToastTimerRef.current = null
    }, 1800)
  }, [])

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
    const alreadyRegistered = loadRegistered().some((c) => getCharKey(c) === key)
    if (alreadyRegistered) return
    const level = formatItemLevel(character?.ItemAvgLevel ?? character?.ItemMaxLevel)
    const initialRaidIds = getDefaultRaidIdsByLevel(level)
    // 신규 추가 시점에 레이드 슬롯을 즉시 초기화해, 추천 0개 캐릭터는 바로 레이드 100%로 표시되게 한다.
    saveRaidSlots(key, initialRaidIds)
    // 즉시 등록 (UI 반응성)
    setInstantSelectedKeys((prev) => new Set([...prev, key]))
    setRegistered((prev) => {
      const next = [...prev, { ...character }]
      saveRegistered(next)
      return next
    })
    setCardOrder((prev) => {
      if (prev.includes(key)) return prev
      const next = [...prev, key]
      saveCardOrder(next)
      return next
    })
    // 백그라운드에서 ExpeditionLevel 보강
    ;(async () => {
      const existing = Number(String(character?.ExpeditionLevel ?? '').replace(/[^\d.]/g, ''))
      if (Number.isFinite(existing) && existing > 0) {
        setExpeditionLevelHint((prev) => {
          const next = Math.max(prev ?? 0, Math.floor(existing))
          saveExpeditionLevelHint(next)
          return next
        })
        return
      }
      try {
        const armory = await fetchCharacterArmory(character.CharacterName)
        const rawLevel = armory?.ArmoryProfile?.ExpeditionLevel ?? armory?.ExpeditionLevel
        const nextLevel = Number(String(rawLevel ?? '').replace(/[^\d.]/g, ''))
        if (!Number.isFinite(nextLevel) || nextLevel <= 0) return
        setExpeditionLevelHint((prev) => {
          const next = Math.max(prev ?? 0, Math.floor(nextLevel))
          saveExpeditionLevelHint(next)
          return next
        })
        setRegistered((prev) => {
          const next = prev.map((c) =>
            getCharKey(c) === key ? { ...c, ExpeditionLevel: nextLevel } : c
          )
          saveRegistered(next)
          return next
        })
      } catch {
        // 무시
      }
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
    const label = target === 'friend' ? '깐부' : target === 'party' ? '파티' : '공대'
    showPanelToast(`${label} 기능은 준비 중이에요.`)
    setTimeout(() => {
      setLoginShakeTarget((prev) => (prev === target ? '' : prev))
    }, 220)
  }, [showPanelToast])

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
      if (searchRequestIdRef.current !== requestId) return
      const raw = Array.isArray(data) ? data : []
      const list = raw
        .filter((c) => c != null && typeof c === 'object' && !Array.isArray(c))
        .map((c) => ({
          ...c,
          CharacterName: normalizeText(c.CharacterName, '(알 수 없음)'),
          ServerName: normalizeText(c.ServerName, '알 수 없음'),
          CharacterClassName: normalizeText(c.CharacterClassName, ''),
        }))
      setRegisterLoading(false)
      if (list.length === 0) {
        setRegisterError('검색 결과가 없습니다.')
        return
      }
      const hintFromList = list
        .map((c) => Number(String(c?.ExpeditionLevel ?? '').replace(/[^\d.]/g, '')))
        .filter((v) => Number.isFinite(v) && v > 0)
      if (hintFromList.length > 0) {
        const nextHint = Math.max(...hintFromList.map((v) => Math.floor(v)))
        setExpeditionLevelHint((prev) => {
          const next = Math.max(prev ?? 0, nextHint)
          saveExpeditionLevelHint(next)
          return next
        })
      }
      setSearchResults(list)
      // 첫 번째 결과에서만 ExpeditionLevel 보강 (연결 한도 초과 방지)
      const first = list[0]
      const firstExpLevel = Number(String(first?.ExpeditionLevel ?? '').replace(/[^\d.]/g, ''))
      if (!Number.isFinite(firstExpLevel) || firstExpLevel <= 0) {
        ;(async () => {
          try {
            const armory = await fetchCharacterArmory(first.CharacterName)
            if (searchRequestIdRef.current !== requestId) return
            const fromArmory = armory?.ArmoryProfile?.ExpeditionLevel ?? armory?.ExpeditionLevel
            const parsed = Number(String(fromArmory ?? '').replace(/[^\d.]/g, ''))
            if (!Number.isFinite(parsed) || parsed <= 0) return
            setExpeditionLevelHint((prev) => {
              const next = Math.max(prev ?? 0, Math.floor(parsed))
              saveExpeditionLevelHint(next)
              return next
            })
            setSearchResults((prev) =>
              prev.map((c) =>
                getCharKey(c) === getCharKey(first) ? { ...c, ExpeditionLevel: parsed } : c
              )
            )
          } catch {
            // 무시
          }
        })()
      }
    } catch (e) {
      if (searchRequestIdRef.current !== requestId) return
      setRegisterLoading(false)
      setRegisterError(e instanceof Error ? e.message : '검색에 실패했습니다.')
      setSearchResults([])
    }
  }

  const toggleRemoteRegisterForm = useCallback(() => {
    if (registerResetTimeoutRef.current != null) {
      clearTimeout(registerResetTimeoutRef.current)
      registerResetTimeoutRef.current = null
    }
    setShowRegisterForm((prev) => {
      if (prev) {
        setIsRegisterClosing(true)
        registerResetTimeoutRef.current = setTimeout(() => {
          setRegisterInput('')
          setSearchResults([])
          setRegisterError('')
          setRegisterLoading(false)
          setInstantSelectedKeys(new Set())
          setIsRegisterClosing(false)
          registerResetTimeoutRef.current = null
        }, 340)
        return false
      }
      setIsRegisterClosing(false)
      return true
    })
  }, [])

  const enforceNoInnerScroll = useCallback(() => {
    if (typeof document === 'undefined') return
    const tabsContent = document.querySelector('.ui-tabs-content-homework')
    const targets = [
      document.querySelector('.app-shell'),
      tabsContent,
      tabsContent?.parentElement,
      panelRef.current,
      panelRef.current?.querySelector('.homework-layout'),
      panelRef.current?.querySelector('.homework-main'),
      panelRef.current?.querySelector('.homework-by-server'),
      panelRef.current?.querySelector('.homework-char-grid'),
      panelRef.current?.querySelector('.homework-char-grid-masonry'),
    ].filter(Boolean)
    targets.forEach((node) => {
      if (!(node instanceof HTMLElement)) return
      node.style.setProperty('overflow', 'visible', 'important')
      node.style.setProperty('overflow-y', 'visible', 'important')
      node.style.setProperty('max-height', 'none', 'important')
      node.style.setProperty('height', 'auto', 'important')
    })
  }, [])

  useLayoutEffect(() => {
    enforceNoInnerScroll()
    if (typeof ResizeObserver === 'undefined' || !panelRef.current) return
    const ro = new ResizeObserver(() => enforceNoInnerScroll())
    ro.observe(panelRef.current)
    return () => ro.disconnect()
  }, [enforceNoInnerScroll])

  const keysRegistered = useMemo(() => new Set(registered.map(getCharKey)), [registered])

  useEffect(() => {
    setInstantSelectedKeys((prev) => {
      const next = new Set([...prev].filter((key) => keysRegistered.has(key)))
      if (next.size === prev.size) return prev
      return next
    })
  }, [keysRegistered])

  const groupedSearchResults = useMemo(() => {
    const serverMap = new Map()
    searchResults.forEach((char) => {
      if (!char || typeof char !== 'object') return
      const server = normalizeText(char?.ServerName, '알 수 없음')
      if (!serverMap.has(server)) serverMap.set(server, [])
      serverMap.get(server).push(char)
    })
    // 각 서버 내 아이템레벨 내림차순 정렬
    serverMap.forEach((chars) => {
      chars.sort((a, b) => {
        const la = formatSearchItemLevel(a?.ItemAvgLevel ?? a?.ItemMaxLevel) ?? 0
        const lb = formatSearchItemLevel(b?.ItemAvgLevel ?? b?.ItemMaxLevel) ?? 0
        return lb - la
      })
    })
    // 서버 순서: 해당 서버의 최고 아이템레벨 기준 내림차순
    const entries = Array.from(serverMap.entries()).sort((a, b) => {
      const maxA = Math.max(...a[1].map((c) => formatSearchItemLevel(c?.ItemAvgLevel ?? c?.ItemMaxLevel) ?? 0))
      const maxB = Math.max(...b[1].map((c) => formatSearchItemLevel(c?.ItemAvgLevel ?? c?.ItemMaxLevel) ?? 0))
      return maxB - maxA
    })
    return entries
  }, [searchResults])

  useEffect(() => {
    return () => {
      if (registerResetTimeoutRef.current != null) {
        clearTimeout(registerResetTimeoutRef.current)
      }
    }
  }, [])

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
    const expWeeklyBoundGoldHistory = new Array(24).fill(0)
    let expDailyTaskHistory = null
    let expWeeklyTaskHistory = null
    let expRaidTaskHistory = null
    for (const item of displayOrder) {
      if (item.type === 'character' && item.character) {
        const c = item.character
        const key = getCharKey(c)
        const h = mockHash(key)
        const gold = 5000 + (h % 15000)
        const dailyRate = 60 + (h % 41)
        const weeklyRate = 50 + ((h >> 4) % 51)
        const raidRate = 40 + ((h >> 8) % 61)
        const dailyTaskHistory = makeDailyTaskHistory(h, DAILY_ITEMS, 168)
        const weeklyTaskHistory = makeWeeklyTaskHistory(h + 7, WEEKLY_ITEMS, 24)
        const selectedRaidItems = loadRaidSlots(key, c?.ItemAvgLevel ?? c?.ItemMaxLevel)
          .map((id) => RAID_ITEMS.find((r) => r.id === id))
          .filter(Boolean)
        const raidTaskHistory = makeWeeklyTaskHistory(h + 13, selectedRaidItems, 24)
        const dailyDoneHistory = dailyTaskHistory.map((d) => d.ratio)
        const weeklyRateHistory = weeklyTaskHistory.map((w) => Math.round(w.ratio * 100))
        const raidRateHistory = raidTaskHistory.map((r) => Math.round(r.ratio * 100))
        const weeklyGoldHistory = makeWeeklyGoldHistory(h + 29, 24)
        const weeklyBoundGoldHistory = weeklyGoldHistory.map((v, i) => {
          // mock 값이지만, 귀속골(바운드)을 따로 보여주기 위해 거래가능골드 일부를 귀속골로 분리
          const ratio = 0.14 + (((h + i) % 9) * 0.01) // 0.14 ~ 0.22
          const bound = Math.round(v * ratio)
          return Math.max(0, Math.min(v, bound))
        })
        byKey[key] = {
          name: c?.CharacterName ?? '알 수 없음',
          gold,
          dailyRate,
          weeklyRate,
          raidRate,
          dailyDoneHistory,
          dailyTaskHistory,
          weeklyRateHistory,
          weeklyTaskHistory,
          raidRateHistory,
          raidTaskHistory,
          weeklyGoldHistory,
          weeklyBoundGoldHistory,
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
          expWeeklyBoundGoldHistory[i] += weeklyBoundGoldHistory[i]
        }
        if (!expDailyTaskHistory) expDailyTaskHistory = dailyTaskHistory
        if (!expWeeklyTaskHistory) expWeeklyTaskHistory = weeklyTaskHistory
        if (!expRaidTaskHistory) expRaidTaskHistory = raidTaskHistory
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
        dailyDoneHistory: expCount > 0 ? expDailyDoneHistory.map((v) => Number((v / expCount).toFixed(2))) : new Array(168).fill(0),
        dailyTaskHistory: expDailyTaskHistory ?? new Array(168).fill({ done: [], miss: [] }),
        weeklyRateHistory: expCount > 0 ? expWeeklyRateHistory.map((v) => Math.round(v / expCount)) : new Array(24).fill(0),
        weeklyTaskHistory: expWeeklyTaskHistory ?? new Array(24).fill({ done: [], miss: [] }),
        raidRateHistory: expCount > 0 ? expRaidRateHistory.map((v) => Math.round(v / expCount)) : new Array(24).fill(0),
        raidTaskHistory: expRaidTaskHistory ?? new Array(24).fill({ done: [], miss: [] }),
        weeklyGoldHistory: expWeeklyGoldHistory,
        weeklyBoundGoldHistory: expWeeklyBoundGoldHistory,
      }
    }
    return byKey
  }, [displayOrder, getCharKey])

  const expeditionLevelValue = useMemo(() => {
    const levels = registered
      .map((c) => Number(String(c?.ExpeditionLevel ?? '').replace(/[^\d.]/g, '')))
      .filter((v) => Number.isFinite(v) && v > 0)
    const maxRegistered = levels.length > 0 ? Math.max(...levels.map((v) => Math.floor(v))) : null
    const hint = expeditionLevelHint != null ? Math.floor(expeditionLevelHint) : null
    if (maxRegistered == null && hint == null) return null
    return Math.max(maxRegistered ?? 0, hint ?? 0)
  }, [registered, expeditionLevelHint])

  useEffect(() => {
    if (expeditionLevelValue == null) return
    saveExpeditionLevelHint(expeditionLevelValue)
  }, [expeditionLevelValue])

  return (
    <section ref={panelRef} className={`view-panel homework-panel homework-panel-${viewMode}`}>
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
                        onShowToast={showPanelToast}
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
                  className={`homework-toolbar-btn homework-toolbar-btn-register homework-toolbar-btn-register-trigger ${(showRegisterForm || isRegisterClosing) ? 'is-open' : ''}`}
                  onClick={toggleRemoteRegisterForm}
                  title="캐릭터 등록"
                >
                  {(showRegisterForm || isRegisterClosing) ? <IconMinus /> : <IconPlus />}
                  <span className={`homework-register-trigger-label ${(showRegisterForm || isRegisterClosing) ? 'is-hidden' : ''}`}>캐릭터</span>
                </button>
                <div className={`homework-remote-register ${showRegisterForm ? 'is-open' : ''} ${isRegisterClosing ? 'is-closing' : ''}`}>
                  <div className="homework-remote-register-body">
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
                    {groupedSearchResults.length > 0 && (
                      <div className="homework-remote-search-results">
                        {groupedSearchResults.map(([serverName, chars]) => (
                          <div key={serverName} className="homework-remote-search-server-group">
                            <div className="homework-remote-search-server-head">{serverName}</div>
                            <ul className="homework-remote-search-server-list">
                              {chars.map((char, idx) => {
                                if (!char || typeof char !== 'object') return null
                                const safeChar = {
                                  ...char,
                                  CharacterName: normalizeText(char.CharacterName, '(알 수 없음)'),
                                  ServerName: normalizeText(char.ServerName, '알 수 없음'),
                                  CharacterClassName: normalizeText(char.CharacterClassName, ''),
                                }
                                const key = getCharKey(safeChar)
                                const isAdded = keysRegistered.has(key) || instantSelectedKeys.has(key)
                                const level = formatSearchItemLevel(safeChar?.ItemAvgLevel ?? safeChar?.ItemMaxLevel)
                                return (
                                  <li
                                    key={`${key}-${idx}`}
                                    className={`homework-remote-search-item ${isAdded ? 'is-added' : ''}`}
                                    style={{ '--result-index': idx }}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => {
                                      if (isAdded) {
                                        removeRegistered(safeChar)
                                        setInstantSelectedKeys((prev) => {
                                          const next = new Set(prev)
                                          next.delete(key)
                                          return next
                                        })
                                      } else {
                                        addRegistered(safeChar)
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        if (isAdded) {
                                          removeRegistered(safeChar)
                                          setInstantSelectedKeys((prev) => {
                                            const next = new Set(prev)
                                            next.delete(key)
                                            return next
                                          })
                                        } else {
                                          addRegistered(safeChar)
                                        }
                                      }
                                    }}
                                    aria-pressed={isAdded}
                                  >
                                    <div className="homework-class-icon-wrap">
                                      <ClassIcon className={safeChar?.CharacterClassName} size={22} />
                                    </div>
                                    <div className="homework-remote-search-text">
                                      <span className="homework-remote-search-name">{safeChar.CharacterName}</span>
                                      {isAdded ? (
                                        <span className="homework-remote-search-check" aria-hidden><IconCheck /></span>
                                      ) : (
                                        <span className="homework-remote-search-level">{level != null ? level : '-'}</span>
                                      )}
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        ))}
                       </div>
                     )}
                  </div>
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
                    showPanelToast('요약 모드에서는 그래프를 열 수 없어요.')
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="9" cy="9" r="2" />
                  <circle cx="15" cy="9" r="2" />
                  <path d="M4.5 20c0-3 2.5-5.5 5.5-5.5S15.5 17 15.5 20" />
                  <path d="M8.5 20c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" />
                </svg>
                깐부
              </button>
              <button
                type="button"
                className={`homework-toolbar-btn homework-toolbar-btn-extra homework-toolbar-btn-login-required ${loginShakeTarget === 'party' ? 'is-shake' : ''}`}
                onClick={() => handleLoginRequiredClick('party')}
                title="파티"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="7.5" cy="8" r="2" />
                  <circle cx="16.5" cy="8" r="2" />
                  <circle cx="7.5" cy="15" r="2" />
                  <circle cx="16.5" cy="15" r="2" />

                  <path d="M4.7 20.8c.7-2.6 2.7-4.3 5.3-4.3s4.6 1.7 5.3 4.3" />
                  <path d="M12.7 20.8c.7-2.6 2.7-4.3 5.3-4.3s4.6 1.7 5.3 4.3" />
                  <path d="M4.7 22.5c.7-2.2 2.7-3.7 5.3-3.7s4.6 1.5 5.3 3.7" />
                  <path d="M12.7 22.5c.7-2.2 2.7-3.7 5.3-3.7s4.6 1.5 5.3 3.7" />
                </svg>
                파티
              </button>
              <button
                type="button"
                className={`homework-toolbar-btn homework-toolbar-btn-extra homework-toolbar-btn-login-required ${loginShakeTarget === 'raid' ? 'is-shake' : ''}`}
                onClick={() => handleLoginRequiredClick('raid')}
                title="공대"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="6" cy="8" r="2" />
                  <circle cx="10" cy="8" r="2" />
                  <circle cx="14" cy="8" r="2" />
                  <circle cx="18" cy="8" r="2" />
                  <circle cx="6" cy="14" r="2" />
                  <circle cx="10" cy="14" r="2" />
                  <circle cx="14" cy="14" r="2" />
                  <circle cx="18" cy="14" r="2" />
                  <path d="M4 20h16" />
                </svg>
                공대
              </button>
              <button
                type="button"
                className={`homework-mode-switch ${viewMode === 'compact' ? 'is-detailed' : 'is-compact'}`}
                onClick={() => setViewModeAndSave(viewMode === 'compact' ? 'detailed' : 'compact')}
                aria-label={`보기 방식 전환: 현재 ${viewMode === 'compact' ? '요약' : '상세'}`}
              >
                <span className="homework-mode-switch-label is-left">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.2-4.2" />
                  </svg>
                  상세
                </span>
                <span className="homework-mode-switch-label is-right">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="4.8" cy="6.2" r="1" />
                    <circle cx="4.8" cy="12" r="1" />
                    <circle cx="4.8" cy="17.8" r="1" />
                    <path d="M8 6.2h13" />
                    <path d="M8 12h13" />
                    <path d="M8 17.8h13" />
                  </svg>
                  요약
                </span>
                <span className="homework-mode-switch-thumb" aria-hidden />
              </button>
            </CardContent>
          </Card>
        </aside>
      </div>
      {panelToast ? <div className="homework-modal-toast homework-global-toast">{panelToast.message}</div> : null}

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
