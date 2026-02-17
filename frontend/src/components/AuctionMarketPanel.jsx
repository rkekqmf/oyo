import { useEffect, useMemo, useState } from 'react'
import { fetchMarketHistory, fetchMarketStatus } from '../services/lostarkApi'

const DAY_OPTIONS = [30, 90, 365]

function toNumber(value) {
  const parsed = Number.parseFloat(String(value ?? '0'))
  return Number.isFinite(parsed) ? parsed : 0
}

function buildPolylinePoints(data, width, height, padding) {
  if (!data.length) return ''
  const values = data.map((item) => toNumber(item.avg_price))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  return data
    .map((item, index) => {
      const x =
        padding +
        (index / Math.max(data.length - 1, 1)) * (width - padding * 2)
      const y =
        height -
        padding -
        ((toNumber(item.avg_price) - min) / range) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(' ')
}

function formatDate(isoString) {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function AuctionMarketPanel() {
  const [itemName, setItemName] = useState('정제된 파괴강석')
  const [days, setDays] = useState(30)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [metric, setMetric] = useState('price')
  const [status, setStatus] = useState(null)
  const [statusLoading, setStatusLoading] = useState(false)

  const latest = history.length ? history[history.length - 1] : null
  const chartPoints = useMemo(
    () =>
      buildPolylinePoints(
        history.map((item) => ({
          ...item,
          avg_price: metric === 'price' ? item.avg_price : item.trade_volume,
        })),
        780,
        260,
        24
      ),
    [history, metric]
  )

  const loadStatus = async () => {
    setStatusLoading(true)
    try {
      const data = await fetchMarketStatus()
      setStatus(data)
    } catch {
      // Keep current status if polling fails.
    } finally {
      setStatusLoading(false)
    }
  }

  useEffect(() => {
    void loadStatus()
    const timer = setInterval(() => {
      void loadStatus()
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const handleFetchHistory = async () => {
    const target = itemName.trim()
    if (!target) {
      setError('아이템명을 입력해주세요.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const payload = await fetchMarketHistory(target, days)
      setHistory(Array.isArray(payload.data) ? payload.data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '히스토리 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="market-section">
      <header className="market-header">
        <h2>경매장 가격 추이</h2>
        <p>아이템 가격 스냅샷을 저장하고 기간별 추이를 조회합니다.</p>
      </header>

      <div className="market-controls">
        <input
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="아이템명 입력"
          className="market-input"
        />
        <select
          value={days}
          onChange={(e) => setDays(Number.parseInt(e.target.value, 10))}
          className="market-select"
        >
          {DAY_OPTIONS.map((day) => (
            <option key={day} value={day}>
              최근 {day}일
            </option>
          ))}
        </select>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          className="market-select"
        >
          <option value="price">가격 추이</option>
          <option value="volume">거래량 추이</option>
        </select>
        <button
          type="button"
          className="market-button"
          onClick={handleFetchHistory}
          disabled={loading}
        >
          {loading ? '조회 중...' : '추이 조회'}
        </button>
      </div>

      {error && <p className="result-error">{error}</p>}

      <div className="market-summary">
        <span>
          최근 평균가: {latest ? Math.round(toNumber(latest.avg_price)).toLocaleString() : '-'}
        </span>
        <span>
          최근 최저가: {latest ? Math.round(toNumber(latest.min_price)).toLocaleString() : '-'}
        </span>
        <span>
          최근 거래량: {latest ? Math.round(toNumber(latest.trade_volume)).toLocaleString() : '-'}
        </span>
        <span>데이터 수: {history.length}</span>
      </div>

      <div className="market-live-status">
        <div className="market-live-header">
          <strong>자동 수집 현황</strong>
          <span>{statusLoading ? '갱신 중...' : '1분마다 자동 갱신'}</span>
        </div>
        <p className="market-live-total">
          총 스냅샷 수: {status?.totalCount ?? 0}
        </p>
        <div className="market-live-grid">
          {(status?.latestByItem || []).map((row) => (
            <article key={`${row.item_name}-${row.captured_at}`} className="market-live-card">
              <h4>{row.item_name}</h4>
              <p>평균가: {Math.round(toNumber(row.avg_price)).toLocaleString()}</p>
              <p>최저가: {Math.round(toNumber(row.min_price)).toLocaleString()}</p>
              <p>거래량: {Math.round(toNumber(row.trade_volume)).toLocaleString()}</p>
              <p>최근 수집: {formatDate(row.captured_at)}</p>
            </article>
          ))}
        </div>
      </div>

      {!history.length ? (
        <p className="result-empty">
          아직 저장된 데이터가 없습니다. 자동 수집이 시작되면 값이 누적됩니다.
        </p>
      ) : (
        <div className="market-chart-wrap">
          <svg viewBox="0 0 780 260" className="market-chart">
            <polyline
              fill="none"
              stroke="#2563eb"
              strokeWidth="3"
              points={chartPoints}
            />
          </svg>
          <div className="market-axis-labels">
            <span>{formatDate(history[0]?.captured_at)}</span>
            <span>{formatDate(history[history.length - 1]?.captured_at)}</span>
          </div>
        </div>
      )}
    </section>
  )
}
