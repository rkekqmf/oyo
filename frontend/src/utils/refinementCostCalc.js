/**
 * 재련 10→11 비용 계산 (최저가 기준, 경험치 재료 제외)
 * 이미지: 기본 8,343 / +용암숨결 11,783 / +야금술 9,141 / 둘다 12,581
 */

// 이미지 단가 (골드) - 10→11 필수 재료
const UNIT_PRICES_10_11 = {
  shard: 0.069,           // 운명의 파편
  destruction_stone: 3.6, // 운명의 파괴석
  leapstone: 7.0,         // 운명의 돌파석
  fusion: 97.0,          // 아비도스 융화재료
  silver: 0.0052,        // 실링 (1골드 = 1/0.0052 실링)
}

// 필수 개수 (일반 재련 10→11)
const QUANTITIES_10_11 = {
  shard: 21000,
  destruction_stone: 1250,
  leapstone: 18,
  fusion: 12,
  shard_second: 5000,  // 파편 추가
  silver: 55000,
}

const BASE_COST = 1620 // 골드 고정

/**
 * 1회 시도 비용 (경험치 재료 제외) = 필수 재료 비용 합 + 1620
 * 경험치 재료(1,449)는 "첫 시도 1회"에만 들어가서 "기본" 행에는 제외됨.
 */
export function calcBaseRefinementCost10to11() {
  const costShard = 21000 * UNIT_PRICES_10_11.shard           // 1,449 (경험치 재료)
  const costDestruction = 1250 * UNIT_PRICES_10_11.destruction_stone  // 4,513
  const costLeapstone = 18 * UNIT_PRICES_10_11.leapstone     // 126
  const costFusion = 12 * UNIT_PRICES_10_11.fusion           // 1,164
  const costShardSecond = 5000 * UNIT_PRICES_10_11.shard     // 345
  const costSilver = 55000 * UNIT_PRICES_10_11.silver        // 286

  // 기본 = 경험치 제외한 필수 재료 합 + 1620 (이미지 8,343)
  const withoutExp = costDestruction + costLeapstone + costFusion + costShardSecond + costSilver
  const baseTotal = Math.round(withoutExp) + BASE_COST

  return {
    costShard: Math.round(costShard),
    costDestruction: Math.round(costDestruction),
    costLeapstone: Math.round(costLeapstone),
    costFusion: Math.round(costFusion),
    costShardSecond: Math.round(costShardSecond),
    costSilver: Math.round(costSilver),
    materialsTotal: Math.round(withoutExp),
    baseCost: BASE_COST,
    total: baseTotal,
    // 보조 재료 (선택 시 추가)
    lavaBreath: 3440,   // 용암의 숨결 20개 × 172
    metallurgy: 798,    // 야금술 : 업화 [11-14] 1개 × 798
  }
}

/**
 * 체크 해제/포함에 따라 예상 비용 반영
 * @param {Set} checkedIds - 보유로 체크된 항목 id 집합
 * @param {Object} prices - id별 단가 (골드)
 * @param {Array} items - { id, defaultQuantity }
 */
export function calcTotalWithOptional(baseTotal, checkedIds, prices, items) {
  let sum = baseTotal
  items.forEach((item) => {
    if (!item.marketItemName) return // 시세 없는 보조 등
    const price = prices[item.id] ?? 0
    const qty = item.defaultQuantity ?? 0
    if (checkedIds.has(item.id)) return // 보유 → 0골드
    sum += price * qty
  })
  return sum
}
