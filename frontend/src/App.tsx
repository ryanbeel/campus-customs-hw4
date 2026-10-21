import { useCallback, useRef, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar'
import Footer from './components/Footer'
import ChatWidget from './components/ChatWidget'
import ChatResultsPanel from './components/ChatResultsPanel'
import BulldogShow, { BULLDOG_EVENTS } from './components/BulldogShow'
import WelcomePopup from './components/WelcomePopup'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import About from './pages/About'
import Login from './pages/Login'
import CreateAccount from './pages/CreateAccount'
import ForgotPassword from './pages/ForgotPassword'
import NotFound from './pages/NotFound'

export default function App() {
  // Bull Dog show: pick a random event, never the same one twice in a row.
  const [bulldogEvent, setBulldogEvent] = useState<{ id: string; play: number } | null>(null)
  const lastEvent = useRef<string | null>(null)
  const playBulldog = useCallback(() => {
    const options = BULLDOG_EVENTS.map((e) => e.id).filter((id) => id !== lastEvent.current)
    const next = options[Math.floor(Math.random() * options.length)]
    lastEvent.current = next
    setBulldogEvent((prev) => ({ id: next, play: (prev?.play ?? 0) + 1 }))
  }, [])
  const endBulldog = useCallback(() => setBulldogEvent(null), [])

  return (
    <>
      <div className="announcement">Officially licensed Yale gear · Shop in store at 57 Broadway, New Haven</div>
      <NavBar onBulldog={playBulldog} />
      <ChatResultsPanel />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:productId" element={<ProductDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/create-account" element={<CreateAccount />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <ChatWidget />
      <WelcomePopup />
      {bulldogEvent && <BulldogShow key={bulldogEvent.play} eventId={bulldogEvent.id} onDone={endBulldog} />}
    </>
  )
}
