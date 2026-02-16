import { useEffect, useState } from 'react'
import { fetchCharacterSiblings } from '../services/lostarkApi'

const RECENT_SEARCHES_KEY = 'oyo-recent-searches'
const RECENT_SEARCHES_LIMIT = 7

export function useCharacterSearch() {
  const [name, setName] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recentSearches, setRecentSearches] = useState([])

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

  const search = async (rawName) => {
    const trimmedName = rawName.trim()
    if (!trimmedName || loading) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const data = await fetchCharacterSiblings(trimmedName)
      setResult(data)
      addRecentSearch(trimmedName)
      setName(trimmedName)
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const clearRecentSearches = () => {
    saveRecentSearches([])
  }

  return {
    name,
    setName,
    result,
    loading,
    error,
    search,
    recentSearches,
    clearRecentSearches,
  }
}
