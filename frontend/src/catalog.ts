/** Product categories (match backend tools.garment_category) and filter options. */
export interface Category {
  slug: string
  name: string // value from the API's `category` field
  label: string // what shoppers see
  emoji: string
}

export const CATEGORIES: Category[] = [
  { slug: 'hoodies', name: 'Hoodie', label: 'Hoodies', emoji: '🧥' },
  { slug: 'crewnecks', name: 'Crewneck', label: 'Crewnecks & Sweatshirts', emoji: '🐾' },
  { slug: 't-shirts', name: 'T-shirt', label: 'T-Shirts', emoji: '👕' },
  { slug: 'quarter-zips', name: 'Quarter-zip', label: 'Quarter-Zips', emoji: '🎽' },
  { slug: 'jackets', name: 'Jacket', label: 'Jackets & Fleece', emoji: '🧣' },
  { slug: 'long-sleeves', name: 'Long-sleeve', label: 'Long-Sleeve Shirts', emoji: '🏃' },
  { slug: 'mocknecks', name: 'Mockneck', label: 'Mocknecks', emoji: '✨' },
]

export const categoryBySlug = (slug: string | null) => CATEGORIES.find((c) => c.slug === slug)

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

/** Color filter groups (match backend tools.COLOR_FAMILIES) with swatch colors. */
export const COLORS: { name: string; swatch: string }[] = [
  { name: 'Navy', swatch: '#1f2f5c' },
  { name: 'Blue', swatch: '#3b7dd8' },
  { name: 'Gray', swatch: '#a3a7ad' },
  { name: 'White', swatch: '#ffffff' },
  { name: 'Black', swatch: '#111111' },
  { name: 'Red', swatch: '#c8102e' },
  { name: 'Yellow & Gold', swatch: '#f2c14e' },
  { name: 'Green', swatch: '#2e8b57' },
  { name: 'Pink & Coral', swatch: '#f08a7e' },
  { name: 'Multicolor', swatch: 'conic-gradient(#c8102e, #f2c14e, #2e8b57, #3b7dd8, #c8102e)' },
]

export const PRICE_BUCKETS = [
  { id: 'under-40', label: 'Under $40', min: 0, max: 39.99 },
  { id: '40-60', label: '$40–$60', min: 40, max: 60 },
  { id: '60-80', label: '$60–$80', min: 60.01, max: 80 },
  { id: '80-plus', label: '$80+', min: 80.01, max: Infinity },
]
