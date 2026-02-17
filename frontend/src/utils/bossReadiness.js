import { getEngravingNames as getNamesFromPayload } from './engraving'

function toNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return 0
  const normalized = value.replace(/,/g, '').trim()
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseGemLevel(gem) {
  if (typeof gem?.Level === 'number') return gem.Level
  if (typeof gem?.Level === 'string') {
    const parsed = Number.parseInt(gem.Level, 10)
    if (Number.isFinite(parsed)) return parsed
  }

  const name = gem?.Name || ''
  const matched = name.match(/(\d+)/)
  if (!matched) return 0
  const parsed = Number.parseInt(matched[1], 10)
  return Number.isFinite(parsed) ? parsed : 0
}

export function evaluateBossReadiness({ character, armory, boss }) {
  const itemLevel = toNumber(
    armory?.profile?.ItemAvgLevel || character?.ItemAvgLevel || 0
  )
  const gems = armory?.gems?.Gems || []
  const gemLevels = gems.map(parseGemLevel).filter((level) => level > 0)
  const avgGemLevel = gemLevels.length
    ? gemLevels.reduce((sum, level) => sum + level, 0) / gemLevels.length
    : 0

  const engravingNames = getNamesFromPayload(armory?.engravings)
  const matchedEngravings = boss.requiredEngravings.filter((required) =>
    engravingNames.some((name) => name.includes(required))
  )

  const checks = [
    {
      id: 'item-level',
      label: '아이템 레벨',
      required: `>= ${boss.minItemLevel}`,
      current: itemLevel ? itemLevel.toFixed(2) : '-',
      passed: itemLevel >= boss.minItemLevel,
    },
    {
      id: 'avg-gem-level',
      label: '평균 보석 레벨',
      required: `>= ${boss.minAvgGemLevel}`,
      current: avgGemLevel ? avgGemLevel.toFixed(1) : '-',
      passed: avgGemLevel >= boss.minAvgGemLevel,
    },
    {
      id: 'engraving',
      label: '권장 각인 매칭',
      required: `>= ${boss.minEngravingMatches}개`,
      current: `${matchedEngravings.length}개`,
      passed: matchedEngravings.length >= boss.minEngravingMatches,
    },
  ]

  return {
    checks,
    passedCount: checks.filter((check) => check.passed).length,
    totalCount: checks.length,
    matchedEngravings,
    engravingNames,
    itemLevel,
    avgGemLevel,
  }
}
