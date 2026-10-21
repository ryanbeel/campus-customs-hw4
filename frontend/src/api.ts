export interface SizeStock {
  size: string
  quantity: number
}

export interface Product {
  product_id: string
  name: string
  garment_type: string
  description: string
  colors: string[]
  search_tags: string[]
  image_url: string
  price: number
  total_stock: number
  sizes?: SizeStock[]
  // Problem 10 filters (from /api/products)
  category?: string
  color_families?: string[]
  sizes_in_stock?: string[]
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json() as Promise<T>
}

export const fetchProducts = () => getJson<Product[]>('/api/products')
export const fetchProduct = (id: string) =>
  getJson<Product>(`/api/products/${encodeURIComponent(id)}`)

export const formatPrice = (price: number) => `$${price.toFixed(2)}`

export interface User {
  id: number
  name: string
  first_name: string
  last_name: string
  email: string
}

export interface AuthResponse {
  token: string
  user: User
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Something went wrong. Please try again.')
  return data as T
}

export const login = (email: string, password: string) =>
  postJson<AuthResponse>('/api/login', { email, password })

export const signup = (fields: {
  first_name: string
  last_name: string
  email: string
  password: string
  confirm_password: string
}) => postJson<AuthResponse>('/api/signup', fields)

export async function fetchMe(token: string): Promise<User> {
  const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error('Not logged in')
  return res.json() as Promise<User>
}

export interface ChatProductCard {
  product_id: string
  name: string
  price: number
  image_url: string
  sizes_in_stock: string[]
  sold_out_sizes: string[]
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
  dog_joke?: string | null
}

export interface ChatResponse {
  reply: string
  products: ChatProductCard[]
  matches: SearchResults | null
  offer_restock_email: boolean
  suggest_login: boolean
  saved: boolean
  comparison: Comparison | null
  ask_price_range: boolean
  price_range: PriceRange | null
  dog_joke: string | null
  emoji: string
}

/** Where the shopper is, sent with every chat message. */
export interface PageContext {
  path: string
  product_id: string | null
  search_label: string | null
}

export interface PriceRange {
  min_price: number | null
  max_price: number | null
}

export function priceRangeLabel(r: PriceRange): string {
  if (r.min_price != null && r.max_price != null) return `$${r.min_price}–$${r.max_price}`
  if (r.max_price != null) return `Under $${r.max_price}`
  if (r.min_price != null) return `$${r.min_price}+`
  return 'Any price'
}

export interface ComparisonRow {
  product_id: string
  name: string
  price: number
  price_difference: number
  image_url: string
  sizes_in_stock: string[]
  is_viewed: boolean
}

export interface Comparison {
  category: string
  rows: ComparisonRow[]
}

export async function sendChat(
  message: string,
  history: ChatTurn[],
  token: string | null,
  page: PageContext,
  priceRange: PriceRange | null = null,
): Promise<ChatResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, history, page, price_range: priceRange }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'The chat is unavailable right now.')
  return data as ChatResponse
}

export interface ProductMatch {
  category: string | null
  product_id: string
  name: string
  garment_type: string
  price: number
  image_url: string
  short_description: string
  sizes_in_stock: string[]
}

export interface SearchResults {
  kind: 'search' | 'surprise'
  label: string
  query: string
  min_price: number | null
  max_price: number | null
  size: string | null
  total: number
  offset: number
  limit: number
  has_more: boolean
  products: ProductMatch[]
}

export function fetchSearchPage(spec: SearchResults, offset: number, limit = 5): Promise<SearchResults> {
  const params = new URLSearchParams({
    query: spec.query,
    label: spec.label,
    offset: String(offset),
    limit: String(limit),
  })
  if (spec.min_price != null) params.set('min_price', String(spec.min_price))
  if (spec.max_price != null) params.set('max_price', String(spec.max_price))
  if (spec.size) params.set('size', spec.size)
  return getJson<SearchResults>(`/api/search?${params}`)
}

export interface SavedChatMessage {
  role: 'user' | 'assistant'
  content: string
  products: ChatProductCard[]
  matches: SearchResults | null
  dog_joke: string | null
  emoji: string | null
  created_at: string
}

export interface ChatHistoryResponse {
  first_name: string
  messages: SavedChatMessage[]
}

export async function fetchChatHistory(token: string): Promise<ChatHistoryResponse> {
  const res = await fetch('/api/chat/history', { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error('Could not load your saved chat.')
  return res.json() as Promise<ChatHistoryResponse>
}

export async function clearChatHistory(token: string): Promise<void> {
  const res = await fetch('/api/chat/history', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error('Could not clear your chat.')
}

export const fetchSurprise = () => getJson<SearchResults>('/api/surprise')
