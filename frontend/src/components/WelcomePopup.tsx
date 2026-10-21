import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchProducts, formatPrice, type Product } from '../api'
import { siteToday, upcomingOccasions, type UpcomingOccasion } from '../occasions'
import { activePromotions } from '../promotions'
import CartoonBulldog from './CartoonBulldog'

const SEEN_KEY = 'campus_customs_welcome_seen'

function alreadySeen(): boolean {
  if (new URLSearchParams(window.location.search).has('welcome')) return false // ?welcome forces it
  try { return sessionStorage.getItem(SEEN_KEY) === '1' } catch { return false }
}
function markSeen() {
  try { sessionStorage.setItem(SEEN_KEY, '1') } catch { /* ignore */ }
}

function whenText(u: UpcomingOccasion): string {
  if (u.daysAway === 0) return `${u.occasion.emoji} It's ${u.occasion.name} today!`
  if (u.daysAway === 1) return `${u.occasion.emoji} ${u.occasion.name} is tomorrow!`
  return `${u.occasion.emoji} Only ${u.daysAway} days until ${u.occasion.name}!`
}

/** Welcome pop-up shown on the first visit of a browser session. */
export default function WelcomePopup() {
  const [open, setOpen] = useState(() => !alreadySeen())
  const [products, setProducts] = useState<Product[]>([])
  const today = useMemo(siteToday, [])
  const upcoming = useMemo(() => upcomingOccasions(today), [today])
  const promos = useMemo(() => activePromotions(today), [today])
  const main = upcoming[0]
  const occasion = main?.occasion

  useEffect(() => {
    if (open) fetchProducts().then(setProducts).catch(() => setProducts([]))
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function close() {
    markSeen()
    setOpen(false)
  }

  if (!open) return null

  const picks = occasion
    ? products.filter((p) => p.total_stock > 0 && occasion.picks(p)).slice(0, 3)
    : []
  const theme = occasion?.theme ?? { from: '#00254a', to: '#0a4a8f', accent: '#ffd34e' }
  const flyers = occasion?.flyers ?? ['🐾', '💙', '🐾', '✨', '🐾']

  return (
    <div className="welcome-overlay" role="dialog" aria-modal="true" aria-labelledby="welcome-title" onClick={close}>
      <div
        className={'welcome-card' + (occasion ? ` occ-${occasion.id}` : '')}
        style={{ ['--w-from' as string]: theme.from, ['--w-to' as string]: theme.to, ['--w-accent' as string]: theme.accent } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="welcome-close" onClick={close} aria-label="Close welcome message">×</button>

        <div className="welcome-scene" aria-hidden="true">
          {occasion?.id === 'halloween' && <div className="welcome-moon" />}
          {flyers.map((f, i) => (
            <span key={i} className="welcome-flyer" style={{ top: `${10 + i * 14}%`, animationDelay: `${0.4 + i * 0.7}s` }}>{f}</span>
          ))}
          <div className="welcome-dog">
            <CartoonBulldog hat={occasion?.hat} title="" />
          </div>
          {occasion?.id === 'halloween' && (
            <svg className="welcome-pumpkin" viewBox="0 0 200 140">
              <ellipse cx="100" cy="80" rx="96" ry="58" fill="#ff7a1a" />
              <ellipse cx="60" cy="82" rx="36" ry="54" fill="#ff8f33" />
              <ellipse cx="140" cy="82" rx="36" ry="54" fill="#ff8f33" />
              <ellipse cx="100" cy="82" rx="30" ry="56" fill="#ff9d47" />
              <path d="M96 26 Q94 8 108 2" stroke="#3a6b1f" strokeWidth="10" fill="none" strokeLinecap="round" />
              <path d="M58 64 L76 50 L84 70 Z M142 64 L124 50 L116 70 Z" fill="#3b1300" />
              <path d="M56 96 Q100 132 144 96 L132 100 L122 92 L110 104 L100 94 L90 104 L78 92 L68 100 Z" fill="#3b1300" />
            </svg>
          )}
          {!occasion && <div className="welcome-sparkles">✨</div>}
        </div>

        <div className="welcome-body">
          <p className="welcome-eyebrow">🐾 Welcome to Campus Customs</p>
          <h2 id="welcome-title">{occasion ? occasion.headline : 'Woof! Welcome to Campus Customs!'}</h2>
          {main && <p className="welcome-countdown">{whenText(main)}</p>}
          <p>{occasion ? occasion.message : "New Haven's home for officially licensed Yale gear. Look around, and tap the bulldog in the corner if you need a paw."}</p>

          {promos.length > 0 && (
            <div className="welcome-specials">
              <h3>🏷️ Specials</h3>
              <ul>
                {promos.map((p) => (
                  <li key={p.title}><strong>{p.title}:</strong> {p.details} (through {p.ends})</li>
                ))}
              </ul>
            </div>
          )}

          {picks.length > 0 && (
            <div className="welcome-picks">
              <h3>{occasion!.picksLabel}</h3>
              <div className="welcome-picks-row">
                {picks.map((p) => (
                  <Link key={p.product_id} to={`/products/${p.product_id}`} className="welcome-pick" onClick={close}>
                    <img src={p.image_url} alt="" />
                    <span>{p.name}</span>
                    <strong>{formatPrice(p.price)}</strong>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {upcoming.length > 1 && (
            <p className="welcome-also">
              Also coming up: {upcoming.slice(1).map((u) => `${u.occasion.emoji} ${u.occasion.name} (${u.daysAway} days)`).join(' · ')}
            </p>
          )}

          <div className="welcome-actions">
            {occasion ? (
              <Link to={occasion.shopLink} className="btn welcome-cta" onClick={close}>Shop {occasion.name} picks →</Link>
            ) : (
              <Link to="/products" className="btn welcome-cta" onClick={close}>Start shopping →</Link>
            )}
            <button className="btn welcome-secondary" onClick={close}>Just browsing</button>
          </div>
        </div>
      </div>
    </div>
  )
}
