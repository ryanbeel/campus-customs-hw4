import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchProducts, type Product } from '../api'
import { CATEGORIES } from '../catalog'
import CartoonBulldog from '../components/CartoonBulldog'
import ProductCard from '../components/ProductCard'

export default function Home() {
  const [featured, setFeatured] = useState<Product[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [covers, setCovers] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchProducts()
      .then((all) => {
        setFeatured(all.filter((p) => p.total_stock > 0).slice(0, 8))
        const c: Record<string, number> = {}
        const img: Record<string, string> = {}
        for (const p of all) {
          if (!p.category) continue
          c[p.category] = (c[p.category] ?? 0) + 1
          if (!img[p.category] && p.total_stock > 0) img[p.category] = p.image_url
        }
        setCounts(c)
        setCovers(img)
      })
      .catch(() => setFeatured([]))
  }, [])

  return (
    <>
      <section className="hero hero-bulldog">
        <div className="hero-grid">
          <div className="hero-content">
            <p className="eyebrow">🐾 New Haven's home for Bulldog spirit</p>
            <h1>Wear your Yale pride, every day of the year.</h1>
            <p>
              From game-day tees to cozy quarter-zips, Campus Customs makes it easy to show your
              blue. Browse the collection, find your size, and ask our bulldog assistant if you
              need a paw.
            </p>
            <div className="hero-actions">
              <Link to="/products" className="btn btn-primary">Fetch your fit →</Link>
              <Link to="/about" className="btn btn-outline">Our story</Link>
            </div>
          </div>
          <div className="hero-mascot">
            <div className="hero-speech">Woof! Boola Boola! 🐾</div>
            <CartoonBulldog />
          </div>
        </div>
        <svg className="hero-wave" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 30 Q 360 70 720 30 T 1440 30 V60 H0 Z" fill="#fff" />
        </svg>
      </section>

      <section className="page">
        <div className="section-head">
          <h2 className="paw-heading">Shop by category</h2>
        </div>
        <div className="category-tiles">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} to={`/products?category=${c.slug}`} className="category-tile">
              <span className="category-cover">
                {covers[c.name] ? <img src={covers[c.name]} alt="" loading="lazy" /> : <span aria-hidden="true">{c.emoji}</span>}
              </span>
              <strong>{c.label}</strong>
              <span className="muted small">{counts[c.name] ?? '…'} items</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="bone-divider" aria-hidden="true"><span>🦴</span></div>

      <section className="page">
        <div className="section-head">
          <h2 className="paw-heading">Top dog favorites</h2>
          <Link to="/products">View all →</Link>
        </div>
        <div className="product-grid">
          {featured.map((p) => (
            <ProductCard key={p.product_id} product={p} />
          ))}
        </div>
      </section>

      <section className="perks">
        <div><span className="perk-icon">🐶</span><h3>Officially licensed</h3><p>Every piece carries authentic Yale marks. Handsome Dan approved.</p></div>
        <div><span className="perk-icon">🦴</span><h3>Sizes XS to XXL</h3><p>Check live stock for every size before you buy.</p></div>
        <div><span className="perk-icon">🏠</span><h3>Visit the doghouse</h3><p>Stop by our store at 57 Broadway in New Haven.</p></div>
      </section>
    </>
  )
}
