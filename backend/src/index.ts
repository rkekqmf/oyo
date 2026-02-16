import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  LOSTARK_API_TOKEN?: string
}

const app = new Hono<{ Bindings: Bindings }>()

const LOSTARK_API_BASE_URL = 'https://developer-lostark.game.onstove.com'

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

export default app