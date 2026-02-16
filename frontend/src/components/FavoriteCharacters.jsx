import { CharacterCard } from './CharacterCard'

export function FavoriteCharacters({
  favorites,
  onSelectCharacter,
  isFavorite,
  onToggleFavorite,
}) {
  if (!favorites.length) {
    return null
  }

  return (
    <section className="favorite-section">
      <p className="favorite-title">즐겨찾기</p>
      <div className="character-grid">
        {favorites.map((character) => (
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
