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
    if (Math.abs(A[pivot][col]) < 1e-12) throw new Error('singular')
    ;[A[col], A[pivot]] = [A[pivot], A[col]]
    ;[I[col], I[pivot]] = [I[pivot], I[col]]
    const scale = A[col][col]
    for (let j = 0; j < n; j++) {
      A[col][j] /= scale
      I[col][j] /= scale
    }
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const f = A[row][col]
      for (let j = 0; j < n; j++) {
        A[row][j] -= f * A[col][j]
        I[row][j] -= f * I[col][j]
      }
    }
  }
  return I
}

function fitRidge(X, y, lambda) {
  const Xt = transpose(X)
  const XtX = matMul(Xt, X)
  const p = XtX.length
  for (let i = 1; i < p; i++) XtX[i][i] += lambda
  const Xty = matMul(Xt, y.map((v) => [v]))
  return matMul(inverse(XtX), Xty).map((row) => row[0])
}

function rmse(errors) {
  return Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / errors.length)
}

function mae(errors) {
  return errors.reduce((sum, e) => sum + Math.abs(e), 0) / errors.length
}

async function fetchRows() {
  const rows = []
  for (const { name, target } of ANCHORS) {
    const res = await fetch(`${API_BASE}/api/lostark/armories/${encodeURIComponent(name)}`)
    const json = await res.json()
    if (!json?.ok || !json?.data) continue
    const armory = json.data
    const character = {
      CharacterName: name,
      CharacterClassName: armory?.profile?.CharacterClassName,
      ItemAvgLevel: armory?.profile?.ItemAvgLevel,
    }
    const { powerRaw, gemAverageLevel, itemLevel } = getRawPowerAndGemAvg({ character, armory })
    rows.push({ name, target, r: powerRaw, g: gemAverageLevel, il: itemLevel })
  }
  return rows
}

function featuresFor(model, row) {
  const lnr = Math.log(Math.max(row.r, 1))
  switch (model) {
    case 'A':
      return [1, row.r, row.g, row.il]
    case 'B':
      return [1, row.r, row.g, row.il, row.r * row.il]
    case 'C':
      return [1, lnr, row.g, row.il]
    case 'D':
      return [1, lnr, row.g, row.il, row.g * row.il]
    case 'E':
      return [1, row.r, row.g, row.il, row.r * row.g]
    case 'F':
      return [1, row.r, row.g, row.il, row.r * row.il, row.g * row.il]
    case 'G':
      return [1, row.r, row.g, row.il, row.r * row.il, row.g * row.il, row.r * row.g]
    default:
      throw new Error(`unknown model ${model}`)
  }
}

function predict(beta, x) {
  return x.reduce((sum, value, idx) => sum + value * beta[idx], 0)
}

async function main() {
  const rows = await fetchRows()
  const models = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
  const lambdas = [0, 1e-6, 1e-4, 1e-2, 1, 10]

  console.log(`rows=${rows.length}`)
  for (const model of models) {
    for (const lambda of lambdas) {
      const X = rows.map((r) => featuresFor(model, r))
      const y = rows.map((r) => r.target)
      let beta
      try {
        beta = fitRidge(X, y, lambda)
      } catch {
        continue
      }
      const trainErr = rows.map((row) => predict(beta, featuresFor(model, row)) - row.target)
      const looErr = []
      for (let i = 0; i < rows.length; i++) {
        const trainRows = rows.filter((_, idx) => idx !== i)
        const Xi = trainRows.map((r) => featuresFor(model, r))
        const yi = trainRows.map((r) => r.target)
        let bi
        try {
          bi = fitRidge(Xi, yi, lambda)
        } catch {
          continue
        }
        looErr.push(predict(bi, featuresFor(model, rows[i])) - rows[i].target)
      }
      if (!looErr.length) continue
      console.log(
        `model=${model} lambda=${lambda} k=${X[0].length} train_rmse=${rmse(trainErr).toFixed(2)} train_mae=${mae(trainErr).toFixed(2)} loo_rmse=${rmse(looErr).toFixed(2)} loo_mae=${mae(looErr).toFixed(2)}`
      )
      console.log(`beta=${JSON.stringify(beta)}`)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
