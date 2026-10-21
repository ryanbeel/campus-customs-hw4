import { Link } from 'react-router-dom'
import CartoonBulldog from '../components/CartoonBulldog'

export default function NotFound() {
  return (
    <section className="page narrow not-found">
      <CartoonBulldog className="not-found-dog" title="Confused bulldog" />
      <h1>Ruh-roh! This page ran off chasing a squirrel.</h1>
      <p className="muted">We couldn't find what you were looking for.</p>
      <Link to="/products" className="btn btn-primary">Fetch some gear instead</Link>
    </section>
  )
}
