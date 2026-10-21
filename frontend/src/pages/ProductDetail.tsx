import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchProduct, formatPrice, type Product } from '../api'

export default function ProductDetail() {
  const { productId = '' } = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [error, setError] = useState('')
  const [selectedSize, setSelectedSize] = useState('')

  useEffect(() => {
    setProduct(null)
    setError('')
    setSelectedSize('')
    fetchProduct(productId)
      .then(setProduct)
      .catch(() => setError('Sorry, we could not find that product.'))
  }, [productId])

  if (error) {
    return (
      <section className="page">
        <p className="error">{error}</p>
        <Link to="/products">← Back to products</Link>
      </section>
    )
  }
  if (!product) return <section className="page"><p className="muted">Loading…</p></section>

  const selected = product.sizes?.find((s) => s.size === selectedSize)

  return (
    <section className="page">
      <Link to="/products" className="back-link">← Back to products</Link>
      <div className="detail">
        <div className="detail-img">
          <img src={product.image_url} alt={product.name} />
        </div>
        <div className="detail-info">
          <p className="eyebrow">{product.garment_type}</p>
          <h1>{product.name}</h1>
          <p className="detail-price">{formatPrice(product.price)}</p>
          <p>{product.description}</p>

          {product.colors.length > 0 && (
            <p><strong>Colors:</strong> {product.colors.join(', ')}</p>
          )}

          {product.sizes && product.sizes.length > 0 && (
            <>
              <h3>Sizes &amp; stock</h3>
              <div className="sizes">
                {product.sizes.map((s) => (
                  <button
                    key={s.size}
                    className={'size-btn' + (s.size === selectedSize ? ' selected' : '')}
                    disabled={s.quantity === 0}
                    onClick={() => setSelectedSize(s.size)}
                    title={s.quantity === 0 ? 'Out of stock' : `${s.quantity} in stock`}
                  >
                    {s.size}
                  </button>
                ))}
              </div>
              <table className="stock-table">
                <thead><tr><th>Size</th><th>In stock</th></tr></thead>
                <tbody>
                  {product.sizes.map((s) => (
                    <tr key={s.size}>
                      <td>{s.size}</td>
                      <td className={s.quantity === 0 ? 'out' : ''}>
                        {s.quantity === 0 ? 'Sold out' : s.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selected && (
                <p className="muted">
                  Size {selected.size}: {selected.quantity} available.
                </p>
              )}
            </>
          )}

          {product.search_tags.length > 0 && (
            <div className="tags">
              {product.search_tags.map((t) => <span key={t} className="tag">{t}</span>)}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
