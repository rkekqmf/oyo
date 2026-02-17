import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  LOSTARK_API_TOKEN?: string
  AUCTION_WATCH_ITEMS?: string
  DB?: D1Database
}

type WatchItem = {
  itemName: string
  categoryCode?: number
}

const app = new Hono<{ Bindings: Bindings }>()

const LOSTARK_API_BASE_URL = 'https://developer-lostark.game.onstove.com'
const PRICE_RETENTION_DAYS = 365
const MARKET_CATEGORY_FALLBACK_CODES = [
  50010, // 파괴강석 계열
  50020, // 수호강석 계열
  50030, // 돌파석 계열
  50040, // 융화 재료 계열
  50050, // 재련 보조재료 계열(태양의 은총/축복/가호 등)
  51000, // 기타 재료 계열
]

function getLostArkHeaders(token: string) {
  return {
    Authorization: `bearer ${token}`,
    Accept: 'application/json',
  }
}

async function fetchLostArkJson(token: string, path: string) {
  const res = await fetch(`${LOSTARK_API_BASE_URL}${path}`, {
    headers: getLostArkHeaders(token),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`status:${res.status} ${text}`)
  }

  return res.json()
}

async function fetchLostArkPostJson(
  token: string,
  path: string,
  body: unknown
) {
  const res = await fetch(`${LOSTARK_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      ...getLostArkHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`status:${res.status} ${text}`)
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`status:${res.status} invalid-json: ${text.slice(0, 120)}`)
  }
}

async function fetchLostArkGetJson(token: string, path: string) {
  const res = await fetch(`${LOSTARK_API_BASE_URL}${path}`, {
    method: 'GET',
    headers: getLostArkHeaders(token),
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`status:${res.status} ${text}`)
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`status:${res.status} invalid-json: ${text.slice(0, 120)}`)
  }
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return 0
  const normalized = value.replace(/,/g, '').trim()
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function pickItemPrice(item: any): number {
  const candidates = [
    item?.AuctionInfo?.BuyPrice,
    item?.CurrentMinPrice,
    item?.RecentPrice,
    item?.YDayAvgPrice,
    item?.BidStartPrice,
  ]

  for (const candidate of candidates) {
    const n = toNumber(candidate)
    if (n > 0) return n
  }
  return 0
}

function extractAuctionPrices(payload: any): number[] {
  const items: any[] = Array.isArray(payload?.Items) ? payload.Items : []
  return items
    .map((item: any) => pickItemPrice(item))
    .filter((price: number) => Number.isFinite(price) && price > 0)
}

function extractMarketPrices(payload: any): number[] {
  const candidates: number[] = []

  const items = Array.isArray(payload?.Items)
    ? payload.Items
    : Array.isArray(payload)
      ? payload
      : payload
        ? [payload]
        : []

  for (const item of items) {
    const fromCurrent = toNumber(item?.CurrentMinPrice)
    const fromRecent = toNumber(item?.RecentPrice)
    const fromYday = toNumber(item?.YDayAvgPrice)
    if (fromCurrent > 0) candidates.push(fromCurrent)
    if (fromRecent > 0) candidates.push(fromRecent)
    if (fromYday > 0) candidates.push(fromYday)
  }

  return candidates.filter((price) => Number.isFinite(price) && price > 0)
}

function extractTradeVolume(payload: any, fallbackCount: number): number {
  const fromTotalCount = toNumber(payload?.TotalCount)
  if (fromTotalCount > 0) return fromTotalCount

  const stats = Array.isArray(payload?.Stats) ? payload.Stats : []
  const latestStat = stats[stats.length - 1]
  const fromTradeCount = toNumber(latestStat?.TradeCount)
  if (fromTradeCount > 0) return fromTradeCount

  return fallbackCount
}

async function collectAuctionSnapshot(
  token: string,
  itemName: string,
  categoryCode?: number
) {
  let payload: any = null
  let prices: number[] = []
  let tradeVolume = 0
  let source = 'auctions'

  try {
    payload = await fetchLostArkPostJson(token, '/auctions/items', {
      ItemName: itemName,
      PageNo: 1,
    })
    prices = extractAuctionPrices(payload)
    tradeVolume = extractTradeVolume(payload, prices.length)
  } catch (auctionError) {
    const candidateCodes = [
      ...(categoryCode ? [categoryCode] : []),
      ...MARKET_CATEGORY_FALLBACK_CODES.filter((code) => code !== categoryCode),
    ]

    let marketError = ''

    for (const code of candidateCodes) {
      try {
        payload = await fetchLostArkPostJson(token, '/markets/items', {
          CategoryCode: code,
          ItemName: itemName,
          Sort: 'GRADE',
          SortCondition: 'ASC',
          PageNo: 0,
        })
        prices = extractMarketPrices(payload)
        tradeVolume = extractTradeVolume(payload, prices.length)
        source = `markets:${code}`
        if (prices.length) {
          break
        }
      } catch (e) {
        marketError = String(e)
      }
    }

    if (!prices.length) {
      throw new Error(
        `${itemName}: markets empty. tried=${candidateCodes.join(',')} auctionError=${String(
          auctionError
        )} marketError=${marketError}`
      )
    }
  }

  if (!prices.length) {
    throw new Error('가격 데이터가 없습니다. 아이템명을 확인해주세요.')
  }

  const minPrice = Math.min(...prices)
  const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length

  return {
    itemName,
    minPrice,
    avgPrice,
    sampleCount: prices.length,
    tradeVolume,
    capturedAt: new Date().toISOString(),
    source,
  }
}

async function savePriceSnapshot(
  db: D1Database,
  snapshot: {
    itemName: string
    minPrice: number
    avgPrice: number
    sampleCount: number
    tradeVolume: number
    capturedAt: string
  }
) {
  await db
    .prepare(
      `INSERT INTO price_snapshots (item_name, min_price, avg_price, sample_count, trade_volume, captured_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    )
    .bind(
      snapshot.itemName,
      snapshot.minPrice,
      snapshot.avgPrice,
      snapshot.sampleCount,
      snapshot.tradeVolume,
      snapshot.capturedAt
    )
    .run()
}

async function cleanupOldSnapshots(db: D1Database, days: number) {
  await db
    .prepare(
      `DELETE FROM price_snapshots
       WHERE datetime(captured_at) < datetime('now', ?1)`
    )
    .bind(`-${days} days`)
    .run()
}

async function collectAndStoreMarketSnapshot(env: Bindings, itemName: string) {
  const token = env.LOSTARK_API_TOKEN
  if (!token) {
    throw new Error('LOSTARK_API_TOKEN is missing')
  }
  if (!env.DB) {
    throw new Error('D1 DB binding is missing')
  }

  const snapshot = await collectAuctionSnapshot(token, itemName)
  await savePriceSnapshot(env.DB, snapshot)
  await cleanupOldSnapshots(env.DB, PRICE_RETENTION_DAYS)
  return snapshot
}

function parseWatchItems(env: Bindings): WatchItem[] {
  const raw = env.AUCTION_WATCH_ITEMS || ''
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((entry) => {
      const [left, right] = entry.split('|')
      if (right && /^\d+$/.test(left.trim())) {
        return {
          categoryCode: Number.parseInt(left.trim(), 10),
          itemName: right.trim(),
        }
      }
      return { itemName: entry }
    })
    .filter((item) => item.itemName)
}

async function runScheduledSnapshotCollection(env: Bindings) {
  if (!env.DB) return
  const items = parseWatchItems(env)
  for (const item of items) {
    try {
      const token = env.LOSTARK_API_TOKEN
      if (!token) throw new Error('LOSTARK_API_TOKEN is missing')
      const snapshot = await collectAuctionSnapshot(
        token,
        item.itemName,
        item.categoryCode
      )
      await savePriceSnapshot(env.DB, snapshot)
      await cleanupOldSnapshots(env.DB, PRICE_RETENTION_DAYS)
    } catch (e) {
      console.error('Scheduled snapshot failed:', item.itemName, e)
    }
  }
}

// 프론트에서 호출 가능하게 CORS 허용
app.use('/api/*', cors())

app.get('/api/health', (c) => {
  return c.json({
    ok: true,
    service: 'oyo-api',
    now: new Date().toISOString(),
  })
})

app.get('/api/lostark/characters/:name', async (c) => {
  const name = c.req.param('name')
  const token = c.env.LOSTARK_API_TOKEN

  if (!token) {
    return c.json({ ok: false, message: 'LOSTARK_API_TOKEN is missing' }, 500)
  }

  const url = `${LOSTARK_API_BASE_URL}/characters/${encodeURIComponent(name)}/siblings`

  const res = await fetch(url, {
    headers: getLostArkHeaders(token),
  })

  if (!res.ok) {
    const text = await res.text()
    return c.json({ ok: false, status: res.status, error: text }, res.status as 400 | 401 | 403 | 404 | 500)
  }

  const data = await res.json()
  return c.json({ ok: true, data })
})

app.get('/api/lostark/armories/:name', async (c) => {
  const name = c.req.param('name')
  const token = c.env.LOSTARK_API_TOKEN

  if (!token) {
    return c.json({ ok: false, message: 'LOSTARK_API_TOKEN is missing' }, 500)
  }

  const encodedName = encodeURIComponent(name)
  const endpoints = {
    profile: `/armories/characters/${encodedName}/profiles`,
    equipment: `/armories/characters/${encodedName}/equipment`,
    engravings: `/armories/characters/${encodedName}/engravings`,
    gems: `/armories/characters/${encodedName}/gems`,
  }

  const settled = await Promise.allSettled([
    fetchLostArkJson(token, endpoints.profile),
    fetchLostArkJson(token, endpoints.equipment),
    fetchLostArkJson(token, endpoints.engravings),
    fetchLostArkJson(token, endpoints.gems),
  ])

  const [profileRes, equipmentRes, engravingsRes, gemsRes] = settled

  const data = {
    profile: profileRes.status === 'fulfilled' ? profileRes.value : null,
    equipment: equipmentRes.status === 'fulfilled' ? equipmentRes.value : [],
    engravings: engravingsRes.status === 'fulfilled' ? engravingsRes.value : null,
    gems: gemsRes.status === 'fulfilled' ? gemsRes.value : null,
  }

  const errors = settled
    .map((result, index) => ({ result, key: Object.keys(endpoints)[index] }))
    .filter(({ result }) => result.status === 'rejected')
    .map(({ key, result }) => ({
      key,
      message: result.status === 'rejected' ? result.reason?.message : 'unknown',
    }))

  if (errors.length === settled.length) {
    return c.json(
      { ok: false, message: '상세 정보를 불러오지 못했습니다.', errors },
      502
    )
  }

  return c.json({ ok: true, data, partialErrors: errors })
})

app.post('/api/market/snapshot', async (c) => {
  try {
    const body = await c.req.json<{ itemName?: string }>()
    const itemName = (body.itemName || '').trim()
    if (!itemName) {
      return c.json({ ok: false, message: 'itemName is required' }, 400)
    }

    const snapshot = await collectAndStoreMarketSnapshot(c.env, itemName)
    return c.json({ ok: true, data: snapshot })
  } catch (e) {
    return c.json(
      {
        ok: false,
        message: e instanceof Error ? e.message : 'snapshot failed',
      },
      500
    )
  }
})

app.post('/api/market/snapshot/batch', async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, message: 'D1 DB binding is missing' }, 500)
  }

  const items = parseWatchItems(c.env)
  if (!items.length) {
    return c.json(
      { ok: false, message: 'AUCTION_WATCH_ITEMS is empty' },
      400
    )
  }

  const token = c.env.LOSTARK_API_TOKEN
  if (!token) {
    return c.json({ ok: false, message: 'LOSTARK_API_TOKEN is missing' }, 500)
  }

  const results = await Promise.allSettled(
    items.map(async (item) => {
      const snapshot = await collectAuctionSnapshot(
        token,
        item.itemName,
        item.categoryCode
      )
      await savePriceSnapshot(c.env.DB!, snapshot)
      await cleanupOldSnapshots(c.env.DB!, PRICE_RETENTION_DAYS)
      return snapshot
    })
  )

  const collected = results
    .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
    .map((result) => result.value)
  const failed = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => String(result.reason))

  return c.json({
    ok: collected.length > 0,
    data: collected,
    failed,
  })
})

app.get('/api/market/history', async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, message: 'D1 DB binding is missing' }, 500)
  }

  const itemName = (c.req.query('itemName') || '').trim()
  if (!itemName) {
    return c.json({ ok: false, message: 'itemName is required' }, 400)
  }

  const daysRaw = Number.parseInt(c.req.query('days') || '30', 10)
  const days = Math.min(Math.max(daysRaw || 30, 1), 365)

  const result = await c.env.DB.prepare(
    `SELECT item_name, min_price, avg_price, sample_count, trade_volume, captured_at
     FROM price_snapshots
     WHERE item_name = ?1
       AND datetime(captured_at) >= datetime('now', ?2)
     ORDER BY datetime(captured_at) ASC`
  )
    .bind(itemName, `-${days} days`)
    .all()

  return c.json({
    ok: true,
    data: result.results || [],
    meta: { days, itemName },
  })
})

app.get('/api/market/status', async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, message: 'D1 DB binding is missing' }, 500)
  }

  const latestRows = await c.env.DB.prepare(
    `SELECT p.item_name, p.min_price, p.avg_price, p.trade_volume, p.captured_at
     FROM price_snapshots p
     INNER JOIN (
       SELECT item_name, MAX(datetime(captured_at)) AS max_captured_at
       FROM price_snapshots
       GROUP BY item_name
     ) latest
       ON p.item_name = latest.item_name
      AND datetime(p.captured_at) = latest.max_captured_at
     ORDER BY p.item_name ASC`
  ).all()

  const recentRows = await c.env.DB.prepare(
    `SELECT item_name, min_price, avg_price, trade_volume, captured_at
     FROM price_snapshots
     ORDER BY datetime(captured_at) DESC
     LIMIT 20`
  ).all()

  const totalResult = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM price_snapshots`
  ).first<{ total: number }>()

  return c.json({
    ok: true,
    data: {
      latestByItem: latestRows.results || [],
      recent: recentRows.results || [],
      totalCount: totalResult?.total || 0,
      now: new Date().toISOString(),
    },
  })
})

const worker = {
  fetch: app.fetch,
  scheduled: async (_event: ScheduledEvent, env: Bindings) => {
    await runScheduledSnapshotCollection(env)
  },
}

export default worker