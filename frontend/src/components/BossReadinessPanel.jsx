import { useMemo, useState } from 'react'
import { BOSS_CHECKLIST } from '../data/bossChecklist'
import { fetchCharacterArmory } from '../services/lostarkApi'
import { evaluateBossReadiness } from '../utils/bossReadiness'

function toCharacterKey(character) {
  return `${character.CharacterName}:${character.ServerName}`
}

export function BossReadinessPanel({ characters }) {
  const [bossId, setBossId] = useState(BOSS_CHECKLIST[0]?.id || '')
  const [characterKey, setCharacterKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState(null)
  const [selectedBossName, setSelectedBossName] = useState('')
  const [selectedCharacterName, setSelectedCharacterName] = useState('')

  const characterOptions = useMemo(
    () => characters.map((character) => ({ key: toCharacterKey(character), character })),
    [characters]
  )

  const runCheck = async () => {
    const selectedBoss = BOSS_CHECKLIST.find((boss) => boss.id === bossId)
    const selectedCharacter = characterOptions.find(
      (option) => option.key === characterKey
    )?.character

    if (!selectedBoss || !selectedCharacter) {
      setError('보스와 캐릭터를 모두 선택해주세요.')
      return
    }

    setError('')
    setLoading(true)
    setReport(null)
    setSelectedBossName(`${selectedBoss.name} ${selectedBoss.difficulty}`)
    setSelectedCharacterName(selectedCharacter.CharacterName)

    try {
      const armory = await fetchCharacterArmory(selectedCharacter.CharacterName)
      const readiness = evaluateBossReadiness({
        character: selectedCharacter,
        armory,
        boss: selectedBoss,
      })
      setReport(readiness)
    } catch (e) {
      setError(e instanceof Error ? e.message : '준비도 계산 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="boss-check-section">
      <header className="boss-check-header">
        <h2>보스 준비도 체크</h2>
        <p>선택한 보스 기준으로 캐릭터 스펙을 자동 점검합니다.</p>
      </header>

      <div className="boss-check-controls">
        <label className="boss-check-field">
          <span>보스</span>
          <select value={bossId} onChange={(e) => setBossId(e.target.value)}>
            {BOSS_CHECKLIST.map((boss) => (
              <option key={boss.id} value={boss.id}>
                {boss.name} {boss.difficulty}
              </option>
            ))}
          </select>
        </label>

        <label className="boss-check-field">
          <span>캐릭터</span>
          <select
            value={characterKey}
            onChange={(e) => setCharacterKey(e.target.value)}
          >
            <option value="">캐릭터 선택</option>
            {characterOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.character.CharacterName} ({option.character.ServerName})
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="boss-check-button"
          onClick={runCheck}
          disabled={loading || !characterOptions.length}
        >
          {loading ? '점검 중...' : '준비도 점검'}
        </button>
      </div>

      {!characterOptions.length && (
        <p className="result-empty">
          먼저 캐릭터를 검색하거나 즐겨찾기를 추가해 주세요.
        </p>
      )}
      {error && <p className="result-error">{error}</p>}

      {report && (
        <section className="boss-check-result">
          <p className="boss-check-summary">
            {selectedCharacterName} / {selectedBossName}: {report.passedCount}/
            {report.totalCount} 통과
          </p>

          <ul className="boss-check-list">
            {report.checks.map((check) => (
              <li key={check.id} className="boss-check-item">
                <div>
                  <strong>{check.label}</strong>
                  <p>
                    현재: {check.current} / 기준: {check.required}
                  </p>
                </div>
                <span
                  className={
                    check.passed ? 'boss-check-badge pass' : 'boss-check-badge fail'
                  }
                >
                  {check.passed ? '통과' : '미달'}
                </span>
              </li>
            ))}
          </ul>

          <div className="boss-check-engravings">
            <p>매칭 각인: {report.matchedEngravings.join(', ') || '없음'}</p>
          </div>
        </section>
      )}
    </section>
  )
}
