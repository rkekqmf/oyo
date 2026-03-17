/** 일일 숙제 (2개) */
export const DAILY_ITEMS = [
  { id: 'chaos', label: '카오스 던전' },
  { id: 'guardian', label: '가디언 토벌' },
]

/** 주간 숙제 */
export const WEEKLY_ITEMS = [
  { id: 'hourglass', label: '할의 모래시계' },
  { id: 'paradise-heaven', label: '낙원 - 천상' },
  { id: 'paradise-proof', label: '낙원 - 증명' },
  { id: 'paradise-hell', label: '낙원 - 지옥' },
  { id: 'cube', label: '큐브' },
]

/** 레이드 (시스템 골드는 주 3회, 그 외 버스 등 추가 체크 가능) */
export const RAID_ITEMS = [
  { id: 'valtan-n', label: '발탄 노말' },
  { id: 'valtan-h', label: '발탄 하드' },
  { id: 'viakiss-n', label: '비아키스 노말' },
  { id: 'viakiss-h', label: '비아키스 하드' },
  { id: 'kuku-n', label: '쿠크세이튼 노말' },
  { id: 'kuku-h', label: '쿠크세이튼 하드' },
  { id: 'kayangel-n', label: '카양겔 노말' },
  { id: 'kayangel-h', label: '카양겔 하드' },
  { id: 'abrel-n', label: '아브렐슈드 노말' },
  { id: 'abrel-h', label: '아브렐슈드 하드' },
  { id: 'ilia-n', label: '일리아칸 노말' },
  { id: 'ilia-h', label: '일리아칸 하드' },
  { id: 'ivory-n', label: '상아탑 노말' },
  { id: 'ivory-h', label: '상아탑 하드' },
  { id: 'kamen', label: '카멘' },
  { id: 'echidna', label: '에키드나' },
  { id: 'behamos', label: '베히모스' },
]

/** 레벨대별 골드 받는 레이드 3개 (싱글 기본값) */
const DEFAULT_RAIDS_BY_LEVEL = [
  { minLevel: 0, ids: ['valtan-n', 'valtan-h', 'viakiss-n'] },
  { minLevel: 1445, ids: ['valtan-h', 'viakiss-n', 'viakiss-h'] },
  { minLevel: 1475, ids: ['viakiss-h', 'kuku-n', 'kuku-h'] },
  { minLevel: 1540, ids: ['kuku-h', 'kayangel-n', 'abrel-n'] },
  { minLevel: 1580, ids: ['kayangel-h', 'abrel-n', 'abrel-h'] },
  { minLevel: 1600, ids: ['abrel-h', 'ilia-n', 'ilia-h'] },
  { minLevel: 1620, ids: ['ilia-h', 'ivory-n', 'ivory-h'] },
]

/** 레벨에 맞는 기본 레이드 3개 (싱글) */
export function getDefaultRaidIdsByLevel(itemLevel) {
  if (itemLevel == null || !Number.isFinite(itemLevel)) {
    return DEFAULT_RAIDS_BY_LEVEL[0].ids
  }
  const lv = Number(itemLevel)
  let result = DEFAULT_RAIDS_BY_LEVEL[0].ids
  for (const tier of DEFAULT_RAIDS_BY_LEVEL) {
    if (lv >= tier.minLevel) result = tier.ids
  }
  return result
}

/** 버스로 많이 도는 레이드 목록 (모달 버스 버튼용) */
export const BUS_RAID_IDS = [
  'valtan-n', 'valtan-h', 'viakiss-n', 'viakiss-h', 'kuku-n', 'kuku-h',
]

/**
 * 레이드별 싱글 보상 골드 목데이터 (나중에 실제 데이터로 교체)
 * - gold: 거래 가능 골드
 * - boundGold: 귀속 골드 (하위 레이드는 100% 귀속일 수 있음)
 */
export const RAID_GOLD_MOCK = {
  'valtan-n': { gold: 600, boundGold: 600 },
  'valtan-h': { gold: 900, boundGold: 900 },
  'viakiss-n': { gold: 800, boundGold: 800 },
  'viakiss-h': { gold: 1200, boundGold: 1200 },
  'kuku-n': { gold: 1500, boundGold: 1500 },
  'kuku-h': { gold: 1500, boundGold: 1500 },
  'kayangel-n': { gold: 0, boundGold: 2000 },
  'kayangel-h': { gold: 0, boundGold: 2500 },
  'abrel-n': { gold: 2800, boundGold: 0 },
  'abrel-h': { gold: 5600, boundGold: 0 },
  'ilia-n': { gold: 3750, boundGold: 0 },
  'ilia-h': { gold: 7500, boundGold: 0 },
  'ivory-n': { gold: 4500, boundGold: 0 },
  'ivory-h': { gold: 9000, boundGold: 0 },
  'kamen': { gold: 15500, boundGold: 0 },
  'echidna': { gold: 11000, boundGold: 0 },
  'behamos': { gold: 11000, boundGold: 0 },
}
