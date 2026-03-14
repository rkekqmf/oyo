import { CharacterCard } from './CharacterCard'
import { Badge } from './ui/badge'

function toItemLevel(value) {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return 0
  const parsed = Number.parseFloat(value.replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export function CharacterResult({
  error,
  result,
  loading,
  combatInsightsByKey,
  onSelectCharacter,
  isFavorite,
  onToggleFavorite,
}) {
  if (error) {
    return <p className="result-error">{error}</p>
  }

  if (!result) {
    return <p className="result-empty">원정대 정보는 검색 후 부가 정보로 표시됩니다.</p>
  }

  const characters = Array.isArray(result) ? result : [result]
  const groupedByServer = characters.reduce((acc, character) => {
    const serverName = String(character?.ServerName || '기타')
    if (!acc[serverName]) acc[serverName] = []
    acc[serverName].push(character)
    return acc
  }, {})

  const serverNames = Object.keys(groupedByServer).sort((a, b) =>
    a.localeCompare(b, 'ko')
  )

  return (
    <section className="result-section">
      <p className="result-count">
        원정대 캐릭터 {characters.length}명
        {loading ? (
          <Badge variant="info" className="result-refreshing">
            업데이트 중...
          </Badge>
        ) : null}
      </p>
      {serverNames.map((serverName) => {
        const sortedCharacters = groupedByServer[serverName]
          .slice()
          .sort((a, b) => {
            const keyA = `${a?.CharacterName}:${a?.ServerName}`
            const keyB = `${b?.CharacterName}:${b?.ServerName}`
            const scoreA = combatInsightsByKey?.[keyA]?.score ?? 0
            const scoreB = combatInsightsByKey?.[keyB]?.score ?? 0
            const scoreDiff = scoreB - scoreA
            if (scoreDiff !== 0) return scoreDiff
            const levelDiff = toItemLevel(b?.ItemAvgLevel) - toItemLevel(a?.ItemAvgLevel)
            if (levelDiff !== 0) return levelDiff
            return String(a?.CharacterName || '').localeCompare(
              String(b?.CharacterName || ''),
              'ko'
            )
          })

        return (
          <section key={serverName} className="server-group">
            <div className="server-group-header">
              <h3>{serverName}</h3>
              <span>{sortedCharacters.length}명</span>
            </div>
            <div className={loading ? 'character-grid is-loading' : 'character-grid'}>
              {sortedCharacters.map((character) => (
                <CharacterCard
                  key={`${character.CharacterName}-${character.ServerName}`}
                  character={character}
                  insight={
                    combatInsightsByKey?.[
                      `${character.CharacterName}:${character.ServerName}`
                    ]
                  }
                  onClick={() => onSelectCharacter?.(character)}
                  favorite={isFavorite?.(character)}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          </section>
        )
      })}
    </section>
  )
}
