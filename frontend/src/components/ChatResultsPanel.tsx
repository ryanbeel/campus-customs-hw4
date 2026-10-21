import { Link } from 'react-router-dom'
import { formatPrice } from '../api'
import { useChatResults } from '../chatResults'

/** "Bulldog's picks": product cards from a chat search, shown at the top of the page. */
export default function ChatResultsPanel() {
  const { results, collapsed, setCollapsed, loadingMore, chatOpen, loadMore, surprise, clearResults } = useChatResults()
  if (!results) return null
  const isSurprise = results.kind === 'surprise'

  if (collapsed) {
    return (
      <div className="chat-results-bar">
        <button onClick={() => setCollapsed(false)}>
          {isSurprise ? '🎁 Back to your surprise picks' : <>🐶 Back to Bulldog's picks: <strong>{results.label}</strong> ({results.products.length} of {results.total})</>}
        </button>
        <button className="chat-results-close" onClick={clearResults} aria-label="Close results">×</button>
      </div>
    )
  }

  const shown = results.products.length
  const remaining = results.total - shown

  return (
    <section
      className={'chat-results' + (chatOpen ? ' with-chat' : '') + (isSurprise ? ' surprise' : '')}
      aria-live="polite"
      key={isSurprise ? results.products.map((p) => p.product_id).join('|') : `${results.query}|${results.min_price}|${results.max_price}|${results.size}`}
    >
      <div className="chat-results-inner">
        <div className="chat-results-head">
          <div>
            {isSurprise ? (
              <>
                <p className="eyebrow">🎁 Surprise me</p>
                <h2>5 random picks, 5 different styles</h2>
                <p className="muted small">Not sure what you want? Start here, or shuffle for a new mix.</p>
              </>
            ) : (
              <>
                <p className="eyebrow">🐶 Bulldog's picks</p>
                <h2>{results.label}</h2>
                <p className="muted small">Showing {shown} of {results.total} matches</p>
              </>
            )}
          </div>
          <button className="chat-results-close" onClick={clearResults} aria-label="Close results">×</button>
        </div>

        <div className="chat-results-grid">
          {results.products.map((p, i) => (
            <Link
              key={p.product_id}
              to={`/products/${p.product_id}`}
              className="result-card"
              onClick={() => setCollapsed(true)}
              style={{ animationDelay: `${(i % results.limit) * 70}ms` }}
            >
              <div className="result-card-img">
                <img src={p.image_url} alt={p.name} loading="lazy" />
              </div>
              <div className="result-card-body">
                <span className="result-type">{isSurprise && p.category ? p.category : p.garment_type}</span>
                <h3>{p.name}</h3>
                <p className="price">{formatPrice(p.price)}</p>
                <p className="result-desc">{p.short_description}</p>
                <p className="result-sizes">
                  {p.sizes_in_stock.length ? `Sizes: ${p.sizes_in_stock.join(' · ')}` : 'Sold out'}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {isSurprise && (
          <div className="chat-results-more">
            <button className="btn btn-primary" onClick={surprise} disabled={loadingMore}>
              {loadingMore ? 'Shuffling…' : '🔀 Shuffle again'}
            </button>
          </div>
        )}

        {results.has_more && (
          <div className="chat-results-more">
            <button className="btn btn-primary" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Fetching…' : `See more (${remaining} more)`}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
