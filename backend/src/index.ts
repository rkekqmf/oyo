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
  const maxRetries = 2
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const res = await fetch(`${LOSTARK_API_BASE_URL}${path}`, {
      headers: getLostArkHeaders(token),
    })

    if (res.ok) {
      return res.json()
    }

    if (res.status === 429 && attempt < maxRetries) {
      const retryAfter = Number.parseInt(res.headers.get('Retry-After') || '', 10)
      const waitMs = Number.isFinite(retryAfter)
        ? retryAfter * 1000
        : (attempt + 1) * 800
      await new Promise((resolve) => setTimeout(resolve, waitMs))
      continue
    }

    const text = await res.text()
    throw new Error(`status:${res.status} ${text || 'null'}`)
  }
  throw new Error('status:429 null')
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

function getShardPackSize(name: string): number {
  if (!name) return 1
  if (name.includes('소')) return 1000
  if (name.includes('중')) return 2000
  if (name.includes('대')) return 3000
  return 1
}

async function collectMarketRecent(token: string, itemName: string) {
  let lastErr: unknown = null
  for (const code of MARKET_CATEGORY_FALLBACK_CODES) {
    try {
      const payload = await fetchLostArkPostJson(token, '/markets/items', {
        CategoryCode: code,
        ItemName: itemName,
        Sort: 'GRADE',
        SortCondition: 'ASC',
        PageNo: 0,
      })

      const items: any[] = Array.isArray(payload?.Items) ? payload.Items : []
      let picked: any = null
      let bestUnitRecentPrice = Number.POSITIVE_INFINITY

      for (const marketItem of items) {
        const recentPrice = toNumber(marketItem?.RecentPrice)
        if (recentPrice <= 0) continue
        const rawName = String(
          marketItem?.Name ??
          marketItem?.ItemName ??
          marketItem?.AuctionInfo?.Name ??
          ''
        )

        // 기본: BundleCount 기준 환산, 파편은 소/중/대 실제 개수로 환산.
        const bundleCount = Math.max(1, toNumber(marketItem?.BundleCount))
        const unitsPerPack = itemName.includes('파편')
          ? getShardPackSize(rawName) || bundleCount
          : bundleCount
        const unitRecentPrice = recentPrice / Math.max(1, unitsPerPack)

        if (unitRecentPrice < bestUnitRecentPrice) {
          bestUnitRecentPrice = unitRecentPrice
          picked = {
            recentPrice,
            bundleCount,
            unitsPerPack,
            currentMinPrice: toNumber(marketItem?.CurrentMinPrice),
            yDayAvgPrice: toNumber(marketItem?.YDayAvgPrice),
            icon: marketItem?.Icon || marketItem?.IconUrl || null,
          }
        }
      }

      if (picked) {
        return {
          itemName,
          recentPrice: picked.recentPrice,
          bundleCount: picked.bundleCount,
          unitsPerPack: picked.unitsPerPack,
          unitRecentPrice: bestUnitRecentPrice,
          currentMinPrice: picked.currentMinPrice,
          yDayAvgPrice: picked.yDayAvgPrice,
          icon: picked.icon,
          capturedAt: new Date().toISOString(),
          source: `markets/items?CategoryCode=${code}`,
        }
      }
    } catch (e) {
      lastErr = e
    }
  }

  throw new Error(
    `${itemName}: markets empty. tried=${MARKET_CATEGORY_FALLBACK_CODES.join(
      ','
    )} err=${String(lastErr)}`
  )
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

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

async function fetchInvenSasagePosts(query: string) {
  const encoded = encodeURIComponent(query)
  const searchUrl = `https://www.inven.co.kr/search/lostark/article?query=${encoded}`
  const res = await fetch(searchUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  })

  const html = await res.text()
  if (!res.ok) {
    throw new Error(`inven-status:${res.status}`)
  }

  const regex =
    /<a[^>]*href="(https?:\/\/www\.inven\.co\.kr\/board\/lostark\/5355\/\d+|\/board\/lostark\/5355\/\d+)"[^>]*>([\s\S]*?)<\/a>/gi

  const seen = new Set<string>()
  const posts: Array<{ title: string; url: string }> = []
  let match: RegExpExecArray | null = regex.exec(html)
  while (match) {
    const rawUrl = match[1]
    const rawTitle = match[2]
    const url = rawUrl.startsWith('http')
      ? rawUrl
      : `https://www.inven.co.kr${rawUrl}`
    const title = stripTags(decodeHtmlEntities(rawTitle))

    if (title && !seen.has(url)) {
      seen.add(url)
      posts.push({ title, url })
    }
    if (posts.length >= 12) break
    match = regex.exec(html)
  }

  return posts
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
  const requiredEndpoints = {
    profile: `/armories/characters/${encodedName}/profiles`,
    equipment: `/armories/characters/${encodedName}/equipment`,
    engravings: `/armories/characters/${encodedName}/engravings`,
    gems: `/armories/characters/${encodedName}/gems`,
  }
  const optionalEndpoints = {
    arkPassive: `/armories/characters/${encodedName}/arkpassive`,
    arkGrid: `/armories/characters/${encodedName}/arkgrid`,
  }

  const requiredSettled = await Promise.allSettled([
    fetchLostArkJson(token, requiredEndpoints.profile),
    fetchLostArkJson(token, requiredEndpoints.equipment),
    fetchLostArkJson(token, requiredEndpoints.engravings),
    fetchLostArkJson(token, requiredEndpoints.gems),
  ])
  const optionalSettled = await Promise.allSettled([
    fetchLostArkJson(token, optionalEndpoints.arkPassive),
    fetchLostArkJson(token, optionalEndpoints.arkGrid),
  ])

  const [
    profileRes,
    equipmentRes,
    engravingsRes,
    gemsRes,
  ] = requiredSettled
  const [arkPassiveRes, arkGridRes] = optionalSettled

  const data = {
    profile: profileRes.status === 'fulfilled' ? profileRes.value : null,
    equipment: equipmentRes.status === 'fulfilled' ? equipmentRes.value : [],
    engravings: engravingsRes.status === 'fulfilled' ? engravingsRes.value : null,
    gems: gemsRes.status === 'fulfilled' ? gemsRes.value : null,
    arkPassive: arkPassiveRes.status === 'fulfilled' ? arkPassiveRes.value : null,
    arkGrid: arkGridRes.status === 'fulfilled' ? arkGridRes.value : null,
  }

  const requiredErrors = requiredSettled
    .map((result, index) => ({ result, key: Object.keys(requiredEndpoints)[index] }))
    .filter(({ result }) => result.status === 'rejected')
    .map(({ key, result }) => ({
      key,
      message: result.status === 'rejected' ? result.reason?.message : 'unknown',
    }))

  const optionalErrors = optionalSettled
    .map((result, index) => ({ result, key: Object.keys(optionalEndpoints)[index] }))
    .filter(({ result }) => result.status === 'rejected')
    .map(({ key, result }) => ({
      key,
      message: result.status === 'rejected' ? result.reason?.message : 'unknown',
    }))

  const errors = [...requiredErrors, ...optionalErrors]

  if (requiredErrors.length === requiredSettled.length) {
    const isRateLimited = requiredErrors.every((error) =>
      String(error.message).includes('status:429')
    )
    if (isRateLimited) {
      return c.json(
        {
          ok: false,
          message: '요청이 많습니다. 잠시 후 다시 시도해주세요. (status:429)',
          errors,
        },
        429
      )
    }

    const firstMessage = requiredErrors[0]?.message || 'unknown'
    return c.json(
      {
        ok: false,
        message: `상세 정보를 불러오지 못했습니다. (${firstMessage})`,
        errors,
      },
      502
    )
  }

  return c.json({ ok: true, data, partialErrors: errors })
})

app.get('/api/community/sasage/:name', async (c) => {
  const name = c.req.param('name').trim()
  if (!name) {
    return c.json({ ok: false, message: 'name is required' }, 400)
  }

  try {
    const posts = await fetchInvenSasagePosts(name)
    return c.json({
      ok: true,
      data: posts,
      meta: { query: name, source: 'inven-5355' },
    })
  } catch (e) {
    return c.json({
      ok: true,
      data: [],
      warning: e instanceof Error ? e.message : 'sasage-fetch-failed',
    })
  }
})

/** 게임 API 원본 응답 그대로 반환 (백엔드에서 min/avg 등 가공 안 함) */
app.post('/api/market/raw', async (c) => {
  try {
    const token = c.env.LOSTARK_API_TOKEN
    if (!token) {
      return c.json({ ok: false, message: 'LOSTARK_API_TOKEN is missing' }, 500)
    }
    const body = await c.req.json<{ itemName?: string }>()
    const itemName = (body.itemName || '').trim()
    if (!itemName) {
      return c.json({ ok: false, message: 'itemName is required' }, 400)
    }

    let source: string
    let raw: unknown

    try {
      raw = await fetchLostArkPostJson(token, '/auctions/items', {
        ItemName: itemName,
        PageNo: 1,
      })
      source = 'auctions/items'
    } catch {
      const codes = [50010, 50020, 50030, 50040, 50050, 51000]
      let lastErr: Error | null = null
      raw = null
      source = ''
      for (const code of codes) {
        try {
          raw = await fetchLostArkPostJson(token, '/markets/items', {
            CategoryCode: code,
            ItemName: itemName,
            Sort: 'GRADE',
            SortCondition: 'ASC',
            PageNo: 0,
          })
          source = `markets/items?CategoryCode=${code}`
          break
        } catch (e) {
          lastErr = e instanceof Error ? e : new Error(String(e))
        }
      }
      if (raw === null) {
        throw lastErr ?? new Error('markets failed')
      }
    }

    return c.json({ ok: true, data: raw, source })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'market raw failed'
    console.error('[market/raw]', message, e)
    return c.json({ ok: false, message }, 500)
  }
})

/** 게임 API 원본 여러 아이템 한 번에 (각각 가공 없이 그대로 반환) */
app.post('/api/market/raw/multi', async (c) => {
  try {
    const token = c.env.LOSTARK_API_TOKEN
    if (!token) {
      return c.json({ ok: false, message: 'LOSTARK_API_TOKEN is missing' }, 500)
    }
    const body = await c.req.json<{ itemNames?: string[] }>()
    const raw = body.itemNames
    const itemNames = Array.isArray(raw)
      ? [...new Set((raw as string[]).map((s) => String(s).trim()).filter(Boolean))]
      : []
    if (itemNames.length === 0) {
      return c.json({ ok: true, data: [] })
    }

    const results = await Promise.allSettled(
      itemNames.map(async (itemName) => {
        let source: string
        let data: unknown
        try {
          data = await fetchLostArkPostJson(token, '/auctions/items', {
            ItemName: itemName,
            PageNo: 1,
          })
          source = 'auctions/items'
          return { itemName, data, source }
        } catch {
          const codes = [50010, 50020, 50030, 50040, 50050, 51000]
          for (const code of codes) {
            try {
              data = await fetchLostArkPostJson(token, '/markets/items', {
                CategoryCode: code,
                ItemName: itemName,
                Sort: 'GRADE',
                SortCondition: 'ASC',
                PageNo: 0,
              })
              source = `markets/items?CategoryCode=${code}`
              return { itemName, data, source }
            } catch {
              /* try next code */
            }
          }
          throw new Error(`${itemName}: no data`)
        }
      })
    )

    const data = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value
      return {
        itemName: itemNames[i],
        data: null,
        source: '',
        error: r.reason?.message ?? String(r.reason),
      }
    })
    return c.json({ ok: true, data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'market raw multi failed'
    console.error('[market/raw/multi]', message, e)
    return c.json({ ok: false, message }, 500)
  }
})

/** 계산용: RecentPrice 기반(묶음단위 환산 포함) 여러 아이템 단가 */
app.post('/api/market/recent/multi', async (c) => {
  try {
    const token = c.env.LOSTARK_API_TOKEN
    if (!token) {
      return c.json({ ok: false, message: 'LOSTARK_API_TOKEN is missing' }, 500)
    }
    const body = await c.req.json<{ itemNames?: string[] }>()
    const raw = body.itemNames
    const itemNames = Array.isArray(raw)
      ? [...new Set((raw as string[]).map((s) => String(s).trim()).filter(Boolean))]
      : []
    if (itemNames.length === 0) {
      return c.json({ ok: true, data: [] })
    }

    const results = await Promise.allSettled(
      itemNames.map((itemName) => collectMarketRecent(token, itemName))
    )

    const data = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value
      return {
        itemName: itemNames[i],
        recentPrice: 0,
        bundleCount: 1,
        unitsPerPack: 1,
        unitRecentPrice: 0,
        currentMinPrice: 0,
        yDayAvgPrice: 0,
        icon: null,
        capturedAt: new Date().toISOString(),
        source: '',
        error: r.reason?.message ?? String(r.reason),
      }
    })

    return c.json({ ok: true, data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'market recent multi failed'
    console.error('[market/recent/multi]', message, e)
    return c.json({ ok: false, message }, 500)
  }
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
    const message = e instanceof Error ? e.message : 'snapshot failed'
    console.error('[market/snapshot]', message, e)
    return c.json(
      {
        ok: false,
        message,
      },
      500
    )
  }
})

app.post('/api/market/snapshot/multi', async (c) => {
  try {
    const body = await c.req.json<{ itemNames?: string[] }>()
    const raw = body.itemNames
    const itemNames = Array.isArray(raw)
      ? [...new Set((raw as string[]).map((s) => String(s).trim()).filter(Boolean))]
      : []
    if (itemNames.length === 0) {
      return c.json({ ok: true, data: [] })
    }

    const results = await Promise.allSettled(
      itemNames.map((itemName) => collectAndStoreMarketSnapshot(c.env, itemName))
    )
    const data = results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof collectAndStoreMarketSnapshot>>> => r.status === 'fulfilled')
      .map((r) => r.value)
    return c.json({ ok: true, data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'snapshot multi failed'
    console.error('[market/snapshot/multi]', message, e)
    return c.json({ ok: false, message }, 500)
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