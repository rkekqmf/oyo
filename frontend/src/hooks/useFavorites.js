import { useEffect, useMemo, useState } from 'react'

const FAVORITES_KEY = 'oyo-favorite-characters'

function toFavoriteKey(character) {
  return `${character?.CharacterName || ''}:${character?.ServerName || ''}`
}

export function useFavorites() {
  const [favorites, setFavorites] = useState([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setFavorites(parsed)
      }
    } catch {
      setFavorites([])
    }
  }, [])

  const saveFavorites = (nextFavorites) => {
    setFavorites(nextFavorites)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(nextFavorites))
  }

  const favoriteKeySet = useMemo(
    () => new Set(favorites.map((item) => toFavoriteKey(item))),
    [favorites]
  )

  const isFavorite = (character) => favoriteKeySet.has(toFavoriteKey(character))

  const toggleFavorite = (character) => {
    const key = toFavoriteKey(character)
    if (!character?.CharacterName || !character?.ServerName) return

    if (favoriteKeySet.has(key)) {
      saveFavorites(favorites.filter((item) => toFavoriteKey(item) !== key))
      return
    }

    saveFavorites([character, ...favorites])
  }

  return {
    favorites,
    isFavorite,
    toggleFavorite,
  }
}
