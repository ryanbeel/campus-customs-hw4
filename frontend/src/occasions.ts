import type { Product } from './api'

/** Holidays and campus occasions. The welcome pop-up themes itself around any in the next 20 days. */
export const OCCASION_WINDOW_DAYS = 20

export interface Occasion {
  id: string
  name: string
  emoji: string
  date: (year: number) => Date
  headline: string
  message: string
  flyers: string[] // emoji that fly across the welcome scene
  theme: { from: string; to: string; accent: string }
  hat?: 'witch' | 'santa' | 'grad' | 'party'
  picksLabel: string
  picks: (p: Product) => boolean
  shopLink: string
}

/** nth weekday of a month, e.g. 4th Thursday of November. weekday: 0=Sun … 6=Sat */
function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month, 1)
  const offset = (weekday - first.getDay() + 7) % 7
  return new Date(year, month, 1 + offset + (n - 1) * 7)
}
const thanksgiving = (y: number) => nthWeekday(y, 10, 4, 4)

const hasColor = (p: Product, c: string) => (p.color_families ?? []).includes(c)
const tagged = (p: Product, word: string) =>
  [p.name, p.description, ...p.search_tags].join(' ').toLowerCase().includes(word)

export const OCCASIONS: Occasion[] = [
  {
    id: 'halloween', name: 'Halloween', emoji: '🎃', date: (y) => new Date(y, 9, 31),
    headline: 'Happy Halloween from Campus Customs!',
    message: "Our bulldog is already in costume. Treat yourself to some spooky-season Yale gear in black and bold colors. No tricks, just Boola Boola.",
    flyers: ['🦇', '🦇', '👻', '🦇', '🍬'],
    theme: { from: '#1b0b2e', to: '#4a1f6b', accent: '#ff8a1f' }, hat: 'witch',
    picksLabel: 'Spooky-season picks (in black)', picks: (p) => hasColor(p, 'Black'), shopLink: '/products?color=Black',
  },
  {
    id: 'the-game', name: 'The Game (Harvard–Yale)', emoji: '🏈',
    // Usually the Saturday before Thanksgiving; check the official schedule each year.
    date: (y) => new Date(y, 10, thanksgiving(y).getDate() - 5),
    headline: 'Game week! Beat Harvard!',
    message: 'Gear up for The Game with rivalry tees and warm layers for the stands.',
    flyers: ['🏈', '🎉', '💙', '🏈', '🐾'],
    theme: { from: '#00254a', to: '#0a4a8f', accent: '#ffd34e' }, hat: 'party',
    picksLabel: 'Game day picks', picks: (p) => tagged(p, 'harvard') || tagged(p, 'football'), shopLink: '/products?q=harvard',
  },
  {
    id: 'thanksgiving', name: 'Thanksgiving', emoji: '🦃', date: thanksgiving,
    headline: 'Happy Thanksgiving!',
    message: "Heading home for the holiday? Bring the Bulldog spirit to the family table in a cozy crewneck.",
    flyers: ['🍂', '🍁', '🦃', '🍂', '🥧'],
    theme: { from: '#5a2d0c', to: '#a0521d', accent: '#ffcf6b' },
    picksLabel: 'Cozy picks for the trip home', picks: (p) => p.category === 'Crewneck', shopLink: '/products?category=crewnecks',
  },
  {
    id: 'holidays', name: 'the holidays', emoji: '🎄', date: (y) => new Date(y, 11, 25),
    headline: 'Happy Holidays from Campus Customs!',
    message: 'Find a gift for every Bulldog on your list: fleece, quarter-zips, and more.',
    flyers: ['❄️', '🎁', '❄️', '⭐', '❄️'],
    theme: { from: '#0b3d2e', to: '#14674b', accent: '#ff5a5a' }, hat: 'santa',
    picksLabel: 'Giftable favorites', picks: (p) => p.category === 'Jacket' || p.category === 'Quarter-zip', shopLink: '/products?category=jackets',
  },
  {
    id: 'new-year', name: "New Year's", emoji: '🎆', date: (y) => new Date(y, 0, 1),
    headline: 'Happy New Year!', message: 'New year, new Yale gear. Start it in style.',
    flyers: ['🎆', '🎉', '✨', '🎆', '🥳'],
    theme: { from: '#0b0f2e', to: '#2b2f6b', accent: '#ffd34e' }, hat: 'party',
    picksLabel: 'Fresh picks', picks: (p) => p.category === 'Hoodie', shopLink: '/products?category=hoodies',
  },
  {
    id: 'valentines', name: "Valentine's Day", emoji: '💝', date: (y) => new Date(y, 1, 14),
    headline: "Happy Valentine's Day!", message: 'Show some love for your favorite Bulldog (or be your own).',
    flyers: ['💙', '💝', '💙', '🌹', '💙'],
    theme: { from: '#5c0b2e', to: '#a3245a', accent: '#ffd1e0' },
    picksLabel: 'Gifts they will love', picks: (p) => hasColor(p, 'Red') || hasColor(p, 'Pink & Coral'), shopLink: '/products?color=Red',
  },
  {
    id: 'st-patricks', name: "St. Patrick's Day", emoji: '☘️', date: (y) => new Date(y, 2, 17),
    headline: "Happy St. Patrick's Day!", message: 'Feeling lucky? These picks have a touch of green.',
    flyers: ['☘️', '🍀', '☘️', '🌈', '☘️'],
    theme: { from: '#0b4a2a', to: '#1f8a4c', accent: '#ffd34e' },
    picksLabel: 'A touch of green', picks: (p) => hasColor(p, 'Green'), shopLink: '/products?color=Green',
  },
  {
    id: 'mothers-day', name: "Mother's Day", emoji: '💐', date: (y) => nthWeekday(y, 4, 0, 2),
    headline: "Happy Mother's Day!", message: 'For the proudest Yale mom you know.',
    flyers: ['💐', '🌷', '💐', '🌸', '💐'],
    theme: { from: '#4a1f4f', to: '#8a3f8f', accent: '#ffd1e0' },
    picksLabel: 'Gifts for Mom', picks: (p) => p.category === 'Quarter-zip', shopLink: '/products?category=quarter-zips',
  },
  {
    id: 'fathers-day', name: "Father's Day", emoji: '👔', date: (y) => nthWeekday(y, 5, 0, 3),
    headline: "Happy Father's Day!", message: 'For the Yale dad who has everything (except this).',
    flyers: ['👔', '🏆', '👔', '⭐', '👔'],
    theme: { from: '#00254a', to: '#2a5f99', accent: '#ffd34e' },
    picksLabel: 'Gifts for Dad', picks: (p) => tagged(p, 'dad') || p.category === 'Quarter-zip', shopLink: '/products?category=quarter-zips',
  },
  {
    id: 'july-4', name: 'the Fourth of July', emoji: '🎆', date: (y) => new Date(y, 6, 4),
    headline: 'Happy Fourth of July!', message: 'Red, white, and Yale blue.',
    flyers: ['🎆', '⭐', '🎇', '⭐', '🎆'],
    theme: { from: '#0b1f4f', to: '#1f3f8f', accent: '#ff5a5a' }, hat: 'party',
    picksLabel: 'Red, white & blue', picks: (p) => hasColor(p, 'Red'), shopLink: '/products?color=Red',
  },
]

export interface UpcomingOccasion {
  occasion: Occasion
  date: Date
  daysAway: number
}

/** Occasions happening today or in the next `windowDays` days, soonest first. */
export function upcomingOccasions(today: Date, windowDays = OCCASION_WINDOW_DAYS): UpcomingOccasion[] {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const out: UpcomingOccasion[] = []
  for (const occasion of OCCASIONS) {
    for (const year of [start.getFullYear(), start.getFullYear() + 1]) {
      const date = occasion.date(year)
      const daysAway = Math.round((date.getTime() - start.getTime()) / 86_400_000)
      if (daysAway >= 0 && daysAway <= windowDays) out.push({ occasion, date, daysAway })
    }
  }
  return out.sort((a, b) => a.daysAway - b.daysAway)
}

/** "Today" for the site. Add ?today=YYYY-MM-DD to the URL to preview another date. */
export function siteToday(): Date {
  const param = new URLSearchParams(window.location.search).get('today')
  if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) {
    const [y, m, d] = param.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date()
}
