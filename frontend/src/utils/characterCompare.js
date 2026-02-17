import { getEngravingEffects } from './engraving'

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

function getEngravingCount(armory) {
  const effects = getEngravingEffects(armory?.engravings)
  return effects.length
}

export function buildCharacterCompareRow(character, armory) {
  const itemLevel = toNumber(
    armory?.profile?.ItemAvgLevel || character?.ItemAvgLevel || 0
  )
  const gems = armory?.gems?.Gems || []
  const gemLevels = gems.map(parseGemLevel).filter((level) => level > 0)
  const avgGemLevel = gemLevels.length
    ? gemLevels.reduce((sum, level) => sum + level, 0) / gemLevels.length
    : 0
  const engravingCount = getEngravingCount(armory)

  return {
    key: `${character.CharacterName}:${character.ServerName}`,
    name: character.CharacterName || '-',
    server: character.ServerName || '-',
    className: character.CharacterClassName || '-',
    itemLevel,
    avgGemLevel,
    engravingCount,
  }
}

export function getMaxMetrics(rows) {
  const values = {
    itemLevel: 0,
    avgGemLevel: 0,
    engravingCount: 0,
  }

  rows.forEach((row) => {
    values.itemLevel = Math.max(values.itemLevel, row.itemLevel || 0)
    values.avgGemLevel = Math.max(values.avgGemLevel, row.avgGemLevel || 0)
    values.engravingCount = Math.max(values.engravingCount, row.engravingCount || 0)
  })

  return values
}
