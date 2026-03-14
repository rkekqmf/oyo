import { useCallback, useEffect, useMemo, useState } from 'react'
import { DAILY_ITEMS, WEEKLY_ITEMS, RAID_ITEMS } from '../data/homeworkChecklist'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { fetchCharacterSiblings } from '../services/lostarkApi'
import { getClassShortLabel, getClassIconSrc } from '../utils/classIcon'

const REGISTERED_KEY = 'oyo_homework_registered'

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
)
const IconArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
)
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
)
const IconReset = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 12a9 9 0 119 9 9 9 0 01-9-9" /><path d="M3 3v9h9" /></svg>
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

function CharacterHomeworkCard({ character, today, weekKey, onRemove }) {
  const charKey = getCharKey(character)
  const name = character?.CharacterName ?? '알 수 없음'
  const className = character?.CharacterClassName ?? ''
  const itemLevel = formatItemLevel(character?.ItemAvgLevel ?? character?.ItemMaxLevel)

  const [dailyChecked, setDailyChecked] = useState(() =>
    loadChecked(storageKeyDaily(charKey), storageKeyDailyMeta(charKey), today) ?? new Set()
  )
  const [weeklyChecked, setWeeklyChecked] = useState(() =>
    loadChecked(storageKeyWeekly(charKey), storageKeyWeeklyMeta(charKey), weekKey) ?? new Set()
  )
  const [raidChecked, setRaidChecked] = useState(() =>
    loadChecked(storageKeyRaid(charKey), storageKeyRaidMeta(charKey), weekKey) ?? new Set()
  )

  useEffect(() => {
    const loaded = loadChecked(storageKeyDaily(charKey), storageKeyDailyMeta(charKey), today)
    setDailyChecked(loaded ?? new Set())
  }, [charKey, today])
  useEffect(() => {
    const loaded = loadChecked(storageKeyWeekly(charKey), storageKeyWeeklyMeta(charKey), weekKey)
    setWeeklyChecked(loaded ?? new Set())
  }, [charKey, weekKey])
  useEffect(() => {
    const loaded = loadChecked(storageKeyRaid(charKey), storageKeyRaidMeta(charKey), weekKey)
    setRaidChecked(loaded ?? new Set())
  }, [charKey, weekKey])

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
      setRaidChecked(next)
      saveChecked(storageKeyRaid(charKey), storageKeyRaidMeta(charKey), weekKey, next)
    },
    [charKey, weekKey]
  )

  const toggleDaily = (id) =>
    persistDaily(dailyChecked.has(id) ? new Set([...dailyChecked].filter((x) => x !== id)) : new Set([...dailyChecked, id]))
  const toggleWeekly = (id) =>
    persistWeekly(weeklyChecked.has(id) ? new Set([...weeklyChecked].filter((x) => x !== id)) : new Set([...weeklyChecked, id]))
  const toggleRaid = (id) =>
    persistRaid(raidChecked.has(id) ? new Set([...raidChecked].filter((x) => x !== id)) : new Set([...raidChecked, id]))

  return (
    <Card className="homework-char-card">
      <CardHeader className="homework-char-header">
        <div className="homework-char-info">
          <ClassIcon className={className} size={36} />
          <div className="homework-char-name-wrap">
            <CardTitle className="homework-char-title">{name}</CardTitle>
            <span className="homework-char-level">{itemLevel != null ? itemLevel : '-'}</span>
          </div>
        </div>
        {onRemove && (
          <button type="button" className="homework-btn-icon homework-btn-remove" onClick={() => onRemove(character)} title="삭제" aria-label="삭제">
            <IconTrash />
          </button>
        )}
      </CardHeader>
      <CardContent className="homework-char-content">
        <div className="homework-char-section">
          <div className="homework-char-section-head">
            <CardDescription>일일 숙제</CardDescription>
            <button type="button" className="homework-btn-icon homework-btn-reset" onClick={() => persistDaily(new Set())} title="초기화" aria-label="초기화">
              <IconReset />
            </button>
          </div>
          <ul className="homework-list">
            {DAILY_ITEMS.map((item) => (
              <li key={item.id} className="homework-item">
                <button type="button" className={`homework-toggle ${dailyChecked.has(item.id) ? 'is-checked' : ''}`} onClick={() => toggleDaily(item.id)} aria-pressed={dailyChecked.has(item.id)} aria-label={item.label}>
                  {dailyChecked.has(item.id) && <IconCheck />}
                </button>
                <span className="homework-item-label">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="homework-char-section">
          <div className="homework-char-section-head">
            <CardDescription>주간 숙제</CardDescription>
            <button type="button" className="homework-btn-icon homework-btn-reset" onClick={() => persistWeekly(new Set())} title="초기화" aria-label="초기화">
              <IconReset />
            </button>
          </div>
          <ul className="homework-list">
            {WEEKLY_ITEMS.map((item) => (
              <li key={item.id} className="homework-item">
                <button type="button" className={`homework-toggle ${weeklyChecked.has(item.id) ? 'is-checked' : ''}`} onClick={() => toggleWeekly(item.id)} aria-pressed={weeklyChecked.has(item.id)} aria-label={item.label}>
                  {weeklyChecked.has(item.id) && <IconCheck />}
                </button>
                <span className="homework-item-label">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="homework-char-section homework-raid-section">
          <div className="homework-char-section-head">
            <CardDescription>레이드</CardDescription>
            <button type="button" className="homework-btn-icon homework-btn-reset" onClick={() => persistRaid(new Set())} title="초기화" aria-label="초기화">
              <IconReset />
            </button>
          </div>
          <ul className="homework-list">
            {RAID_ITEMS.map((item) => (
              <li key={item.id} className="homework-item">
                <button type="button" className={`homework-toggle ${raidChecked.has(item.id) ? 'is-checked' : ''}`} onClick={() => toggleRaid(item.id)} aria-pressed={raidChecked.has(item.id)} aria-label={item.label}>
                  {raidChecked.has(item.id) && <IconCheck />}
                </button>
                <span className="homework-item-label">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

export function HomeworkPanel() {
  const today = getTodayDateString()
  const weekKey = getWeekKey()

  const [registered, setRegistered] = useState(loadRegistered)
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [registerInput, setRegisterInput] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerError, setRegisterError] = useState('')

  const hasRegistered = registered.length > 0
  const showForm = showRegisterForm || !hasRegistered

  const addRegistered = useCallback((character) => {
    if (!character?.CharacterName || !character?.ServerName) return
    const key = getCharKey(character)
    setRegistered((prev) => {
      if (prev.some((c) => getCharKey(c) === key)) return prev
      const next = [...prev, { ...character }]
      saveRegistered(next)
      return next
    })
  }, [])

  const removeRegistered = useCallback((character) => {
    setRegistered((prev) => {
      const next = prev.filter((c) => getCharKey(c) !== getCharKey(character))
      saveRegistered(next)
      return next
    })
  }, [])

  const handleSearch = async () => {
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
    } catch (e) {
      setRegisterError(e instanceof Error ? e.message : '검색에 실패했습니다.')
      setSearchResults([])
    } finally {
      setRegisterLoading(false)
    }
  }

  const keysRegistered = useMemo(() => new Set(registered.map(getCharKey)), [registered])

  const byServer = useMemo(() => {
    const map = new Map()
    for (const char of registered) {
      const server = char?.ServerName ?? ''
      if (!map.has(server)) map.set(server, [])
      map.get(server).push(char)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => String(a?.CharacterName ?? '').localeCompare(b?.CharacterName ?? ''))
    }
    const servers = [...map.keys()].sort((a, b) => a.localeCompare(b))
    return servers.map((server) => ({ server, chars: map.get(server) }))
  }, [registered])

  return (
    <section className="view-panel homework-panel">
      {showForm && (
        <Card className="homework-register-card">
          <CardHeader className="homework-register-header">
            <CardTitle className="homework-register-title">캐릭터 등록</CardTitle>
            <CardDescription>캐릭터 이름으로 검색한 뒤 등록하면 숙제를 체크할 수 있습니다.</CardDescription>
            {hasRegistered && (
              <button type="button" className="homework-btn-icon homework-register-back" onClick={() => setShowRegisterForm(false)} title="목록으로" aria-label="목록으로">
                <IconArrowLeft />
              </button>
            )}
          </CardHeader>
          <CardContent className="homework-register-content">
            <div className="homework-register-row">
              <Input
                placeholder="캐릭터 이름"
                value={registerInput}
                onChange={(e) => setRegisterInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="homework-register-input"
              />
              <Button onClick={handleSearch} disabled={registerLoading}>
                {registerLoading ? '검색 중…' : '검색'}
              </Button>
            </div>
            {registerError && <p className="homework-register-error">{registerError}</p>}
            {searchResults.length > 0 && (
              <ul className="homework-search-results homework-search-results-compact">
                {searchResults.map((char) => {
                  const key = getCharKey(char)
                  const isAdded = keysRegistered.has(key)
                  const level = formatItemLevel(char?.ItemAvgLevel ?? char?.ItemMaxLevel)
                  return (
                    <li key={key} className="homework-search-item-compact">
                      <ClassIcon className={char?.CharacterClassName} size={24} />
                      <span className="homework-search-nick">{char.CharacterName}</span>
                      <span className="homework-search-level">{level != null ? level : '-'}</span>
                      <button type="button" className={`homework-btn-icon homework-btn-add ${isAdded ? 'is-added' : ''}`} disabled={isAdded} onClick={() => addRegistered(char)} title={isAdded ? '등록됨' : '등록'} aria-label={isAdded ? '등록됨' : '등록'}>
                        {isAdded ? <IconCheck /> : <IconPlus />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {registered.length === 0 ? (
        showForm ? null : (
          <Card className="homework-empty-card">
            <CardContent>
              <p className="homework-empty-text">등록된 캐릭터가 없습니다. 위에서 캐릭터를 검색해 등록해 주세요.</p>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="homework-by-server">
          {!showForm && (
            <div className="homework-toolbar">
              <button type="button" className="homework-btn-icon homework-btn-add-register" onClick={() => setShowRegisterForm(true)} title="추가 등록" aria-label="추가 등록">
                <IconPlus />
              </button>
            </div>
          )}
          {byServer.map(({ server, chars }) => (
            <div key={server || 'no-server'} className="homework-server-group">
              <h3 className="homework-server-heading">{server || '서버 미지정'}</h3>
              <div className="homework-char-grid">
                {chars.map((char) => (
                  <CharacterHomeworkCard
                    key={getCharKey(char)}
                    character={char}
                    today={today}
                    weekKey={weekKey}
                    onRemove={removeRegistered}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
