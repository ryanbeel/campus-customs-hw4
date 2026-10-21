import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchProducts, type Product } from '../api'
import { CATEGORIES, COLORS, PRICE_BUCKETS, SIZES, categoryBySlug } from '../catalog'
import ProductCard from '../components/ProductCard'

type FilterKey = 'category' | 'size' | 'color' | 'price'

const SORTS = [
  { id: 'featured', label: 'Featured' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'name', label: 'Name: A to Z' },
]

/** Read a comma-separated URL param as a list. */
const listParam = (params: URLSearchParams, key: string) =>
  (params.get(key) ?? '').split(',').map((v) => v.trim()).filter(Boolean)

interface Filters {
  category: string | null
  size: string[]
  color: string[]
  price: string[]
  q: string
}

function matches(p: Product, f: Filters, skip?: FilterKey): boolean {
  if (skip !== 'category' && f.category) {
    const cat = categoryBySlug(f.category)
    if (cat && p.category !== cat.name) return false
  }
  if (skip !== 'size' && f.size.length && !f.size.some((s) => (p.sizes_in_stock ?? []).includes(s))) return false
  if (skip !== 'color' && f.color.length && !f.color.some((c) => (p.color_families ?? []).includes(c))) return false
  if (skip !== 'price' && f.price.length) {
    const ok = f.price.some((id) => {
      const b = PRICE_BUCKETS.find((x) => x.id === id)
      return b ? p.price >= b.min && p.price <= b.max : false
    })
    if (!ok) return false
  }
  if (f.q) {
    const text = [p.name, p.garment_type, p.description, ...p.colors, ...p.search_tags].join(' ').toLowerCase()
    if (!f.q.toLowerCase().split(/\s+/).every((w) => text.includes(w))) return false
  }
  return true
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [params, setParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setError('Could not load products. Is the backend running on port 8000?'))
      .finally(() => setLoading(false))
  }, [])

  const filters: Filters = {
    category: params.get('category'),
    size: listParam(params, 'size'),
    color: listParam(params, 'color'),
    price: listParam(params, 'price'),
    q: params.get('q') ?? '',
  }
  const sort = params.get('sort') ?? 'featured'
  const category = categoryBySlug(filters.category)

  function update(key: string, value: string | string[] | null) {
    const next = new URLSearchParams(params)
    const v = Array.isArray(value) ? value.join(',') : value
    if (v) next.set(key, v)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  const toggle = (key: 'size' | 'color' | 'price', value: string) => {
    const current = filters[key]
    update(key, current.includes(value) ? current.filter((v) => v !== value) : [...current, value])
  }
  const clearAll = () => setParams(new URLSearchParams(), { replace: true })

  const results = useMemo(() => {
    const list = products.filter((p) => matches(p, filters))
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name))
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name))
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, params])

  /** How many products each option would show, given the other filters. */
  const count = (key: FilterKey, test: (p: Product) => boolean) =>
    products.filter((p) => matches(p, filters, key) && test(p)).length

  const activeChips: { label: string; clear: () => void }[] = [
    ...(category ? [{ label: category.label, clear: () => update('category', null) }] : []),
    ...filters.size.map((s) => ({ label: `Size ${s}`, clear: () => toggle('size', s) })),
    ...filters.color.map((c) => ({ label: c, clear: () => toggle('color', c) })),
    ...filters.price.map((id) => ({ label: PRICE_BUCKETS.find((b) => b.id === id)?.label ?? id, clear: () => toggle('price', id) })),
    ...(filters.q ? [{ label: `"${filters.q}"`, clear: () => update('q', null) }] : []),
  ]

  return (
    <>
      <section className="products-banner">
        <div className="products-banner-inner">
          <p className="eyebrow">🐾 Fetch your fit</p>
          <h1>{category ? category.label : 'All Products'}</h1>
          <p>{category ? `Browse all of our ${category.label.toLowerCase()}, fresh from the Campus Customs doghouse.` : 'Officially licensed Yale gear, sizes XS to XXL.'}</p>
        </div>
      </section>

      <section className="page products-layout">
        <button className="btn btn-secondary filters-toggle" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}>
          ⚙️ Filters {activeChips.length > 0 && `(${activeChips.length})`}
        </button>

        <aside className={'filters' + (showFilters ? ' open' : '')} aria-label="Product filters">
          <div className="filters-head">
            <h2>Filters</h2>
            {activeChips.length > 0 && <button className="link-btn" onClick={clearAll}>Clear all</button>}
          </div>

          <fieldset>
            <legend>Category</legend>
            <label className="filter-option">
              <input type="radio" name="category" checked={!filters.category} onChange={() => update('category', null)} />
              <span>All</span>
              <span className="filter-count">{count('category', () => true)}</span>
            </label>
            {CATEGORIES.map((c) => {
              const n = count('category', (p) => p.category === c.name)
              return (
                <label key={c.slug} className={'filter-option' + (n === 0 ? ' empty' : '')}>
                  <input type="radio" name="category" checked={filters.category === c.slug} onChange={() => update('category', c.slug)} />
                  <span>{c.label}</span>
                  <span className="filter-count">{n}</span>
                </label>
              )
            })}
          </fieldset>

          <fieldset>
            <legend>Size <span className="legend-note">(in stock)</span></legend>
            <div className="size-chips">
              {SIZES.map((s) => {
                const n = count('size', (p) => (p.sizes_in_stock ?? []).includes(s))
                return (
                  <button
                    key={s}
                    className={'size-chip' + (filters.size.includes(s) ? ' selected' : '')}
                    aria-pressed={filters.size.includes(s)}
                    onClick={() => toggle('size', s)}
                    title={`${n} products in stock in ${s}`}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend>Color <span className="legend-note">(garment or design)</span></legend>
            <div className="color-options">
              {COLORS.map((c) => {
                const n = count('color', (p) => (p.color_families ?? []).includes(c.name))
                if (n === 0 && !filters.color.includes(c.name)) return null
                return (
                  <button
                    key={c.name}
                    className={'color-option' + (filters.color.includes(c.name) ? ' selected' : '')}
                    aria-pressed={filters.color.includes(c.name)}
                    onClick={() => toggle('color', c.name)}
                  >
                    <span className="swatch" style={{ background: c.swatch }} />
                    <span>{c.name}</span>
                    <span className="filter-count">{n}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend>Price</legend>
            {PRICE_BUCKETS.map((b) => (
              <label key={b.id} className="filter-option">
                <input type="checkbox" checked={filters.price.includes(b.id)} onChange={() => toggle('price', b.id)} />
                <span>{b.label}</span>
                <span className="filter-count">{count('price', (p) => p.price >= b.min && p.price <= b.max)}</span>
              </label>
            ))}
          </fieldset>
        </aside>

        <div className="products-main">
          <div className="products-toolbar">
            <input
              className="search"
              type="search"
              placeholder="Search hoodies, colleges, Harvard…"
              value={filters.q}
              onChange={(e) => update('q', e.target.value || null)}
              aria-label="Search products"
            />
            <label className="sort">
              Sort
              <select value={sort} onChange={(e) => update('sort', e.target.value === 'featured' ? null : e.target.value)}>
                {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
          </div>

          {activeChips.length > 0 && (
            <div className="active-filters">
              {activeChips.map((chip) => (
                <button key={chip.label} className="active-chip" onClick={chip.clear}>
                  {chip.label} <span aria-hidden="true">×</span>
                </button>
              ))}
              <button className="link-btn" onClick={clearAll}>Clear all</button>
            </div>
          )}

          {loading && <p className="muted">Fetching products… 🐾</p>}
          {error && <p className="error">{error}</p>}
          {!loading && !error && (
            <p className="muted small results-count">{results.length} of {products.length} products</p>
          )}

          {!loading && !error && results.length === 0 && (
            <div className="no-results">
              <span aria-hidden="true">🐶❓</span>
              <p><strong>Ruh-roh, no matches.</strong> Try removing a filter.</p>
              <button className="btn btn-primary" onClick={clearAll}>Clear all filters</button>
            </div>
          )}

          <div className="product-grid">
            {results.map((p) => (
              <ProductCard key={p.product_id} product={p} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
