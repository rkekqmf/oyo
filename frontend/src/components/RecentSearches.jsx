import { Button } from './ui/button'

export function RecentSearches({ items, onSelect, onClear }) {
  if (!items.length) {
    return null
  }

  return (
    <section className="recent-searches">
      <div className="recent-searches-header">
        <strong>최근 검색</strong>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="recent-clear-button"
          onClick={onClear}
        >
          전체 삭제
        </Button>
      </div>
      <div className="recent-searches-list">
        {items.map((item) => (
          <Button
            key={item}
            type="button"
            variant="secondary"
            size="sm"
            className="recent-item-button"
            onClick={() => onSelect(item)}
          >
            {item}
          </Button>
        ))}
      </div>
    </section>
  )
}
