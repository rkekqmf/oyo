import { CharacterCard } from './CharacterCard'

export function CharacterResult({
  error,
  result,
  onSelectCharacter,
  isFavorite,
  onToggleFavorite,
}) {
  if (error) {
    return <p className="result-error">{error}</p>
  }

  if (!result) {
    return <p className="result-empty">캐릭터명을 입력하고 조회를 시작해보세요.</p>
  }

  const characters = Array.isArray(result) ? result : [result]

  return (
    <section className="result-section">
      <p className="result-count">조회 결과 {characters.length}명</p>
      <div className="character-grid">
        {characters.map((character) => (
          <CharacterCard
            key={`${character.CharacterName}-${character.ServerName}`}
            character={character}
            onClick={() => onSelectCharacter?.(character)}
            favorite={isFavorite?.(character)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </section>
  )
}
