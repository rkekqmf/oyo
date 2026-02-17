const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8787'

async function request(path) {
  const res = await fetch(`${API_BASE_URL}${path}`)

  let payload = null
  try {
    payload = await res.json()
  } catch {
    payload = null
  }

  if (!res.ok || !payload?.ok) {
    const message =
      payload?.error || payload?.message || `요청 실패 (status: ${res.status})`
    throw new Error(message)
  }

  return payload
}

export async function fetchCharacterSiblings(name) {
  const payload = await request(
    `/api/lostark/characters/${encodeURIComponent(name)}`
  )
  return payload.data
}

export async function fetchCharacterArmory(name) {
  const payload = await request(
    `/api/lostark/armories/${encodeURIComponent(name)}`
  )
  return payload.data
}

export async function createMarketSnapshot(itemName) {
  const res = await fetch(`${API_BASE_URL}/api/market/snapshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemName }),
  })

  const payload = await res.json().catch(() => null)
  if (!res.ok || !payload?.ok) {
    throw new Error(payload?.message || `요청 실패 (status: ${res.status})`)
  }
  return payload.data
}

export async function fetchMarketHistory(itemName, days = 30) {
  const payload = await request(
    `/api/market/history?itemName=${encodeURIComponent(itemName)}&days=${days}`
  )
  return payload
}

export async function fetchMarketStatus() {
  const payload = await request('/api/market/status')
  return payload.data
}
