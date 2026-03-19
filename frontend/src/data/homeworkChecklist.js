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

/** 레이드: (목데이터를 최소화) 세르카 + 종막/4막 2종만 남김 */
export const RAID_ITEMS = [
  // Shadow raid: 세르카
  { id: 'serka-n', label: '세르카', groupKey: 'serka', category: 'shadow', difficulty: 'normal', entryLevel: 1710, gold: 35000, boundGold: 0 },
  { id: 'serka-h', label: '세르카', groupKey: 'serka', category: 'shadow', difficulty: 'hard', entryLevel: 1730, gold: 44000, boundGold: 0 },
  { id: 'serka-m', label: '세르카', groupKey: 'serka', category: 'shadow', difficulty: 'nightmare', entryLevel: 1740, gold: 54000, boundGold: 0 },

  // Abyss dungeon: 지평의 성당
  { id: 'cathedral-s1', label: '지평의 성당', groupKey: 'cathedral', category: 'abyss', difficulty: 'stage1', entryLevel: 1700, gold: 0, boundGold: 30000 },
  { id: 'cathedral-s2', label: '지평의 성당', groupKey: 'cathedral', category: 'abyss', difficulty: 'stage2', entryLevel: 1720, gold: 0, boundGold: 40000 },
  { id: 'cathedral-s3', label: '지평의 성당', groupKey: 'cathedral', category: 'abyss', difficulty: 'stage3', entryLevel: 1750, gold: 0, boundGold: 50000 },

  // Kazerus raid: 종막:카제로스
  { id: 'kazerus-n', label: '종막:카제로스', groupKey: 'kazerus', category: 'kazerus', difficulty: 'normal', entryLevel: 1710, gold: 40000, boundGold: 0 },
  { id: 'kazerus-h', label: '종막:카제로스', groupKey: 'kazerus', category: 'kazerus', difficulty: 'hard', entryLevel: 1730, gold: 52000, boundGold: 0 },

  // Kazerus raid: 4막:아르모체
  { id: 'armoce-n', label: '4막:아르모체', groupKey: 'armoce', category: 'kazerus', difficulty: 'normal', entryLevel: 1700, gold: 33000, boundGold: 0 },
  { id: 'armoce-h', label: '4막:아르모체', groupKey: 'armoce', category: 'kazerus', difficulty: 'hard', entryLevel: 1720, gold: 42000, boundGold: 0 },

  // Kazerus raid: 3막:모르둠
  { id: 'mordum-s', label: '3막:모르둠', groupKey: 'mordum', category: 'kazerus', difficulty: 'single', entryLevel: 1680, gold: 10500, boundGold: 10500 },
  { id: 'mordum-n', label: '3막:모르둠', groupKey: 'mordum', category: 'kazerus', difficulty: 'normal', entryLevel: 1680, gold: 21000, boundGold: 0 },
  { id: 'mordum-h', label: '3막:모르둠', groupKey: 'mordum', category: 'kazerus', difficulty: 'hard', entryLevel: 1700, gold: 27000, boundGold: 0 },

  // Kazerus raid: 2막:아브렐슈드
  { id: 'avrel-s', label: '2막:아브렐슈드', groupKey: 'avrel', category: 'kazerus', difficulty: 'single', entryLevel: 1670, gold: 8250, boundGold: 8250 },
  { id: 'avrel-n', label: '2막:아브렐슈드', groupKey: 'avrel', category: 'kazerus', difficulty: 'normal', entryLevel: 1670, gold: 16500, boundGold: 0 },
  { id: 'avrel-h', label: '2막:아브렐슈드', groupKey: 'avrel', category: 'kazerus', difficulty: 'hard', entryLevel: 1690, gold: 23000, boundGold: 0 },

  // Kazerus raid: 1막:에기르
  { id: 'egir-s', label: '1막:에기르', groupKey: 'egir', category: 'kazerus', difficulty: 'single', entryLevel: 1660, gold: 5750, boundGold: 5750 },
  { id: 'egir-n', label: '1막:에기르', groupKey: 'egir', category: 'kazerus', difficulty: 'normal', entryLevel: 1660, gold: 11500, boundGold: 0 },
  { id: 'egir-h', label: '1막:에기르', groupKey: 'egir', category: 'kazerus', difficulty: 'hard', entryLevel: 1680, gold: 18000, boundGold: 0 },

  // Kazerus raid: 서막:에키드나
  { id: 'ekidna-s', label: '서막:에키드나', groupKey: 'ekidna', category: 'kazerus', difficulty: 'single', entryLevel: 1620, gold: 0, boundGold: 6100 },
  { id: 'ekidna-n', label: '서막:에키드나', groupKey: 'ekidna', category: 'kazerus', difficulty: 'normal', entryLevel: 1620, gold: 0, boundGold: 6100 },
  { id: 'ekidna-h', label: '서막:에키드나', groupKey: 'ekidna', category: 'kazerus', difficulty: 'hard', entryLevel: 1640, gold: 7200, boundGold: 0 },

  // Epic raid: 베히모스
  { id: 'behemoth-n', label: '베히모스', groupKey: 'behemoth', category: 'epic', difficulty: 'normal', entryLevel: 1640, gold: 7200, boundGold: 0 },
]

/** 레벨에 맞는 기본 레이드 3개 (골드+귀속골드 합계 상위) */
export function getDefaultRaidIdsByLevel(itemLevel) {
  const lv = Number(String(itemLevel ?? '').replace(/[^\d.]/g, ''))
  if (!Number.isFinite(lv)) return []

  const eligible = RAID_ITEMS.filter((it) => {
    const entry = Number(it.entryLevel)
    return Number.isFinite(entry) && entry <= lv
  })

  // 같은 레이드 그룹에서는 보상이 가장 큰 난이도 1개만 후보로 사용
  const bestByGroup = new Map()
  for (const it of eligible) {
    const groupKey = it.groupKey ?? it.id
    const payout = Number(it.gold ?? 0) + Number(it.boundGold ?? 0)
    const tradeableGold = Number(it.gold ?? 0)
    const prev = bestByGroup.get(groupKey)
    if (
      !prev ||
      payout > prev.payout ||
      (payout === prev.payout && tradeableGold > prev.tradeableGold) ||
      (payout === prev.payout && tradeableGold === prev.tradeableGold && Number(it.entryLevel ?? 0) > Number(prev.item.entryLevel ?? 0))
    ) {
      bestByGroup.set(groupKey, { item: it, payout, tradeableGold })
    }
  }

  return Array.from(bestByGroup.values())
    .sort(
      (a, b) =>
        b.payout - a.payout ||
        b.tradeableGold - a.tradeableGold ||
        Number(b.item.entryLevel ?? 0) - Number(a.item.entryLevel ?? 0)
    )
    .slice(0, 3)
    .map((x) => x.item.id)
}
