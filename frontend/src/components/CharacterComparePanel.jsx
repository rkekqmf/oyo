import { useMemo, useState } from 'react'
import { fetchCharacterArmory } from '../services/lostarkApi'
import {
  buildCharacterCompareRow,
  getMaxMetrics,
} from '../utils/characterCompare'

const MAX_COMPARE_COUNT = 3

function toCharacterKey(character) {
  return `${character.CharacterName}:${character.ServerName}`
}

export function CharacterComparePanel({ characters }) {
  const [selectedKeys, setSelectedKeys] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const characterOptions = useMemo(
    () => characters.map((character) => ({ key: toCharacterKey(character), character })),
    [characters]
  )

  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys])
  const maxMetrics = useMemo(() => getMaxMetrics(rows), [rows])

  const toggleSelect = (key) => {
    if (selectedSet.has(key)) {
      setSelectedKeys((prev) => prev.filter((item) => item !== key))
      return
    }

    if (selectedKeys.length >= MAX_COMPARE_COUNT) {
      setError(`최대 ${MAX_COMPARE_COUNT}명까지 비교할 수 있습니다.`)
      return
    }

    setError('')
    setSelectedKeys((prev) => [...prev, key])
  }

  const runCompare = async () => {
    if (selectedKeys.length < 2) {
      setError('비교를 위해 최소 2명을 선택해주세요.')
      return
    }

    setError('')
    setLoading(true)
    setRows([])

    try {
      const selectedCharacters = characterOptions
        .filter((option) => selectedSet.has(option.key))
        .map((option) => option.character)

      const armoryResults = await Promise.all(
        selectedCharacters.map((character) =>
          fetchCharacterArmory(character.CharacterName)
        )
      )

      const comparedRows = selectedCharacters.map((character, index) =>
        buildCharacterCompareRow(character, armoryResults[index])
      )
      setRows(comparedRows)
    } catch (e) {
      setError(e instanceof Error ? e.message : '비교 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="compare-section">
      <header className="compare-header">
        <h2>캐릭터 비교</h2>
        <p>최대 3명을 선택해 스펙을 한눈에 비교합니다.</p>
      </header>

      {!characterOptions.length && (
        <p className="result-empty">
          먼저 캐릭터를 검색하거나 즐겨찾기를 추가해 주세요.
        </p>
      )}

      {Boolean(characterOptions.length) && (
        <>
          <div className="compare-picker">
            {characterOptions.map((option) => (
              <label key={option.key} className="compare-picker-item">
                <input
                  type="checkbox"
                  checked={selectedSet.has(option.key)}
                  onChange={() => toggleSelect(option.key)}
                />
                <span>
                  {option.character.CharacterName} ({option.character.ServerName})
                </span>
              </label>
            ))}
          </div>

          <button
            type="button"
            className="compare-button"
            onClick={runCompare}
            disabled={loading}
          >
            {loading ? '비교 중...' : '비교 실행'}
          </button>
        </>
      )}

      {error && <p className="result-error">{error}</p>}

      {rows.length > 0 && (
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th>캐릭터</th>
                <th>클래스</th>
                <th>아이템 레벨</th>
                <th>평균 보석 레벨</th>
                <th>각인 개수</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td>{row.name}</td>
                  <td>{row.className}</td>
                  <td
                    className={
                      row.itemLevel === maxMetrics.itemLevel ? 'metric-best' : ''
                    }
                  >
                    {row.itemLevel ? row.itemLevel.toFixed(2) : '-'}
                  </td>
                  <td
                    className={
                      row.avgGemLevel === maxMetrics.avgGemLevel ? 'metric-best' : ''
                    }
                  >
                    {row.avgGemLevel ? row.avgGemLevel.toFixed(1) : '-'}
                  </td>
                  <td
                    className={
                      row.engravingCount === maxMetrics.engravingCount
                        ? 'metric-best'
                        : ''
                    }
                  >
                    {row.engravingCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
