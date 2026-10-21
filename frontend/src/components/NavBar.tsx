import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { CATEGORIES } from '../catalog'
import { useChatResults } from '../chatResults'

const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '')

export default function NavBar({ onBulldog }: { onBulldog: () => void }) {
  const [open, setOpen] = useState(false)
  const [productsOpen, setProductsOpen] = useState(false)
  const { user, signOut } = useAuth()
  const { surprise } = useChatResults()
  const navigate = useNavigate()
  const close = () => {
    setOpen(false)
    setProductsOpen(false)
    // Drop focus so the dropdown (which also opens on keyboard focus) closes after a click.
    ;(document.activeElement as HTMLElement | null)?.blur()
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand" onClick={close}>
          <img src="/bulldog.svg" alt="" className="brand-dog" />
          <span className="brand-text">
            <span className="brand-top">CAMPUS</span>
            <span className="brand-bottom">CUSTOMS</span>
          </span>
        </Link>
        <button className="menu-toggle" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          ☰
        </button>
        <nav className={open ? 'nav-links open' : 'nav-links'}>
          <NavLink to="/" end onClick={close} className={linkClass}>Home</NavLink>

          {/* Products: hover (or focus/tap the arrow) to see categories */}
          <div
            className={'nav-dropdown' + (productsOpen ? ' show' : '')}
            onMouseEnter={() => setProductsOpen(true)}
            onMouseLeave={() => setProductsOpen(false)}
          >
            <div className="nav-dropdown-trigger">
              <NavLink to="/products" end onClick={close} className={linkClass}>Products</NavLink>
              <button
                className="nav-caret"
                aria-label="Show product categories"
                aria-expanded={productsOpen}
                onClick={() => setProductsOpen(!productsOpen)}
              >
                ▾
              </button>
            </div>
            <div className="nav-dropdown-menu" role="menu">
              <Link to="/products" onClick={close} role="menuitem" className="dropdown-all">
                🐾 All products
              </Link>
              {CATEGORIES.map((c) => (
                <Link key={c.slug} to={`/products?category=${c.slug}`} onClick={close} role="menuitem">
                  <span aria-hidden="true">{c.emoji}</span> {c.label}
                </Link>
              ))}
            </div>
          </div>

          <NavLink to="/about" onClick={close} className={linkClass}>About Us</NavLink>
          {user ? (
            <>
              <span className="nav-greeting">Hi, {user.first_name}!</span>
              <button className="nav-logout" onClick={() => { signOut(); close(); navigate('/') }}>
                Log Out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={close} className={linkClass}>Log In</NavLink>
              <NavLink
                to="/create-account"
                onClick={close}
                className={({ isActive }) => 'nav-cta ' + (isActive ? 'active' : '')}
              >
                Create Account
              </NavLink>
            </>
          )}
          <button className="nav-action" onClick={() => { close(); void surprise() }}>
            Surprise Me
          </button>
          <button className="nav-action bulldog-btn" onClick={() => { close(); onBulldog() }}>
            Bull Dog
          </button>
        </nav>
      </div>
    </header>
  )
}
