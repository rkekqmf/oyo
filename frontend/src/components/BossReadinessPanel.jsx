import { useMemo, useState } from 'react'
import { BOSS_CHECKLIST } from '../data/bossChecklist'
import { fetchCharacterArmory } from '../services/lostarkApi'
import { evaluateBossReadiness } from '../utils/bossReadiness'
import { Badge } from './ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import { Button } from './ui/button'
import { Select } from './ui/select'

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
    <Card className="boss-check-section">
      <CardHeader className="boss-check-header">
        <CardTitle>보스 준비도 체크</CardTitle>
        <CardDescription>
          선택한 보스 기준으로 캐릭터 스펙을 자동 점검합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>

      <div className="boss-check-controls">
        <label className="boss-check-field">
          <span>보스</span>
          <Select value={bossId} onChange={(e) => setBossId(e.target.value)}>
            {BOSS_CHECKLIST.map((boss) => (
              <option key={boss.id} value={boss.id}>
                {boss.name} {boss.difficulty}
              </option>
            ))}
          </Select>
        </label>

        <label className="boss-check-field">
          <span>캐릭터</span>
          <Select
            value={characterKey}
            onChange={(e) => setCharacterKey(e.target.value)}
          >
            <option value="">캐릭터 선택</option>
            {characterOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.character.CharacterName} ({option.character.ServerName})
              </option>
            ))}
          </Select>
        </label>

        <Button
          type="button"
          className="boss-check-button"
          onClick={runCheck}
          disabled={loading || !characterOptions.length}
        >
          {loading ? '점검 중...' : '준비도 점검'}
        </Button>
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
                  className="boss-check-badge-wrap"
                >
                  <Badge variant={check.passed ? 'success' : 'danger'}>
                    {check.passed ? '통과' : '미달'}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>

          <div className="boss-check-engravings">
            <p>매칭 각인: {report.matchedEngravings.join(', ') || '없음'}</p>
          </div>
        </section>
      )}
      </CardContent>
    </Card>
  )
}
