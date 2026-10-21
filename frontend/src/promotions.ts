/**
 * Store specials and sales shown in the welcome pop-up.
 *
 * There are no sales in the Campus Customs database, so this list is empty and the
 * pop-up shows no discounts. To run a real sale, add it here, e.g.:
 *
 *   { title: 'Fall Sale', details: '20% off all hoodies', starts: '2026-10-25', ends: '2026-11-01' }
 *
 * (Also tell the chat assistant in backend/prompts/prompt.md so it can answer questions about it.)
 */
export interface Promotion {
  title: string
  details: string
  starts: string // YYYY-MM-DD
  ends: string // YYYY-MM-DD (inclusive)
}

export const PROMOTIONS: Promotion[] = []

export function activePromotions(today: Date): Promotion[] {
  const day = today.toISOString().slice(0, 10)
  return PROMOTIONS.filter((p) => p.starts <= day && day <= p.ends)
}
