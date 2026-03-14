/**
 * 효율 탭별 리모컨(가격 조정) 항목 정의.
 * marketItemName: 거래소 시세 조회용 아이템명 (null이면 시세 미조회).
 * defaultQuantity: 예상 비용 계산용 기본 수량 (실제 재련 데이터 연동 전까지 사용).
 */
/** 무기 재련: 파괴석 사용, 필요 개수(일반 재련 기준) */
export const REFINEMENT_REMOTE_ITEMS_WEAPON = [
  { id: 'shard', label: '운명의 파편', marketItemName: '운명의 파편', defaultQuantity: 21000 },
  { id: 'destruction_stone', label: '운명의 파괴석', marketItemName: '운명의 파괴석', defaultQuantity: 1250 },
  { id: 'leapstone', label: '운명의 돌파석', marketItemName: '운명의 돌파석', defaultQuantity: 18 },
  { id: 'fusion', label: '아비도스 융화재료', marketItemName: '아비도스 융화 재료', defaultQuantity: 12 },
  { id: 'silver', label: '실링', marketItemName: null, defaultQuantity: 55000 },
  { id: 'gold', label: '골드', marketItemName: null, defaultQuantity: 1620 },
]

/** 방어구 재련: 수호석 사용, 필요 개수(무기와 상이) */
export const REFINEMENT_REMOTE_ITEMS_ARMOR = [
  { id: 'shard', label: '운명의 파편', marketItemName: '운명의 파편', defaultQuantity: 3000 },
  { id: 'guardian_stone', label: '운명의 수호석', marketItemName: '운명의 수호석', defaultQuantity: 750 },
  { id: 'leapstone', label: '운명의 돌파석', marketItemName: '운명의 돌파석', defaultQuantity: 11 },
  { id: 'fusion', label: '아비도스 융화재료', marketItemName: '아비도스 융화 재료', defaultQuantity: 7 },
  { id: 'silver', label: '실링', marketItemName: null, defaultQuantity: 33000 },
  { id: 'gold', label: '골드', marketItemName: null, defaultQuantity: 970 },
]

/** 요약표 등 공통: 무기 아이템 기준 (파괴석) */
export const REFINEMENT_REMOTE_ITEMS = REFINEMENT_REMOTE_ITEMS_WEAPON

/** 상급 재련 무기/방어구: 필요 개수는 일반 재련과 동일 구조로 유지(필요 시 단계별로 조정) */
export const ADVANCED_REFINEMENT_REMOTE_ITEMS_WEAPON = [
  { id: 'shard', label: '운명의 파편', marketItemName: '운명의 파편', defaultQuantity: 21000 },
  { id: 'destruction_stone', label: '운명의 파괴석', marketItemName: '운명의 파괴석', defaultQuantity: 1250 },
  { id: 'leapstone', label: '운명의 돌파석', marketItemName: '운명의 돌파석', defaultQuantity: 18 },
  { id: 'fusion', label: '아비도스 융화재료', marketItemName: '아비도스 융화 재료', defaultQuantity: 12 },
  { id: 'silver', label: '실링', marketItemName: null, defaultQuantity: 55000 },
  { id: 'gold', label: '골드', marketItemName: null, defaultQuantity: 1620 },
]
export const ADVANCED_REFINEMENT_REMOTE_ITEMS_ARMOR = [
  { id: 'shard', label: '운명의 파편', marketItemName: '운명의 파편', defaultQuantity: 3000 },
  { id: 'guardian_stone', label: '운명의 수호석', marketItemName: '운명의 수호석', defaultQuantity: 750 },
  { id: 'leapstone', label: '운명의 돌파석', marketItemName: '운명의 돌파석', defaultQuantity: 11 },
  { id: 'fusion', label: '아비도스 융화재료', marketItemName: '아비도스 융화 재료', defaultQuantity: 7 },
  { id: 'silver', label: '실링', marketItemName: null, defaultQuantity: 33000 },
  { id: 'gold', label: '골드', marketItemName: null, defaultQuantity: 970 },
]
export const ADVANCED_REFINEMENT_REMOTE_ITEMS = ADVANCED_REFINEMENT_REMOTE_ITEMS_WEAPON

/** 보조재료: 무기 = 용암의 숨결 + 야금술 책. successRateDelta = 강화 성공률 증가(%). */
export const REFINEMENT_AUXILIARY_WEAPON = [
  { id: 'lava_breath', label: '용암의 숨결', marketItemName: '용암의 숨결', defaultQuantity: 20, successRateDelta: 10 },
  { id: 'metallurgy_book', label: '야금술 : 업화 [11-14]', marketItemName: '야금술 : 업화 [11-14]', defaultQuantity: 1, successRateDelta: 3 },
]

/** 보조재료: 방어구 = 빙하의 숨결 + 재봉술 책. LOAGAP 기준 재봉술 : 업화 [11-14] */
export const REFINEMENT_AUXILIARY_ARMOR = [
  { id: 'ice_breath', label: '빙하의 숨결', marketItemName: '빙하의 숨결', defaultQuantity: 20, successRateDelta: 10 },
  { id: 'tailoring_book', label: '재봉술 : 업화 [11-14]', marketItemName: '재봉술 : 업화 [11-14]', defaultQuantity: 1, successRateDelta: 3 },
]

/** 혈석 상점 / 싱글 상점 / 재료 교환 등은 필요 시 marketItemName 추가 */
export const SHOP_EFFICIENCY_REMOTE_ITEMS = [
  { id: 'bloodstone', label: '혈석', marketItemName: null, defaultQuantity: 0 },
  { id: 'silver', label: '실링', marketItemName: null, defaultQuantity: 0 },
  { id: 'gold', label: '골드', marketItemName: null, defaultQuantity: 0 },
]

export const EXCHANGE_EFFICIENCY_REMOTE_ITEMS = [
  { id: 'material_a', label: '재료 A', marketItemName: null, defaultQuantity: 0 },
  { id: 'material_b', label: '재료 B', marketItemName: null, defaultQuantity: 0 },
  { id: 'gold', label: '골드', marketItemName: null, defaultQuantity: 0 },
]
