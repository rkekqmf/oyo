import { useState } from 'react'
import './App.css'
import { CharacterDetailModal } from './components/CharacterDetailModal'
import { FavoriteCharacters } from './components/FavoriteCharacters'
import { CharacterResult } from './components/CharacterResult'
import { CharacterSearchForm } from './components/CharacterSearchForm'
import { RecentSearches } from './components/RecentSearches'
import { useCharacterSearch } from './hooks/useCharacterSearch'
import { useFavorites } from './hooks/useFavorites'
import { fetchCharacterArmory } from './services/lostarkApi'

function App() {
  const {
    name,
    setName,
    result,
    loading,
    error,
    search,
    recentSearches,
    clearRecentSearches,
  } = useCharacterSearch()
  const { favorites, isFavorite, toggleFavorite } = useFavorites()
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  const handleSelectCharacter = async (character) => {
    const targetName = character?.CharacterName
    if (!targetName) return

    setSelectedCharacter(character)
    setDetailLoading(true)
    setDetailError('')
    setDetailData(null)

    try {
      const data = await fetchCharacterArmory(targetName)
      setDetailData(data)
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : '상세 조회 중 오류가 발생했습니다.')
    } finally {
      setDetailLoading(false)
    }
  }

  const closeModal = () => {
    setSelectedCharacter(null)
    setDetailData(null)
    setDetailError('')
    setDetailLoading(false)
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>oyo - Lost Ark Info</h1>
        <p>로스트아크 캐릭터 정보를 빠르게 조회해보세요.</p>
      </header>
      <CharacterSearchForm
        name={name}
        onNameChange={setName}
        onSearch={search}
        loading={loading}
      />
      <RecentSearches
        items={recentSearches}
        onSelect={(targetName) => {
          setName(targetName)
          search(targetName)
        }}
        onClear={clearRecentSearches}
      />
      <FavoriteCharacters
        favorites={favorites}
        onSelectCharacter={handleSelectCharacter}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
      />
      <CharacterResult
        error={error}
        result={result}
        onSelectCharacter={handleSelectCharacter}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
      />
      <CharacterDetailModal
        open={Boolean(selectedCharacter)}
        character={selectedCharacter}
        detail={detailData}
        loading={detailLoading}
        error={detailError}
        onClose={closeModal}
      />
    </main>
  )
}

export default App