/**
 * 백엔드 API 테스트 (실행: node test-api.mjs)
 * 백엔드가 http://127.0.0.1:8787 에서 떠 있어야 함.
 */
const BASE = process.env.API_BASE_URL || 'http://127.0.0.1:8787'

async function test(name, fn) {
  try {
    await fn()
    console.log(`✅ ${name}`)
  } catch (e) {
    console.log(`❌ ${name}:`, e.message || e)
  }
}

async function main() {
  console.log('API Base:', BASE)
  console.log('')

  await test('GET /api/health', async () => {
    const res = await fetch(`${BASE}/api/health`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(`status ${res.status}`)
    if (!data?.ok) throw new Error('ok not true')
  })

  await test('GET /api/lostark/characters/:name (캐릭터 검색)', async () => {
    const name = encodeURIComponent('테스트')
    const res = await fetch(`${BASE}/api/lostark/characters/${name}`)
    const data = await res.json().catch(() => ({}))
    if (res.status === 500 && data?.message?.includes('LOSTARK_API_TOKEN')) {
      console.log('   → LOSTARK_API_TOKEN이 .dev.vars에 설정되어 있는지 확인')
      return
    }
    if (res.status === 504) {
      console.log('   → 로스트아크 API 응답 지연/타임아웃. 토큰·네트워크 확인')
      return
    }
    if (!res.ok) throw new Error(data?.error || data?.message || `status ${res.status}`)
    if (!Array.isArray(data?.data) && data?.data !== undefined) throw new Error('data is not array')
  })

  console.log('')
  console.log('끝. 문제가 있으면 백엔드 터미널 로그와 .dev.vars(LOSTARK_API_TOKEN) 확인.')
}

main()
