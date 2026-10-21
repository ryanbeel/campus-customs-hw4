import { Link } from 'react-router-dom'
import { formatPrice, type Product } from '../api'

function shorten(text: string, max = 90) {
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link to={`/products/${product.product_id}`} className="product-card">
      <div className="product-card-img">
        <img src={product.image_url} alt={product.name} loading="lazy" />
        {product.total_stock === 0 && <span className="badge">Sold out</span>}
      </div>
      <div className="product-card-body">
        <h3>{product.name}</h3>
        <p className="price">{formatPrice(product.price)}</p>
        <p className="muted small">{shorten(product.description)}</p>
      </div>
    </Link>
  )
}
