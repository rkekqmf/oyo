import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export function SasageResult({ loading, warning, posts }) {
  return (
    <Card className="sasage-section">
      <CardHeader className="sasage-header">
        <CardTitle className="sasage-title">사사게 검색 (인벤)</CardTitle>
        {loading ? <span>조회 중...</span> : null}
      </CardHeader>

      <CardContent>
        {warning ? <p className="result-error">{warning}</p> : null}

        {!loading && !posts.length ? (
          <p className="result-empty">검색 결과가 없거나 수집되지 않았습니다.</p>
        ) : null}

        {!!posts.length && (
          <ul className="sasage-list">
            {posts.map((post) => (
              <li key={post.url} className="sasage-item">
                <a href={post.url} target="_blank" rel="noreferrer">
                  {post.title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
