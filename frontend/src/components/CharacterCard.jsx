import { Button } from './ui/button'

export function CharacterCard({
  character,
  insight,
  onClick,
  favorite,
  onToggleFavorite,
}) {
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
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={favorite ? 'favorite-button is-active' : 'favorite-button'}
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite(character)
              }}
              aria-label={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            >
              {favorite ? '★' : '☆'}
            </Button>
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
      <section className="combat-insight">
        <p className="combat-insight-title">점수</p>
        {insight ? (
          <>
            <p className="combat-insight-score">
              {insight.score.toLocaleString()} <span>{insight.grade}등급</span>
            </p>
            <p className="combat-insight-sub">실투력 추정 · API 기반 환산</p>
            <p className="combat-insight-line">
              아크 패시브: {insight.arkPassive.summary}
            </p>
            <p className="combat-insight-line">
              아크 그리드: {insight.arkGrid.summary} ({insight.arkGrid.tier})
            </p>
          </>
        ) : (
          <p className="combat-insight-loading">검색한 캐릭터만 점수 표시</p>
        )}
      </section>
    </article>
  )
}
