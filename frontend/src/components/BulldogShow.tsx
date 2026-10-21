import { useEffect, useMemo } from 'react'

/** The 5 bulldog events. One is picked at random each time "Bull Dog" is clicked. */
export const BULLDOG_EVENTS = [
  { id: 'skate', caption: 'Sk8er Dog! Handsome Dan just landed a kickflip 🛹' },
  { id: 'disco', caption: 'Bulldog Boogie! Somebody has been practicing 🪩' },
  { id: 'rocket', caption: '3… 2… 1… BARK-OFF! 🚀' },
  { id: 'hotdog', caption: 'Hot dog eating champion. Zero regrets. 🌭' },
  { id: 'fieldgoal', caption: "IT'S GOOD! Bulldogs win The Game! 🏈" },
] as const

export const SHOW_MS = 7000

const DOG = '/bulldog.svg'
const CONFETTI_COLORS = ['#00356b', '#f04f36', '#ffd34e', '#4fb3ff', '#ffffff', '#7ad37a']

function Confetti({ count = 40, delay = 0 }: { count?: number; delay?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: delay + Math.random() * 1.2,
        duration: 1.8 + Math.random() * 1.4,
        rotate: Math.random() * 360,
      })),
    [count, delay],
  )
  return (
    <div className="bd-confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  )
}

function Skate() {
  return (
    <>
      <div className="ev-skate-rider">
        <img className="ev-skate-dog" src={DOG} alt="" />
        <span className="ev-skate-board">🛹</span>
      </div>
      <div className="ev-skate-sparks" aria-hidden="true">✨</div>
    </>
  )
}

function Disco() {
  return (
    <>
      <div className="ev-disco-lights" aria-hidden="true"><i /><i /><i /></div>
      <span className="ev-disco-ball" aria-hidden="true">🪩</span>
      <div className="ev-disco-dancer">
        <img src={DOG} alt="" />
        <span className="ev-disco-shades" aria-hidden="true"><i /><i /></span>
      </div>
      {['🎵', '🎶', '🎵', '🎶', '🎵'].map((n, i) => (
        <span key={i} className="ev-disco-note" style={{ left: `${12 + i * 18}%`, animationDelay: `${0.8 + i * 0.9}s` }}>{n}</span>
      ))}
    </>
  )
}

function Rocket() {
  return (
    <>
      <div className="ev-rocket-ship">
        <span className="ev-rocket-emoji">🚀</span>
        <img className="ev-rocket-pilot" src={DOG} alt="" />
      </div>
      {[0, 1, 2].map((i) => (
        <span key={i} className="ev-rocket-smoke" style={{ left: `${40 + i * 8}%`, animationDelay: `${0.3 + i * 0.25}s` }}>💨</span>
      ))}
      <div className="ev-rocket-para">
        <span>🪂</span>
        <img src={DOG} alt="" />
      </div>
      <div className="ev-rocket-stars" aria-hidden="true">✨ ⭐ ✨</div>
    </>
  )
}

function HotDog() {
  return (
    <>
      <img className="ev-hotdog-dog" src={DOG} alt="" />
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="ev-hotdog-food"
          style={{ ['--i' as string]: i, animationDelay: `${0.9 + i * 0.8}s` } as React.CSSProperties}
        >
          🌭
        </span>
      ))}
      <div className="ev-hotdog-burp">*BURP*… BOOLA BOOLA!</div>
    </>
  )
}

function FieldGoal() {
  return (
    <>
      <div className="ev-fg-posts" aria-hidden="true"><i className="l" /><i className="r" /><i className="bar" /><i className="base" /></div>
      <img className="ev-fg-dog" src={DOG} alt="" />
      <div className="ev-fg-ball-x"><span className="ev-fg-ball-y">🏈</span></div>
      <div className="ev-fg-good">IT'S GOOD!</div>
      <Confetti count={45} delay={3.6} />
    </>
  )
}

const SCENES: Record<string, () => React.ReactElement> = {
  skate: Skate,
  disco: Disco,
  rocket: Rocket,
  hotdog: HotDog,
  fieldgoal: FieldGoal,
}

/** Full-screen bulldog event that plays for 7 seconds, then disappears. */
export default function BulldogShow({ eventId, onDone }: { eventId: string; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, SHOW_MS)
    return () => window.clearTimeout(t)
  }, [eventId, onDone])

  const event = BULLDOG_EVENTS.find((e) => e.id === eventId) ?? BULLDOG_EVENTS[0]
  const Scene = SCENES[event.id]

  return (
    <div className="bd-overlay" role="status" aria-live="polite">
      <div className={`bd-stage ev-${event.id}`}>
        <Scene />
        <p className="bd-caption">{event.caption}</p>
        <div className="bd-timer" aria-hidden="true"><span /></div>
      </div>
    </div>
  )
}
