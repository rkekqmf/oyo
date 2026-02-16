export function RecentSearches({ items, onSelect, onClear }) {
  if (!items.length) {
    return null
  }

  return (
    <section className="recent-searches">
      <div className="recent-searches-header">
        <strong>최근 검색</strong>
        <button type="button" className="recent-clear-button" onClick={onClear}>
          전체 삭제
        </button>
      </div>
      <div className="recent-searches-list">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            className="recent-item-button"
            onClick={() => onSelect(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </section>
  )
}
