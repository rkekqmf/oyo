/**
 * 로스트아크 캐릭터 환산 점수 (게임 API 기반)
 *
 * 계산식: 점수 = 기본공격력 × 스탯가중치 × 각인보정 × 보석보정 × 아크패시브보정 × 아이템레벨보정
 *
 * 사용 데이터 (armory):
 * - profile: Stats(치명/특화/신속/공격력), ItemAvgLevel, CharacterClassName
 * - engravings: 각인 레벨
 * - gems: 보석 레벨
 * - arkPassive: 아크 패시브 포인트·효과
 * - arkGrid: 아크 그리드 노드
 *
 * 등급: S(2100+), A(1700+), B(1300+), C(미만)
 */
function toNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return 0
  const parsed = Number.parseFloat(value.replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase()
}

function getStatValue(stats, names) {
  const normalizedTargets = names.map((name) => normalizeName(name))
  const matched = (Array.isArray(stats) ? stats : []).find((stat) =>
    normalizedTargets.includes(normalizeName(stat?.Type))
  )
  return toNumber(matched?.Value)
}

function getClassWeights(className) {
  const normalized = normalizeName(className)
  if (normalized.includes('소서리스')) return { crit: 0.3, spec: 0.95, swift: 0.1 }
  if (normalized.includes('블레이드')) return { crit: 0.35, spec: 1.0, swift: 0.08 }
  if (normalized.includes('서머너')) return { crit: 0.45, spec: 0.8, swift: 0.12 }
  return { crit: 0.36, spec: 0.72, swift: 0.24 }
}

function getEngravingFactor(engravingPayload) {
  const effects = [
    ...(Array.isArray(engravingPayload?.Effects) ? engravingPayload.Effects : []),
    ...(Array.isArray(engravingPayload?.ArkPassiveEffects)
      ? engravingPayload.ArkPassiveEffects
      : []),
    ...(Array.isArray(engravingPayload?.Engravings)
      ? engravingPayload.Engravings
      : []),
  ]

  const score = effects.reduce((sum, effect) => {
    const level = toNumber(effect?.Level || effect?.AbilityStoneLevel || 0)
    return sum + clamp(level, 0, 3)
  }, 0)

  return clamp(1 + score * 0.018, 1, 1.32)
}

function getGemFactor(gemsPayload) {
  const avg = getGemAverageLevel(gemsPayload)
  if (!avg) return 1
  return clamp(1 + avg * 0.025, 1, 1.28)
}

function getGemAverageLevel(gemsPayload) {
  const gems = Array.isArray(gemsPayload?.Gems) ? gemsPayload.Gems : []
  if (!gems.length) return 0

  const total = gems.reduce((sum, gem) => sum + toNumber(gem?.Level), 0)
  return total / gems.length
}

/**
 * 로펙 스케일 보정식 (일반화 모델)
 * score = c0 + c1*raw + c2*gem + c3*itemLevel + c4*(raw*itemLevel)
 *
 * - raw: 내부 전투력 계산 결과
 * - gem: 평균 보석 레벨
 * - itemLevel: 평균 아이템 레벨
 *
 * 주의: 앵커에 "정확 일치"가 목적이 아닌, 미등록 캐릭터에서도
 * 극단적으로 튀지 않도록 저차식으로 안정화한 모델.
 */
function calibrateLopecLikeScore(powerRaw, gemAverageLevel, itemLevel) {
  const r = powerRaw
  const g = gemAverageLevel
  const il = Number(itemLevel) || 0
  const score =
    222941.07801556587 +
    -0.25743857692759775 * r +
    -353.05095523557975 * g +
    -130.64954627200495 * il +
    0.00016611100669061685 * r * il
  return Math.max(0, Number(score.toFixed(2)))
}

function getArkPassivePoints(arkPassivePayload) {
  const points = Array.isArray(arkPassivePayload?.ArkPassivePoints)
    ? arkPassivePayload.ArkPassivePoints
    : []

  return points
    .map((point) => ({
      name: String(point?.Name || point?.Type || '').trim(),
      value: toNumber(point?.Value || point?.Point || point?.Level || 0),
      description: String(point?.Description || '').trim(),
    }))
    .filter((point) => point.name)
}

function getArkPassiveEffects(arkPassivePayload, engravingPayload) {
  const fromArkEndpoint = Array.isArray(arkPassivePayload?.Effects)
    ? arkPassivePayload.Effects
    : []
  const fromEngraving = Array.isArray(engravingPayload?.ArkPassiveEffects)
    ? engravingPayload.ArkPassiveEffects
    : []
  return [...fromArkEndpoint, ...fromEngraving]
}

function getArkPassiveFactor(arkPassivePayload, engravingPayload) {
  const points = getArkPassivePoints(arkPassivePayload)
  const effects = getArkPassiveEffects(arkPassivePayload, engravingPayload)

  const pointScore = points.reduce((sum, point) => sum + point.value, 0) * 0.0008
  const effectScore = effects.length * 0.008
  return clamp(1 + pointScore + effectScore, 1, 1.3)
}

function collectArkGridEntries(arkGridPayload) {
  if (!arkGridPayload || typeof arkGridPayload !== 'object') return []

  const candidateArrays = [
    arkGridPayload?.Effects,
    arkGridPayload?.Nodes,
    arkGridPayload?.Slots,
    arkGridPayload?.Grids,
    arkGridPayload?.Blocks,
    arkGridPayload?.ArkGridEffects,
    arkGridPayload?.Data,
  ]

  const entries = candidateArrays
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .filter((entry) => entry && typeof entry === 'object')

  return entries.map((entry) => ({
    name: String(entry?.Name || entry?.Type || entry?.Description || '').trim(),
    value: toNumber(entry?.Value || entry?.Point || entry?.Level || entry?.Tier || 0),
    description: String(entry?.Description || entry?.Grade || '').trim(),
  }))
}

function getArkGridSummary(arkGridPayload, fallbackPoints) {
  const entries = collectArkGridEntries(arkGridPayload).filter(
    (entry) => entry.name || entry.value > 0
  )

  if (entries.length) {
    const summary = entries
      .slice(0, 3)
      .map((entry) =>
        entry.value > 0 ? `${entry.name || '노드'} ${Math.round(entry.value)}` : entry.name
      )
      .filter(Boolean)
      .join(', ')

    const score = entries.reduce((sum, entry) => sum + entry.value, 0)
    const tier = score >= 200 ? '상' : score >= 100 ? '중' : '하'
    return {
      summary: summary || '데이터 있음',
      tier,
      score,
      entries,
    }
  }

  const pointSummary = fallbackPoints
    .map((point) => `${point.name} ${Math.round(point.value)}`)
    .join(' / ')
  const score = fallbackPoints.reduce((sum, point) => sum + point.value, 0)
  const tier = score >= 360 ? '상' : score >= 240 ? '중' : score > 0 ? '하' : '없음'

  return {
    summary: pointSummary || '데이터 없음',
    tier,
    score,
    entries: [],
  }
}

function getExtraFactor(profile) {
  const itemLevel = toNumber(profile?.ItemAvgLevel)
  return clamp(1 + Math.max(itemLevel - 1500, 0) * 0.0002, 1, 1.22)
}

function toGrade(score) {
  if (score >= 2100) return 'S'
  if (score >= 1700) return 'A'
  if (score >= 1300) return 'B'
  return 'C'
}

/** 보정식 피팅용: raw 점수(미반올림), 보석 평균 레벨, 아이템레벨 반환 */
export function getRawPowerAndGemAvg({ character, armory }) {
  const profile = armory?.profile || {}
  const stats = Array.isArray(profile?.Stats) ? profile.Stats : []
  const className = character?.CharacterClassName || profile?.CharacterClassName || ''
  const weights = getClassWeights(className)

  const attack =
    getStatValue(stats, ['공격력']) ||
    toNumber(profile?.AttackPower) ||
    toNumber(profile?.ExpeditionLevel) * 10 ||
    1000

  const crit = getStatValue(stats, ['치명'])
  const spec = getStatValue(stats, ['특화'])
  const swift = getStatValue(stats, ['신속'])

  const statFactor = clamp(
    1 + (crit * weights.crit + spec * weights.spec + swift * weights.swift) / 10000,
    1,
    1.4
  )
  const engravingFactor = getEngravingFactor(armory?.engravings)
  const gemAverageLevel = getGemAverageLevel(armory?.gems)
  const gemFactor = getGemFactor(armory?.gems)
  const arkPassiveFactor = getArkPassiveFactor(armory?.arkPassive, armory?.engravings)
  const extraFactor = getExtraFactor(profile)

  const powerRaw =
    attack *
    statFactor *
    engravingFactor *
    gemFactor *
    arkPassiveFactor *
    extraFactor

  const itemLevel = toNumber(profile?.ItemAvgLevel)
  return { powerRaw, gemAverageLevel, itemLevel }
}

export function analyzeCombatPower({ character, armory }) {
  const profile = armory?.profile || {}
  const stats = Array.isArray(profile?.Stats) ? profile.Stats : []
  const className = character?.CharacterClassName || profile?.CharacterClassName || ''
  const weights = getClassWeights(className)

  const attack =
    getStatValue(stats, ['공격력']) ||
    toNumber(profile?.AttackPower) ||
    toNumber(profile?.ExpeditionLevel) * 10 ||
    1000

  const crit = getStatValue(stats, ['치명'])
  const spec = getStatValue(stats, ['특화'])
  const swift = getStatValue(stats, ['신속'])

  const statFactor = clamp(
    1 + (crit * weights.crit + spec * weights.spec + swift * weights.swift) / 10000,
    1,
    1.4
  )
  const engravingFactor = getEngravingFactor(armory?.engravings)
  const gemAverageLevel = getGemAverageLevel(armory?.gems)
  const gemFactor = getGemFactor(armory?.gems)
  const arkPassiveFactor = getArkPassiveFactor(armory?.arkPassive, armory?.engravings)
  const extraFactor = getExtraFactor(profile)

  const powerRaw =
    attack *
    statFactor *
    engravingFactor *
    gemFactor *
    arkPassiveFactor *
    extraFactor

  const points = getArkPassivePoints(armory?.arkPassive)
  const effects = getArkPassiveEffects(armory?.arkPassive, armory?.engravings)
    .map((effect) => String(effect?.Name || '').trim())
    .filter(Boolean)

  const arkGrid = getArkGridSummary(armory?.arkGrid, points)
  const itemLevel = toNumber(profile?.ItemAvgLevel)
  const lopecLikeScore = calibrateLopecLikeScore(powerRaw, gemAverageLevel, itemLevel)

  return {
    score: lopecLikeScore,
    grade: toGrade(lopecLikeScore),
    rawScore: Math.round(powerRaw),
    factors: {
      statFactor,
      engravingFactor,
      gemFactor,
      arkPassiveFactor,
      extraFactor,
    },
    calibration: {
      gemAverageLevel: Number(gemAverageLevel.toFixed(2)),
    },
    arkPassive: {
      points,
      effectNames: effects.slice(0, 5),
      summary: effects.slice(0, 3).join(', ') || '데이터 없음',
    },
    arkGrid: {
      summary: arkGrid.summary,
      tier: arkGrid.tier,
      score: arkGrid.score,
      entries: arkGrid.entries,
    },
  }
}

