import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { EfficiencyRemote } from './EfficiencyRemote'
import { fetchMarketRecentMulti, fetchMarketRawMulti } from '../services/lostarkApi'
import {
  REFINEMENT_REMOTE_ITEMS_WEAPON,
  REFINEMENT_REMOTE_ITEMS_ARMOR,
  ADVANCED_REFINEMENT_REMOTE_ITEMS_WEAPON,
  ADVANCED_REFINEMENT_REMOTE_ITEMS_ARMOR,
  REFINEMENT_AUXILIARY_WEAPON,
  REFINEMENT_AUXILIARY_ARMOR,
  SHOP_EFFICIENCY_REMOTE_ITEMS,
  EXCHANGE_EFFICIENCY_REMOTE_ITEMS,
} from '../constants/efficiencyRemoteItems'

function getItemsForSub(activeTab, activeSub) {
  if (activeTab === 'refinement') return activeSub === '방어구' ? REFINEMENT_REMOTE_ITEMS_ARMOR : REFINEMENT_REMOTE_ITEMS_WEAPON
  if (activeTab === 'advanced') return activeSub === '방어구' ? ADVANCED_REFINEMENT_REMOTE_ITEMS_ARMOR : ADVANCED_REFINEMENT_REMOTE_ITEMS_WEAPON
  return null
}

function getBundleLabel(unitsPerPack) {
  const n = Number(unitsPerPack)
  if (n === 1000) return '소'
  if (n === 2000) return '중'
  if (n === 3000) return '대'
  return null
}

const EFFICIENCY_TABS = [
  { id: 'refinement', label: '일반 재련', sub: ['무기', '방어구', '요약표'] },
  { id: 'advanced', label: '상급 재련', sub: ['무기', '방어구'] },
  { id: 'raid', label: '레이드효율', sub: [], items: [] },
  { id: 'bloodstone', label: '혈석 상점 효율', sub: [], items: SHOP_EFFICIENCY_REMOTE_ITEMS },
  { id: 'single', label: '싱글 상점 효율', sub: [], items: SHOP_EFFICIENCY_REMOTE_ITEMS },
  { id: 'exchange', label: '재료 교환 효율', sub: [], items: EXCHANGE_EFFICIENCY_REMOTE_ITEMS },
  { id: 'pay', label: '과금효율', sub: [], items: [] },
  { id: 'hell', label: '지옥효율', sub: [], items: [] },
]

export function RevenueEfficiencyPanel() {
  const [activeTab, setActiveTab] = useState('refinement')
  const [activeSub, setActiveSub] = useState('무기')
  const [checkedIds, setCheckedIds] = useState(() => new Set())
  const [prices, setPrices] = useState({})
  const [priceDetails, setPriceDetails] = useState({})
  const [rawGameApiList, setRawGameApiList] = useState([]) // 게임 API 원본 전체 (가공 없음)
  const [rawGameApiLoading, setRawGameApiLoading] = useState(false)
  const [priceLoadedAt, setPriceLoadedAt] = useState(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceError, setPriceError] = useState('')

  const tabConfig = EFFICIENCY_TABS.find((t) => t.id === activeTab) || EFFICIENCY_TABS[0]

  useEffect(() => {
    if (tabConfig.sub.length > 0 && !tabConfig.sub.includes(activeSub)) {
      setActiveSub(tabConfig.sub[0])
    }
  }, [activeTab, tabConfig.sub, activeSub])


  const auxiliaryItemsForSub = (activeTab === 'refinement' || activeTab === 'advanced') && (activeSub === '무기' || activeSub === '방어구')
    ? (activeSub === '무기' ? REFINEMENT_AUXILIARY_WEAPON : REFINEMENT_AUXILIARY_ARMOR)
    : []

  const itemsForSub = getItemsForSub(activeTab, activeSub) ?? tabConfig.items ?? []
  /** 순서: 파편·돌파석·융화 → 파괴석/수호석·숨결·책 → 실링·골드(항상 최하위) */
  const REMOTE_TOP_IDS = ['shard', 'leapstone', 'fusion']
  const REMOTE_BOTTOM_IDS = ['silver', 'gold']
  const remoteTop = REMOTE_TOP_IDS.map((id) => itemsForSub.find((i) => i.id === id)).filter(Boolean)
  const remoteMiddle = [...itemsForSub.filter((i) => !REMOTE_TOP_IDS.includes(i.id) && !REMOTE_BOTTOM_IDS.includes(i.id)), ...auxiliaryItemsForSub]
  const remoteBottom = REMOTE_BOTTOM_IDS.map((id) => itemsForSub.find((i) => i.id === id)).filter(Boolean)
  const remoteItems = [...remoteTop, ...remoteMiddle, ...remoteBottom]

  /** 탭 진입 시 한 번만 호출. 무기+방어구+보조 전체 시세를 가져와 보관. 서브탭(무기/방어구) 전환 시에는 재호출 안 함. */
  const fetchPrices = useCallback(() => {
    const config = EFFICIENCY_TABS.find((t) => t.id === activeTab)
    let allWithMarket = []
    if (activeTab === 'refinement') {
      allWithMarket = [
        ...REFINEMENT_REMOTE_ITEMS_WEAPON,
        ...REFINEMENT_REMOTE_ITEMS_ARMOR,
        ...REFINEMENT_AUXILIARY_WEAPON,
        ...REFINEMENT_AUXILIARY_ARMOR,
      ].filter((item) => item.marketItemName)
    } else if (activeTab === 'advanced') {
      allWithMarket = [
        ...ADVANCED_REFINEMENT_REMOTE_ITEMS_WEAPON,
        ...ADVANCED_REFINEMENT_REMOTE_ITEMS_ARMOR,
        ...REFINEMENT_AUXILIARY_WEAPON,
        ...REFINEMENT_AUXILIARY_ARMOR,
      ].filter((item) => item.marketItemName)
    } else {
      allWithMarket = (config?.items ?? []).filter((item) => item.marketItemName)
    }
    if (allWithMarket.length === 0) {
      setPrices({})
      setPriceDetails({})
      setPriceLoadedAt(null)
      setPriceError('')
      return () => {}
    }
    const itemNames = [...new Set(allWithMarket.map((item) => item.marketItemName))]
    let cancelled = false
    setPriceLoading(true)
    setPriceError('')
    fetchMarketRecentMulti(itemNames)
      .then((dataList) => {
        if (cancelled) return
        const nextPrices = {}
        const nextDetails = {}
        let lastCaptured = null
        const byItemName = {}
        for (const d of dataList || []) {
          const name = d?.itemName ?? d?.item_name
          if (name) byItemName[name] = d
        }
        allWithMarket.forEach((item) => {
          const d = byItemName[item.marketItemName]
          const recent = Number(d?.recentPrice) || 0
          const bundleCount = Number(d?.bundleCount) || 1
          const unitsPerPack = Number(d?.unitsPerPack) || bundleCount
          const unitRecentPrice = Number(d?.unitRecentPrice) || 0
          const captured = d?.capturedAt ?? d?.captured_at ?? null
          nextPrices[item.id] = unitRecentPrice
          nextDetails[item.id] = {
            recentPrice: recent,
            bundleCount,
            unitsPerPack,
            unitRecentPrice,
            icon: d?.icon || null,
            capturedAt: captured,
            itemName: item.marketItemName,
          }
          if (captured) lastCaptured = captured
        })
        setPrices(nextPrices)
        setPriceDetails(nextDetails)
        setPriceLoadedAt(lastCaptured || null)
        setPriceError('')
      })
      .catch((e) => {
        if (!cancelled) setPriceError(e?.message || '시세 조회 실패')
      })
      .finally(() => {
        if (!cancelled) setPriceLoading(false)
      })
    return () => { cancelled = true }
  }, [activeTab])

  useEffect(() => {
    const cleanup = fetchPrices()
    return () => { if (cleanup) cleanup() }
  }, [fetchPrices])

  const fetchRawGameApiAll = useCallback(async () => {
    const config = EFFICIENCY_TABS.find((t) => t.id === activeTab)
    const items = config?.items || []
    const itemNames = [...new Set(items.filter((i) => i.marketItemName).map((i) => i.marketItemName))]
    if (!itemNames.length) return
    setRawGameApiLoading(true)
    setRawGameApiList([])
    try {
      const list = await fetchMarketRawMulti(itemNames)
      setRawGameApiList(Array.isArray(list) ? list : [])
    } catch (e) {
      setRawGameApiList([{ itemName: '', data: null, source: '', error: e?.message }])
    } finally {
      setRawGameApiLoading(false)
    }
  }, [activeTab])

  const handleCheckedChange = useCallback((id, checked) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  return (
    <div className="efficiency-layout">
      <div className="efficiency-main">
        <Card className="oyo-panel">
          <CardHeader>
            <CardTitle>효율</CardTitle>
            <CardDescription>
              레이드·재련·상점·교환·과금·지옥 등 효율을 계산합니다. 거래소 시세를 조회해 비용을 반영합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="efficiency-tabs-list">
                {EFFICIENCY_TABS.map((t) => (
                  <TabsTrigger key={t.id} value={t.id}>
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {EFFICIENCY_TABS.map((t) => (
                <TabsContent key={t.id} value={t.id}>
                  {t.sub.length > 0 ? (
                    <>
                      <div className="efficiency-sub-tabs">
                        {t.sub.map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={`efficiency-sub-trigger ${activeSub === s ? 'is-active' : ''}`}
                            onClick={() => setActiveSub(s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <EfficiencyContent
                        type={t.id}
                        sub={activeSub}
                        checkedIds={checkedIds}
                        items={itemsForSub}
                        auxiliaryItems={auxiliaryItemsForSub}
                        prices={prices}
                        priceDetails={priceDetails}
                        rawGameApiList={rawGameApiList}
                        rawGameApiLoading={rawGameApiLoading}
                        onFetchRawGameApiAll={fetchRawGameApiAll}
                        priceLoadedAt={priceLoadedAt}
                        priceLoading={priceLoading}
                        priceError={priceError}
                        onRefreshPrices={fetchPrices}
                      />
                    </>
                  ) : (
                    <EfficiencyContent
                      type={t.id}
                      sub={null}
                      checkedIds={checkedIds}
                      items={tabConfig.items ?? []}
                      auxiliaryItems={[]}
                      prices={prices}
                      priceDetails={priceDetails}
                      rawGameApiList={rawGameApiList}
                      rawGameApiLoading={rawGameApiLoading}
                      onFetchRawGameApiAll={fetchRawGameApiAll}
                      priceLoadedAt={priceLoadedAt}
                      priceLoading={priceLoading}
                      priceError={priceError}
                      onRefreshPrices={fetchPrices}
                    />
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <aside className="efficiency-aside">
        <EfficiencyRemote
          items={remoteItems}
          priceDetails={priceDetails}
          checkedIds={checkedIds}
          onCheckedChange={handleCheckedChange}
          onRefreshPrices={fetchPrices}
          priceLoading={priceLoading}
          showRefresh={activeTab === 'refinement' || activeTab === 'advanced' || (tabConfig.items ?? []).some((i) => i.marketItemName)}
        />
      </aside>
    </div>
  )
}

function formatPriceTime(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}. ${d.getHours() >= 12 ? '오후' : '오전'} ${d.getHours() % 12 || 12}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function EfficiencyContent({
  type,
  sub,
  checkedIds,
  items = [],
  auxiliaryItems = [],
  prices = {},
  priceDetails = {},
  rawGameApiList = [],
  rawGameApiLoading = false,
  onFetchRawGameApiAll,
  priceLoadedAt,
  priceLoading,
  priceError,
  onRefreshPrices,
}) {
  const label = sub ? `${type} (${sub})` : type
  const hasMarketItems = items.some((item) => item.marketItemName) || auxiliaryItems.length > 0
  const totalCost = items.reduce((sum, item) => {
    if (checkedIds.has(item.id)) return sum
    if (item.id === 'gold') return sum + (item.defaultQuantity ?? 1620)
    const price = prices[item.id] ?? 0
    const qty = item.defaultQuantity ?? 0
    return sum + price * qty
  }, 0)
  const detailsList = items.filter((item) => item.marketItemName).map((item) => ({
    id: item.id,
    label: item.label,
    itemName: item.marketItemName,
    ...priceDetails[item.id],
  }))
  const [breathItem, bookItem] = auxiliaryItems.length >= 2 ? [auxiliaryItems[0], auxiliaryItems[1]] : [null, null]
  const costBreathOnly = breathItem && !checkedIds.has(breathItem.id) ? (prices[breathItem.id] ?? 0) * (breathItem.defaultQuantity ?? 0) : 0
  const costBookOnly = bookItem && !checkedIds.has(bookItem.id) ? (prices[bookItem.id] ?? 0) * (bookItem.defaultQuantity ?? 0) : 0
  const costBoth = costBreathOnly + costBookOnly
  const deltaBreath = breathItem?.successRateDelta ?? 0
  const deltaBook = bookItem?.successRateDelta ?? 0
  const costPer1PctBreath = deltaBreath > 0 ? costBreathOnly / deltaBreath : null
  const costPer1PctBook = deltaBook > 0 ? costBookOnly / deltaBook : null
  const costPer1PctBoth = (deltaBreath + deltaBook) > 0 ? costBoth / (deltaBreath + deltaBook) : null

  return (
    <div className="efficiency-content">
      <p className="efficiency-content-desc">
        {type === 'refinement' && (
          <>
            목표 재련 수치별 필요 재료와 1회 시도 비용을 계산합니다. 보조 재료 사용 시 성공률·비용 변화를 확인할 수
            있습니다. 오른쪽에서 보유 재료를 누르면 해당 항목은 0골드로 반영됩니다.
          </>
        )}
        {type === 'advanced' && '상급 재련(무기/방어구) 효율 계산. 거래소 시세 조회 후 반영됩니다.'}
        {type === 'raid' && '레이드별 골드·보상 대비 효율을 계산합니다. (준비 중)'}
        {type === 'bloodstone' && '혈석 상점 교환 효율을 계산합니다.'}
        {type === 'single' && '싱글 상점 효율을 계산합니다.'}
        {type === 'exchange' && '재료 교환 효율을 계산합니다.'}
        {type === 'pay' && '과금 대비 효율을 계산합니다. (준비 중)'}
        {type === 'hell' && '지옥 던전 효율을 계산합니다. (준비 중)'}
      </p>
      <div className="efficiency-placeholder">
        <span className="efficiency-placeholder-label">{label}</span>
        <p className="efficiency-price-meta">
          시세 기준 시각: {priceLoading ? '조회 중…' : formatPriceTime(priceLoadedAt)}
        </p>
        {priceError && <p className="efficiency-price-error">{priceError}</p>}
        <p className="efficiency-total-cost">
          예상 비용 (시세 반영): <strong>{totalCost.toLocaleString()}</strong> 골드
        </p>
        <p className="text-muted">보유로 0골드 반영한 항목: {checkedIds.size}개</p>

        {/* 이미지 참고: 강화 시 재료 개수·비용 직관 표시 */}
        {items.length > 0 && (
          <div className="efficiency-cost-breakdown">
            <p className="efficiency-cost-breakdown-title">필수 재료 (1회 시도당)</p>
            <ul className="efficiency-cost-breakdown-list">
              {items
                .filter((item) => (item.defaultQuantity ?? 0) > 0 || item.id === 'gold')
                .map((item) => {
                  const detail = priceDetails[item.id] || {}
                  const price = prices[item.id] ?? 0
                  const qty = item.defaultQuantity ?? 0
                  const isGold = item.id === 'gold'
                  const goldAmount = item.defaultQuantity ?? 1620
                  const cost = isGold ? goldAmount : (checkedIds.has(item.id) ? 0 : price * qty)
                  return (
                    <li key={item.id} className="efficiency-cost-breakdown-row">
                      <span className="efficiency-cost-breakdown-name" title={item.label}>
                        {detail.icon ? (
                          <img src={detail.icon} alt={item.label} className="efficiency-cost-icon" />
                        ) : (
                          <span className="efficiency-cost-icon-fallback">
                            {item.label.slice(0, 1)}
                          </span>
                        )}
                      </span>
                      <span className="efficiency-cost-breakdown-meta">
                        {isGold ? (
                          <>고정 {Number(goldAmount).toLocaleString()} 골드</>
                        ) : (
                          <>
                            {Number(price).toLocaleString()}골 × {Number(qty).toLocaleString()}개
                          </>
                        )}
                      </span>
                      <span className="efficiency-cost-breakdown-value">
                        {cost.toLocaleString()} 골드
                      </span>
                    </li>
                  )
                })}
            </ul>
            {auxiliaryItems.length > 0 && (
              <>
                <p className="efficiency-cost-breakdown-title">보조 재료 (선택)</p>
                <ul className="efficiency-cost-breakdown-list">
                  {auxiliaryItems.map((item) => {
                    const detail = priceDetails[item.id] || {}
                    const price = prices[item.id] ?? 0
                    const qty = item.defaultQuantity ?? 0
                    const cost = price * qty
                    return (
                      <li key={item.id} className="efficiency-cost-breakdown-row">
                        <span className="efficiency-cost-breakdown-name" title={item.label}>
                          {detail.icon ? (
                            <img src={detail.icon} alt={item.label} className="efficiency-cost-icon" />
                          ) : (
                            <span className="efficiency-cost-icon-fallback">{item.label.slice(0, 1)}</span>
                          )}
                        </span>
                        <span className="efficiency-cost-breakdown-meta">
                          {Number(price).toLocaleString()}골 × {Number(qty).toLocaleString()}개
                        </span>
                        <span className="efficiency-cost-breakdown-value">
                          {cost.toLocaleString()} 골드
                        </span>
                      </li>
                    )
                  })}
                </ul>
                <p className="efficiency-cost-breakdown-title">보조재료 효율 (성공률 대비 비용)</p>
                <p className="efficiency-aux-desc">
                  숨결만 / 책만 / 둘 다 넣을 때 추가 비용과 성공률 증가. 1%당 비용이 낮을수록 효율 좋음.
                </p>
                <div className="efficiency-cost-summary-table efficiency-aux-table">
                  <div className="efficiency-cost-summary-row header">
                    <span>선택</span>
                    <span>추가 비용</span>
                    <span>성공률 증가</span>
                    <span>1%당 비용</span>
                  </div>
                  <div className="efficiency-cost-summary-row">
                    <span>안 넣음</span>
                    <span>0 골드</span>
                    <span>—</span>
                    <span>—</span>
                  </div>
                  {breathItem && (
                    <div className="efficiency-cost-summary-row">
                      <span>숨결만</span>
                      <span>{costBreathOnly.toLocaleString()} 골드</span>
                      <span>+{deltaBreath}%</span>
                      <span>{costPer1PctBreath != null ? `${Math.round(costPer1PctBreath).toLocaleString()}골` : '—'}</span>
                    </div>
                  )}
                  {bookItem && (
                    <div className="efficiency-cost-summary-row">
                      <span>책만</span>
                      <span>{costBookOnly.toLocaleString()} 골드</span>
                      <span>+{deltaBook}%</span>
                      <span>{costPer1PctBook != null ? `${Math.round(costPer1PctBook).toLocaleString()}골` : '—'}</span>
                    </div>
                  )}
                  {breathItem && bookItem && (
                    <div className="efficiency-cost-summary-row">
                      <span>둘 다</span>
                      <span>{costBoth.toLocaleString()} 골드</span>
                      <span>+{deltaBreath + deltaBook}%</span>
                      <span>{costPer1PctBoth != null ? `${Math.round(costPer1PctBoth).toLocaleString()}골` : '—'}</span>
                    </div>
                  )}
                </div>
              </>
            )}
            <p className="efficiency-cost-breakdown-title">1회 시도 비용 요약 (경험치 제외)</p>
            <div className="efficiency-cost-summary-table">
              <div className="efficiency-cost-summary-row header">
                <span>구분</span>
                <span>총 비용</span>
              </div>
              <div className="efficiency-cost-summary-row">
                <span>기본 (보조 재료 미사용)</span>
                <strong>{totalCost.toLocaleString()} 골드</strong>
              </div>
              {auxiliaryItems.length > 0 && (
                <>
                  {breathItem && (
                    <div className="efficiency-cost-summary-row">
                      <span>+ 숨결만</span>
                      <strong>{(totalCost + costBreathOnly).toLocaleString()} 골드</strong>
                    </div>
                  )}
                  {bookItem && (
                    <div className="efficiency-cost-summary-row">
                      <span>+ 책만</span>
                      <strong>{(totalCost + costBookOnly).toLocaleString()} 골드</strong>
                    </div>
                  )}
                  {breathItem && bookItem && (
                    <div className="efficiency-cost-summary-row">
                      <span>+ 둘 다</span>
                      <strong>{(totalCost + costBoth).toLocaleString()} 골드</strong>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {detailsList.length > 0 && (
          <div className="efficiency-price-debug">
            <p className="efficiency-price-debug-title">실제 시세 (테스트) · 비용은 RecentPrice 환산 단가 사용</p>
            <p className="efficiency-price-debug-desc">
              RecentPrice가 묶음 가격이면 BundleCount로 나눠 1개 단가로 계산합니다.
            </p>
            <ul className="efficiency-price-debug-list">
              {detailsList.map(({ id, label: itemLabel, itemName, recentPrice = 0, unitsPerPack = 1, unitRecentPrice = 0, capturedAt }) => {
                const bundleLabel = getBundleLabel(unitsPerPack)
                return (
                  <li key={id}>
                    <span className="efficiency-price-debug-name">{itemLabel}</span>
                    <span className="efficiency-price-debug-value">
                      1개 단가 {Number(unitRecentPrice || 0).toLocaleString()}골
                      <span className="efficiency-price-debug-avg">
                        {' '}(Recent {Number(recentPrice || 0).toLocaleString()}
                        {Number(unitsPerPack) > 1 ? ` / ${Number(unitsPerPack).toLocaleString()}개` : ''})
                      </span>
                    </span>
                    {bundleLabel && (
                      <span className="efficiency-price-debug-bundle">묶음: {bundleLabel}</span>
                    )}
                    {capturedAt && (
                      <span className="efficiency-price-debug-time">{formatPriceTime(capturedAt)}</span>
                    )}
                  </li>
                )
              })}
            </ul>
            {items.some((i) => i.marketItemName) && (
              <>
                <p className="efficiency-price-debug-title">게임 API 원본 (가공 없음)</p>
                <p className="efficiency-price-debug-desc">
                  로아 API 응답을 그대로 반환. 백엔드에서 min/avg 계산 안 함.
                </p>
                <button
                  type="button"
                  className="efficiency-refresh-btn"
                  onClick={() => onFetchRawGameApiAll?.()}
                  disabled={rawGameApiLoading}
                >
                  {rawGameApiLoading ? '가져오는 중…' : '게임 API 원본 전체 가져오기'}
                </button>
                {rawGameApiList.length > 0 && (
                  <div className="efficiency-raw-list">
                    {rawGameApiList.map((entry, idx) => (
                      <div key={entry.itemName || idx} className="efficiency-raw-item">
                        <p className="efficiency-price-debug-title">
                          {entry.itemName || '(이름 없음)'}
                          {entry.source && ` · ${entry.source}`}
                        </p>
                        {entry.error && (
                          <p className="efficiency-price-error">{entry.error}</p>
                        )}
                        {entry.data != null && (
                          <pre className="efficiency-price-debug-raw">
                            {JSON.stringify(entry.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
