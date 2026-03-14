import { useEffect, useMemo, useState } from 'react'
import { fetchMarketHistory, fetchMarketStatus } from '../services/lostarkApi'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import { Input } from './ui/input'
import { Select } from './ui/select'

const DAY_OPTIONS = [7, 30, 90, 365]
const MANAGED_ITEMS_KEY = 'oyo-market-managed-items'
const DEFAULT_ITEMS = ['정제된 파괴강석', '파괴강석', '태양의 가호']

function toNumber(value) {
  const parsed = Number.parseFloat(String(value ?? '0'))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatDate(isoString) {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function AuctionMarketPanel() {
  const [itemName, setItemName] = useState('정제된 파괴강석')
  const [managedItems, setManagedItems] = useState(DEFAULT_ITEMS)
  const [newItemName, setNewItemName] = useState('')
  const [days, setDays] = useState(30)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [metric, setMetric] = useState('price')
  const [status, setStatus] = useState(null)
  const [statusLoading, setStatusLoading] = useState(false)

  const latest = history.length ? history[history.length - 1] : null
  const chartData = useMemo(
    () =>
      history.map((item) => ({
        ...item,
        dateLabel: formatDate(item.captured_at),
        metricValue:
          metric === 'price'
            ? toNumber(item.avg_price)
            : toNumber(item.trade_volume),
      })),
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
    try {
      const raw = localStorage.getItem(MANAGED_ITEMS_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const cleaned = parsed
          .filter((value) => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean)
        if (cleaned.length) {
          setManagedItems(cleaned)
          setItemName(cleaned[0])
        }
      }
    } catch {
      setManagedItems(DEFAULT_ITEMS)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(MANAGED_ITEMS_KEY, JSON.stringify(managedItems))
  }, [managedItems])

  useEffect(() => {
    void loadStatus()
    const timer = setInterval(() => {
      void loadStatus()
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const runFetchHistory = async (targetItemName) => {
    setError('')
    setLoading(true)
    try {
      const payload = await fetchMarketHistory(targetItemName, days)
      setHistory(Array.isArray(payload.data) ? payload.data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '히스토리 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleFetchHistory = async () => {
    const target = itemName.trim()
    if (!target) {
      setError('아이템명을 입력해주세요.')
      return
    }
    await runFetchHistory(target)
  }

  const handleSelectManagedItem = async (targetItemName) => {
    setItemName(targetItemName)
    await runFetchHistory(targetItemName)
  }

  const handleAddManagedItem = async () => {
    const target = newItemName.trim()
    if (!target) return
    if (managedItems.includes(target)) {
      setNewItemName('')
      await handleSelectManagedItem(target)
      return
    }
    setManagedItems((prev) => [target, ...prev])
    setNewItemName('')
    await handleSelectManagedItem(target)
  }

  const handleRemoveManagedItem = (targetItemName) => {
    setManagedItems((prev) => prev.filter((item) => item !== targetItemName))
    if (itemName === targetItemName) {
      setItemName('')
      setHistory([])
    }
  }

  return (
    <Card className="market-section">
      <CardHeader className="market-header">
        <CardTitle>경매장 가격 추이</CardTitle>
        <CardDescription>
          아이템 가격 스냅샷을 저장하고 기간별 추이를 조회합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>

      <div className="market-controls">
        <Input
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="아이템명 입력"
          className="market-input"
        />
        <Select
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          className="market-select"
        >
          <option value="price">가격 추이</option>
          <option value="volume">거래량 추이</option>
        </Select>
        <Button
          type="button"
          className="market-button"
          onClick={handleFetchHistory}
          disabled={loading}
        >
          {loading ? '조회 중...' : '추이 조회'}
        </Button>
      </div>
      <div className="market-day-filter">
        {DAY_OPTIONS.map((day) => (
          <Button
            key={day}
            type="button"
            size="sm"
            variant={days === day ? 'default' : 'secondary'}
            className="market-day-chip"
            onClick={() => setDays(day)}
          >
            최근 {day}일
          </Button>
        ))}
      </div>
      <div className="market-manage">
        <div className="market-manage-add">
          <Input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="아이템 추가"
            className="market-input"
          />
          <Button
            type="button"
            className="market-button secondary"
            onClick={handleAddManagedItem}
          >
            추가
          </Button>
        </div>
        <div className="market-item-chips">
          {managedItems.map((item) => (
            <div key={item} className="market-item-chip-wrap">
              <Button
                type="button"
                size="sm"
                variant={itemName === item ? 'default' : 'secondary'}
                className={
                  itemName === item
                    ? 'market-item-chip is-active'
                    : 'market-item-chip'
                }
                onClick={() => {
                  void handleSelectManagedItem(item)
                }}
              >
                {item}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="market-item-chip-remove"
                onClick={() => handleRemoveManagedItem(item)}
                aria-label={`${item} 삭제`}
              >
                x
              </Button>
            </div>
          ))}
        </div>
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
          <Badge variant="info">
            {statusLoading ? '갱신 중...' : '1분마다 자동 갱신'}
          </Badge>
        </div>
        <p className="market-live-total">
          총 스냅샷 수: {status?.totalCount ?? 0}
        </p>
        <div className="market-live-grid">
          {(status?.latestByItem || []).map((row) => (
            <article
              key={`${row.item_name}-${row.captured_at}`}
              className="market-live-card is-clickable"
              onClick={() => {
                void handleSelectManagedItem(row.item_name)
              }}
            >
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
          <div className="market-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={56} />
                <Tooltip
                  formatter={(value) => Number(value).toLocaleString()}
                  labelFormatter={(label) => `날짜: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="metricValue"
                  stroke="#15803d"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="market-axis-labels">
            <span>{formatDate(history[0]?.captured_at)}</span>
            <span>{formatDate(history[history.length - 1]?.captured_at)}</span>
          </div>
        </div>
      )}
      </CardContent>
    </Card>
  )
}
