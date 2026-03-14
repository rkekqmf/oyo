import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

function RemoteIconButton({ item, priceDetails, checkedIds, onToggle }) {
  const { id, label } = item
  const detail = priceDetails[id] || {}
  const icon = detail.icon
  const isChecked = checkedIds.has(id)
  return (
    <button
      type="button"
      className={`efficiency-remote-btn efficiency-remote-btn-icon ${isChecked ? 'is-checked' : ''}`}
      onClick={() => onToggle(id)}
      aria-pressed={isChecked}
      title={label}
    >
      {icon ? (
        <img src={icon} alt="" className="efficiency-remote-btn-img" />
      ) : (
        <span className="efficiency-remote-btn-fallback">{label.slice(0, 1)}</span>
      )}
      {isChecked && (
        <span className="efficiency-remote-check" aria-hidden>
          <span className="efficiency-remote-check-icon">✓</span>
        </span>
      )}
    </button>
  )
}

/**
 * 껨산기 스타일 리모컨: 아이콘 버튼 토글. 누르면 보유(0골드), 다시 누르면 시세 반영.
 * 새로고침(왼쪽) / 초기화(오른쪽). 아이템은 순서대로 3열 그리드.
 */
export function EfficiencyRemote({
  items = [],
  priceDetails = {},
  checkedIds = new Set(),
  onCheckedChange,
  onRefreshPrices,
  priceLoading = false,
  showRefresh = false,
}) {
  const handleReset = () => {
    items.forEach(({ id }) => onCheckedChange(id, false))
  }

  const handleToggle = (id) => {
    onCheckedChange(id, !checkedIds.has(id))
  }

  if (items.length === 0 && !showRefresh) {
    return (
      <Card className="efficiency-remote">
        <CardHeader>
          <CardTitle className="efficiency-remote-title">가격 조정</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted">이 탭에서는 조정할 항목이 없습니다.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="efficiency-remote">
      <CardHeader>
        <CardTitle className="efficiency-remote-title">가격 조정</CardTitle>
        <p className="efficiency-remote-desc">누르면 0골드(보유) 반영</p>
      </CardHeader>
      <CardContent>
        {items.length > 0 && (
          <div className="efficiency-remote-actions">
            {showRefresh && (
              <button
                type="button"
                className="efficiency-remote-refresh"
                onClick={onRefreshPrices}
                disabled={priceLoading}
              >
                {priceLoading ? '조회 중…' : '새로고침'}
              </button>
            )}
            <button type="button" onClick={handleReset} className="efficiency-remote-reset">
              초기화
            </button>
          </div>
        )}
        {items.length > 0 && (
          <div className="efficiency-remote-btns-wrap">
            <div className="efficiency-remote-btns efficiency-remote-btns-grid">
              {items.map((item) => (
                <RemoteIconButton
                  key={item.id}
                  item={item}
                  priceDetails={priceDetails}
                  checkedIds={checkedIds}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
