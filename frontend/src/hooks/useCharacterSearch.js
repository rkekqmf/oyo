import { useEffect, useRef, useState } from 'react'
import {
  fetchCharacterArmory,
  fetchCharacterSiblings,
  fetchSasagePosts,
} from '../services/lostarkApi'
import { analyzeCombatPower } from '../utils/combatPower'

const RECENT_SEARCHES_KEY = 'oyo-recent-searches'
const RECENT_SEARCHES_LIMIT = 7

function toCharacterKey(character) {
  if (!character?.CharacterName || !character?.ServerName) return ''
  return `${character.CharacterName}:${character.ServerName}`
}

function pickMainCharacter(targetName, siblings, profile) {
  const normalizedTarget = String(targetName || '').trim().toLowerCase()
  const siblingList = Array.isArray(siblings) ? siblings : []
  const exactMatch = siblingList.find(
    (character) =>
      String(character?.CharacterName || '').trim().toLowerCase() === normalizedTarget
  )
  if (exactMatch) return exactMatch

  if (profile?.CharacterName && profile?.ServerName) {
    return {
      CharacterName: profile.CharacterName,
      ServerName: profile.ServerName,
      CharacterClassName: profile.CharacterClassName,
      ItemAvgLevel: profile.ItemAvgLevel,
      ItemMaxLevel: profile.ItemMaxLevel,
    }
  }

  return siblingList[0] || null
}

export function useCharacterSearch() {
  const [name, setName] = useState('')
  const [result, setResult] = useState(null)
  const [mainCharacter, setMainCharacter] = useState(null)
  const [mainDetail, setMainDetail] = useState(null)
  const [mainDetailLoading, setMainDetailLoading] = useState(false)
  const [mainDetailError, setMainDetailError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sasagePosts, setSasagePosts] = useState([])
  const [sasageLoading, setSasageLoading] = useState(false)
  const [sasageWarning, setSasageWarning] = useState('')
  const [combatInsightsByKey, setCombatInsightsByKey] = useState({})
  const [recentSearches, setRecentSearches] = useState([])
  const insightRequestIdRef = useRef(0)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.filter((v) => typeof v === 'string'))
      }
    } catch {
      setRecentSearches([])
    }
  }, [])

  const saveRecentSearches = (nextSearches) => {
    setRecentSearches(nextSearches)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextSearches))
  }

  const addRecentSearch = (targetName) => {
    const next = [
      targetName,
      ...recentSearches.filter(
        (item) => item.toLowerCase() !== targetName.toLowerCase()
      ),
    ].slice(0, RECENT_SEARCHES_LIMIT)

    saveRecentSearches(next)
  }

  const upsertCombatInsight = (character, armory) => {
    const key = toCharacterKey(character)
    if (!key || !armory) return
    const insight = analyzeCombatPower({ character, armory })
    setCombatInsightsByKey((prev) => ({ ...prev, [key]: insight }))
  }

  const search = async (rawName) => {
    const trimmedName = rawName.trim()
    if (!trimmedName || loading) return

    const requestId = ++insightRequestIdRef.current
    setLoading(true)
    setMainDetailLoading(true)
    setSasageLoading(true)
    setError('')
    setMainDetailError('')
    setSasageWarning('')
    setMainCharacter(null)
    setMainDetail(null)
    setResult(null)
    setCombatInsightsByKey({})

    try {
      const [siblingsRes, sasageRes, armoryRes] = await Promise.allSettled([
        fetchCharacterSiblings(trimmedName),
        fetchSasagePosts(trimmedName),
        fetchCharacterArmory(trimmedName),
      ])

      const siblingsData =
        siblingsRes.status === 'fulfilled' && Array.isArray(siblingsRes.value)
          ? siblingsRes.value
          : []

      if (siblingsRes.status === 'fulfilled') {
        setResult(siblingsData)
      } else {
        setResult([])
        setError(
          siblingsRes.reason instanceof Error
            ? siblingsRes.reason.message
            : '원정대 정보를 불러오지 못했습니다.'
        )
      }

      if (armoryRes.status === 'fulfilled') {
        const detail = armoryRes.value
        const targetCharacter = pickMainCharacter(
          trimmedName,
          siblingsData,
          detail?.profile
        )
        setMainCharacter(targetCharacter)
        setMainDetail(detail)
        if (targetCharacter) {
          upsertCombatInsight(targetCharacter, detail)
        }
      } else {
        setMainDetailError(
          armoryRes.reason instanceof Error
            ? armoryRes.reason.message
            : '검색한 캐릭터 상세 정보를 불러오지 못했습니다.'
        )
        const fallbackCharacter = pickMainCharacter(trimmedName, siblingsData, null)
        setMainCharacter(fallbackCharacter)
      }

      addRecentSearch(trimmedName)
      setName(trimmedName)

      if (sasageRes.status === 'fulfilled') {
        setSasagePosts(sasageRes.value.posts)
        setSasageWarning(sasageRes.value.warning || '')
      } else {
        setSasagePosts([])
        setSasageWarning('사사게 검색 중 오류가 발생했습니다.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.')
      setResult(null)
      setSasagePosts([])
      setMainCharacter(null)
      setMainDetail(null)
      setMainDetailError('')
      setCombatInsightsByKey({})
    } finally {
      setLoading(false)
      if (requestId === insightRequestIdRef.current) {
        setMainDetailLoading(false)
      }
      setSasageLoading(false)
    }
  }

  const clearRecentSearches = () => {
    saveRecentSearches([])
  }

  return {
    name,
    setName,
    result,
    mainCharacter,
    mainDetail,
    mainDetailLoading,
    mainDetailError,
    loading,
    error,
    sasagePosts,
    sasageLoading,
    sasageWarning,
    combatInsightsByKey,
    upsertCombatInsight,
    search,
    recentSearches,
    clearRecentSearches,
  }
}
