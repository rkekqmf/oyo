/**
 * 로펙 점수 보정식 피팅 (일반화 모델)
 *
 * 모델:
 * score = c0 + c1*raw + c2*gem + c3*itemLevel + c4*(raw*itemLevel)
 *
 * 실행:
 * node scripts/fit-lopec.mjs
 */
import { getRawPowerAndGemAvg } from '../src/utils/combatPower.js'

const API_BASE = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8787'

const ANCHORS = [
  { name: '천우희', target: 8246.01 },
  { name: '청염각', target: 5055.78 },
  { name: '쫀지', target: 6677.54 },
  { name: '미인슉의개', target: 3227.53 },
  { name: '미인슉', target: 4103.04 },
  { name: '갈춘식', target: 5502.24 },
  { name: '케어쩜요', target: 3823.86 },
  { name: '염째봇', target: 1090.2 },
  { name: '무관이순신', target: 5721.61 },
  { name: '갱쥰', target: 4853.93 },
  { name: '핸떠기', target: 6088.92 },
  { name: '도레미랑', target: 3383.91 },
  { name: '쥐지잇', target: 3450.85 },
]

function transpose(A) {
  return A[0].map((_, col) => A.map((row) => row[col]))
}

function matMul(A, B) {
  const rows = A.length
  const mid = A[0].length
  const cols = B[0].length
  const C = Array.from({ length: rows }, () => Array(cols).fill(0))
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      for (let k = 0; k < mid; k++) C[i][j] += A[i][k] * B[k][j]
    }
  }
  return C
}

function inverse(M) {
  const n = M.length
  const A = M.map((row) => [...row])
  const I = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  )

  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(A[row][col]) > Math.abs(A[pivot][col])) pivot = row
    }
    if (Math.abs(A[pivot][col]) < 1e-12) throw new Error('singular matrix')

    ;[A[col], A[pivot]] = [A[pivot], A[col]]
    ;[I[col], I[pivot]] = [I[pivot], I[col]]

    const scale = A[col][col]
    for (let j = 0; j < n; j++) {
      A[col][j] /= scale
      I[col][j] /= scale
    }
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = A[row][col]
      for (let j = 0; j < n; j++) {
        A[row][j] -= factor * A[col][j]
        I[row][j] -= factor * I[col][j]
      }
    }
  }
  return I
}

function fitLeastSquares(X, y) {
  const Xt = transpose(X)
  const XtX = matMul(Xt, X)
  const Xty = matMul(Xt, y.map((v) => [v]))
  return matMul(inverse(XtX), Xty).map((row) => row[0])
}

function predict(coeffs, row) {
  return row.reduce((sum, value, idx) => sum + value * coeffs[idx], 0)
}

async function main() {
  const rows = []

  for (const { name, target } of ANCHORS) {
    const res = await fetch(`${API_BASE}/api/lostark/armories/${encodeURIComponent(name)}`)
    const json = await res.json()
    if (!json?.ok || !json?.data) {
      console.error(name, 'fetch failed', json?.message || res.status)
      continue
    }
    const armory = json.data
    const character = {
      CharacterName: name,
      CharacterClassName: armory?.profile?.CharacterClassName,
      ItemAvgLevel: armory?.profile?.ItemAvgLevel,
    }
    const { powerRaw, gemAverageLevel, itemLevel } = getRawPowerAndGemAvg({ character, armory })
    rows.push({ name, target, raw: powerRaw, gem: gemAverageLevel, itemLevel })
  }

  const X = rows.map((r) => [1, r.raw, r.gem, r.itemLevel, r.raw * r.itemLevel])
  const y = rows.map((r) => r.target)
  const coeffs = fitLeastSquares(X, y)
  const [c0, c1, c2, c3, c4] = coeffs

  console.log('score = c0 + c1*raw + c2*gem + c3*itemLevel + c4*(raw*itemLevel)')
  console.log('c0', c0)
  console.log('c1', c1)
  console.log('c2', c2)
  console.log('c3', c3)
  console.log('c4', c4)

  const errors = rows.map((r, idx) => predict(coeffs, X[idx]) - r.target)
  const rmse = Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / errors.length)
  const mae = errors.reduce((sum, e) => sum + Math.abs(e), 0) / errors.length

  console.log('')
  console.log('anchor predictions:')
  rows.forEach((r, idx) => {
    const p = predict(coeffs, X[idx])
    const e = p - r.target
    console.log(`${r.name}\ttarget=${r.target.toFixed(2)}\tpred=${p.toFixed(2)}\terr=${e.toFixed(2)}`)
  })
  console.log('')
  console.log(`train RMSE=${rmse.toFixed(2)} MAE=${mae.toFixed(2)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
