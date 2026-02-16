export function CharacterCard({ character, onClick, favorite, onToggleFavorite }) {
  return (
    <article
      className={onClick ? 'character-card is-clickable' : 'character-card'}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <header className="character-card-header">
        <div className="character-card-title-row">
          <h3>{character.CharacterName || '이름 없음'}</h3>
          {onToggleFavorite ? (
            <button
              type="button"
              className={favorite ? 'favorite-button is-active' : 'favorite-button'}
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite(character)
              }}
              aria-label={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            >
              {favorite ? '★' : '☆'}
            </button>
          ) : null}
        </div>
        <span>{character.CharacterClassName || '-'}</span>
      </header>

      <dl className="character-meta">
        <div>
          <dt>서버</dt>
          <dd>{character.ServerName || '-'}</dd>
        </div>
        <div>
          <dt>아이템 레벨</dt>
          <dd>{character.ItemAvgLevel || '-'}</dd>
        </div>
        <div>
          <dt>최대 아이템 레벨</dt>
          <dd>{character.ItemMaxLevel || '-'}</dd>
        </div>
      </dl>
    </article>
  )
}
