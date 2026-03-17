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

const FETCH_TIMEOUT_MS = 15000

function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId)
  )
}

/** 캐릭터 검색(동명이인 목록) - 1회 호출 */
export async function fetchCharacterSiblings(name) {
  const url = `${API_BASE_URL}/api/lostark/characters/${encodeURIComponent(name)}`
  let res
  try {
    res = await fetchWithTimeout(url)
  } catch (e) {
    if (e?.name === 'AbortError') {
      throw new Error('요청 시간이 초과되었습니다. 서버가 실행 중인지 확인해 주세요.')
    }
    throw new Error(e?.message || '네트워크 오류')
  }
  const payload = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(
      payload?.error || payload?.message || `요청 실패 (${res.status})`
    )
  }
  if (payload?.ok === false && payload?.error) {
    throw new Error(payload.error)
  }
  return Array.isArray(payload?.data) ? payload.data : payload?.data ?? []
}

export async function fetchCharacterArmory(name) {
  const payload = await request(
    `/api/lostark/armories/${encodeURIComponent(name)}`
  )
  return payload.data
}

export async function fetchSasagePosts(name) {
  const payload = await request(
    `/api/community/sasage/${encodeURIComponent(name)}`
  )
  return {
    posts: Array.isArray(payload.data) ? payload.data : [],
    warning: payload.warning || '',
  }
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

/** 게임 API 원본 응답 그대로 (백엔드 가공 없음) - 1건 */
export async function fetchMarketRaw(itemName) {
  const res = await fetch(`${API_BASE_URL}/api/market/raw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemName }),
  })
  const payload = await res.json().catch(() => null)
  if (!res.ok || !payload?.ok) {
    throw new Error(payload?.message || `요청 실패 (status: ${res.status})`)
  }
  return { data: payload.data, source: payload.source ?? '' }
}

/** 게임 API 원본 여러 아이템 한 번에 (가공 없이 그대로) */
export async function fetchMarketRawMulti(itemNames) {
  if (!itemNames?.length) return []
  const res = await fetch(`${API_BASE_URL}/api/market/raw/multi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemNames }),
  })
  const payload = await res.json().catch(() => null)
  if (!res.ok || !payload?.ok) {
    throw new Error(payload?.message || `요청 실패 (status: ${res.status})`)
  }
  return payload.data ?? []
}

/** 계산용: RecentPrice 기반 단가(묶음 환산 포함) 여러 아이템 */
export async function fetchMarketRecentMulti(itemNames) {
  if (!itemNames?.length) return []
  const res = await fetch(`${API_BASE_URL}/api/market/recent/multi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemNames }),
  })
  const payload = await res.json().catch(() => null)
  if (!res.ok || !payload?.ok) {
    throw new Error(payload?.message || `요청 실패 (status: ${res.status})`)
  }
  return payload.data ?? []
}

/** 여러 아이템 시세를 한 번에 조회 (단일 요청) */
export async function createMarketSnapshotsBatch(itemNames) {
  if (!itemNames?.length) return []
  const res = await fetch(`${API_BASE_URL}/api/market/snapshot/multi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemNames }),
  })
  const payload = await res.json().catch(() => null)
  if (!res.ok || !payload?.ok) {
    throw new Error(payload?.message || `요청 실패 (status: ${res.status})`)
  }
  return payload.data ?? []
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
