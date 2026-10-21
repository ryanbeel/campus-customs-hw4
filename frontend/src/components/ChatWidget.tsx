import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  clearChatHistory,
  fetchChatHistory,
  fetchProduct,
  formatPrice,
  priceRangeLabel,
  sendChat,
  type ChatProductCard,
  type ChatTurn,
  type Comparison,
  type PriceRange,
  type PageContext,
  type SavedChatMessage,
  type SearchResults,
} from '../api'
import { useAuth } from '../auth'
import { BUBBLE_INTERVAL_MS, BUBBLE_VISIBLE_MS, nextBubble } from '../bubbles'
import { useChatResults } from '../chatResults'

interface ChatMessage extends ChatTurn {
  emoji?: string | null
  products?: ChatProductCard[]
  dogJoke?: string | null
  offerRestock?: boolean
  suggestLogin?: boolean
  matches?: SearchResults | null
  error?: boolean
  fromEarlierVisit?: boolean
  comparison?: Comparison | null
  askPriceRange?: boolean
  compareOffer?: { productId: string; name: string }
}

/** Seconds on one product page before the bot offers a comparison. */
const COMPARE_PROMPT_SECONDS = 15

const BUDGET_CHOICES = ['Under $40', '$40–$60', '$60–$80', '$80 and up', 'No limit']

function priceDiff(d: number): string {
  if (d === 0) return 'same price'
  return d < 0 ? `$${Math.abs(d).toFixed(0)} less` : `$${d.toFixed(0)} more`
}

const GUEST_WELCOME: ChatMessage = {
  role: 'assistant',
  emoji: '🐶',
  content: "Woof! I'm the Campus Customs Bulldog Assistant. Ask me about our gear, prices, or sizes!",
}

function memberWelcome(firstName: string, returning: boolean): ChatMessage {
  return {
    role: 'assistant',
    emoji: '🐶',
    content: returning
      ? `Welcome back, ${firstName}! Here's our chat from last time. Pick up right where you left off.`
      : `Woof! Hi ${firstName}, I'm the Bulldog Assistant. Our chats are saved to your account, so I'll remember them next time.`,
  }
}

function fromSaved(m: SavedChatMessage): ChatMessage {
  return {
    role: m.role,
    content: m.content,
    emoji: m.emoji,
    products: m.products,
    dogJoke: m.dog_joke,
    matches: m.matches,
    fromEarlierVisit: true,
  }
}

/** /products/<id> -> <id> */
function productIdFromPath(path: string): string | null {
  const match = path.match(/^\/products\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

export default function ChatWidget() {
  const { token, user } = useAuth()
  const { results, collapsed, loadingMore, showResults, loadMore, setChatOpen } = useChatResults()
  const location = useLocation()
  const [open, setOpenState] = useState(false)
  const setOpen = (next: boolean) => {
    setOpenState(next)
    setChatOpen(next)
  }
  const [messages, setMessages] = useState<ChatMessage[]>([GUEST_WELCOME])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [loginDismissed, setLoginDismissed] = useState(false)
  const [viewingName, setViewingName] = useState<string | null>(null)
  const [priceRange, setPriceRange] = useState<PriceRange | null>(null)
  const comparePrompted = useRef<Set<string>>(new Set())
  const [bubble, setBubble] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const productId = productIdFromPath(location.pathname)

  // Customer memory: load the saved chat when a shopper logs in; reset when they log out.
  useEffect(() => {
    if (!user || !token) {
      setMessages([GUEST_WELCOME])
      return
    }
    let cancelled = false
    fetchChatHistory(token)
      .then((h) => {
        if (cancelled) return
        const saved = h.messages.map(fromSaved)
        setMessages([memberWelcome(h.first_name, saved.length > 0), ...saved])
      })
      .catch(() => !cancelled && setMessages([memberWelcome(user.first_name, false)]))
    return () => { cancelled = true }
  }, [user, token])

  // Page context: show which product the bot can "see".
  useEffect(() => {
    setViewingName(null)
    if (!productId) return
    let cancelled = false
    fetchProduct(productId).then((p) => !cancelled && setViewingName(p.name)).catch(() => {})
    return () => { cancelled = true }
  }, [productId])

  // After 15 seconds on the same product page, the bot offers a comparison (once per product).
  useEffect(() => {
    if (!productId || !viewingName || comparePrompted.current.has(productId)) return
    const timer = window.setTimeout(() => {
      comparePrompted.current.add(productId)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          emoji: '🧐',
          content: `Still deciding on the ${viewingName}? I can compare it with 3 similar items, including price, so you can pick the best one. Want me to?`,
          compareOffer: { productId, name: viewingName },
        },
      ])
      setOpen(true)
    }, COMPARE_PROMPT_SECONDS * 1000)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, viewingName])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, thinking])

  // Every 30 seconds (while the chat is closed) the bulldog barks or tells a short joke.
  useEffect(() => {
    if (open) {
      setBubble(null)
      return
    }
    let hide: number | undefined
    const show = () => {
      setBubble((prev) => nextBubble(prev))
      hide = window.setTimeout(() => setBubble(null), BUBBLE_VISIBLE_MS)
    }
    const interval = window.setInterval(show, BUBBLE_INTERVAL_MS)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(hide)
    }
  }, [open])

  function currentPage(): PageContext {
    return {
      path: location.pathname,
      product_id: productId,
      search_label: results && !collapsed ? results.label : null,
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    await send(input)
  }

  async function send(raw: string) {
    const text = raw.trim()
    if (!text || thinking) return
    setInput('')

    // Guests: the browser keeps the history. Logged-in shoppers: the server loads it from the database.
    const history: ChatTurn[] = user
      ? []
      : messages
          .filter((m) => m !== GUEST_WELCOME && !m.error && !m.compareOffer)
          .map(({ role, content, dogJoke }) => ({ role, content, dog_joke: dogJoke ?? null }))

    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setThinking(true)
    try {
      const res = await sendChat(text, history, token, currentPage(), priceRange)
      setPriceRange(res.price_range)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          emoji: res.emoji,
          products: res.products,
          dogJoke: res.dog_joke,
          offerRestock: res.offer_restock_email,
          suggestLogin: res.suggest_login,
          matches: res.matches,
          comparison: res.comparison,
          askPriceRange: res.ask_price_range,
        },
      ])
      if (res.matches) showResults(res.matches)
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: (err as Error).message, emoji: '🐾', error: true },
      ])
    } finally {
      setThinking(false)
    }
  }

  async function handleClear() {
    if (!token || !window.confirm('Clear your saved chat history?')) return
    await clearChatHistory(token).catch(() => {})
    setMessages([memberWelcome(user?.first_name ?? 'there', false)])
  }

  const lastEarlier = messages.reduce((idx, m, i) => (m.fromEarlierVisit ? i : idx), -1)

  return (
    <div className="chat-root">
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Campus Customs chat">
          <div className="chat-header">
            <img src="/bulldog.svg" alt="Bulldog mascot" className="bulldog flip" />
            <div>
              <strong>Bulldog Assistant</strong>
              <span>
                {user ? `Chatting with ${user.first_name} · history saved` : 'Guest · chat not saved'}
              </span>
            </div>
            {user && (
              <button className="chat-clear" onClick={handleClear} title="Clear saved chat" aria-label="Clear saved chat">
                🗑
              </button>
            )}
            <button className="chat-close" aria-label="Close chat" onClick={() => setOpen(false)}>×</button>
          </div>
          {priceRange && (
            <div className="chat-budget">
              💲 Budget: <strong>{priceRangeLabel(priceRange)}</strong>
              <button onClick={() => setPriceRange(null)} aria-label="Clear budget" title="Clear budget">×</button>
            </div>
          )}
          {viewingName && (
            <div className="chat-viewing" title="The assistant knows which product you're looking at">
              👀 Looking at: <strong>{viewingName}</strong>
            </div>
          )}
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-row ${m.role}${m.fromEarlierVisit ? ' earlier' : ''}`}>
                <div className={`chat-msg ${m.role}${m.error ? ' error-msg' : ''}`}>
                  {m.emoji && <span className="chat-emoji" aria-hidden="true">{m.emoji}</span>}
                  {m.content}
                  {m.dogJoke && (
                    <div className="chat-joke"><span aria-hidden="true">😂</span> {m.dogJoke}</div>
                  )}
                </div>
                {m.products && m.products.length > 0 && (
                  <div className="chat-cards">
                    {m.products.map((p) => (
                      <Link key={p.product_id} to={`/products/${p.product_id}`} className="chat-card">
                        <img src={p.image_url} alt="" />
                        <div>
                          {p.sold_out_sizes.length > 0 && (
                            <span className="sold-out-pill">Sold out in {p.sold_out_sizes.join(', ')}</span>
                          )}
                          <strong>{p.name}</strong>
                          <span className="price">{formatPrice(p.price)}</span>
                          <span className="muted small">
                            {p.sizes_in_stock.length ? `In stock: ${p.sizes_in_stock.join(', ')}` : 'Sold out'}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {m.matches && (
                  <div className="chat-results-note">
                    <span>
                      🔎 <strong>{m.matches.label}</strong>: {m.matches.total} found
                      {results?.query === m.matches.query ? ', cards are on the page' : ''}
                    </span>
                    {results && results.query === m.matches.query && results.has_more ? (
                      <button onClick={() => { void loadMore(); window.scrollTo({ top: 0, behavior: 'smooth' }) }} disabled={loadingMore}>
                        {loadingMore ? 'Fetching…' : 'See more →'}
                      </button>
                    ) : results?.query !== m.matches.query ? (
                      <button onClick={() => showResults(m.matches!)}>Show on page</button>
                    ) : null}
                  </div>
                )}
                {m.comparison && (
                  <div className="chat-compare">
                    <div className="chat-compare-title">⚖️ {m.comparison.category} comparison</div>
                    {m.comparison.rows.map((r) => (
                      <Link key={r.product_id} to={`/products/${r.product_id}`} className={'chat-compare-row' + (r.is_viewed ? ' viewed' : '')}>
                        <img src={r.image_url} alt="" />
                        <div className="chat-compare-name">
                          <strong>{r.name}</strong>
                          <span className="muted small">
                            {r.sizes_in_stock.length ? r.sizes_in_stock.join(' · ') : 'Sold out'}
                          </span>
                        </div>
                        <div className="chat-compare-price">
                          <span className="price">{formatPrice(r.price)}</span>
                          <span className={'diff ' + (r.is_viewed ? 'viewing' : r.price_difference < 0 ? 'less' : r.price_difference > 0 ? 'more' : 'same')}>
                            {r.is_viewed ? 'viewing' : priceDiff(r.price_difference)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {m.compareOffer && i === messages.length - 1 && !thinking && (
                  <div className="quick-replies">
                    <button onClick={() => send(`Yes, compare the ${m.compareOffer!.name} I'm looking at with 3 similar products.`)}>
                      ⚖️ Yes, compare
                    </button>
                    <button onClick={() => setMessages((prev) => prev.map((x) => (x === m ? { ...x, compareOffer: undefined } : x)))}>
                      No thanks
                    </button>
                  </div>
                )}
                {m.askPriceRange && i === messages.length - 1 && !thinking && (
                  <div className="quick-replies">
                    {BUDGET_CHOICES.map((b) => (
                      <button key={b} onClick={() => send(b === 'No limit' ? 'No price limit.' : `My price range is ${b}.`)}>
                        {b}
                      </button>
                    ))}
                  </div>
                )}
                {m.offerRestock && i === messages.length - 1 && !thinking && (
                  <div className="quick-replies">
                    <button onClick={() => send("Yes, please email me when it's back in stock.")}>
                      📧 Yes, email me
                    </button>
                    <button onClick={() => send('No thanks.')}>No thanks</button>
                  </div>
                )}
                {m.suggestLogin && !user && !loginDismissed && (
                  <div className="quick-replies">
                    <Link to="/login" className="qr-link">🔑 Log in</Link>
                    <Link to="/create-account" className="qr-link">✨ Create account</Link>
                    <button onClick={() => setLoginDismissed(true)}>Maybe later</button>
                  </div>
                )}
                {i === lastEarlier && lastEarlier < messages.length - 1 && (
                  <div className="chat-divider"><span>Today</span></div>
                )}
              </div>
            ))}
            {thinking && (
              <div className="chat-row assistant">
                <div className="chat-msg assistant typing" aria-label="Bulldog Assistant is typing">
                  <span>🐾</span><span>🐾</span><span>🐾</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <form className="chat-input" onSubmit={handleSend}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={viewingName ? 'Ask about this item…' : 'Ask about a hoodie, size, or price…'}
              aria-label="Chat message"
              maxLength={2000}
            />
            <button type="submit" className="btn btn-primary" disabled={thinking}>Send</button>
          </form>
        </div>
      )}
      <button
        className="chat-launcher"
        aria-label={open ? 'Close chat' : 'Open chat'}
        onClick={() => setOpen(!open)}
      >
        <img src="/bulldog.svg" alt="" className={'bulldog flip' + (bubble ? ' talking' : '')} />
        {!open && !bubble && <span className="chat-bubble">{user ? `Hi ${user.first_name}! Need help?` : 'Need help?'}</span>}
      </button>
      {!open && bubble && (
        <button key={bubble} className="bark-bubble" onClick={() => setOpen(true)} aria-live="polite">
          {bubble}
        </button>
      )}
    </div>
  )
}
