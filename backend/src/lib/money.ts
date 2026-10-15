/* Money is rupees, always.
 *
 * Stored as whole paise in integers, never floats, and there is no currency column on
 * purpose: the product sells in one city, in one currency. This file is the one place
 * that says so, so the day that stops being true is a search for CURRENCY rather than for
 * every place a price is shown. */
export const CURRENCY = 'INR' as const

/** What an order costs in total. Price is per ticket. */
export const totalPaise = (pricePaise: number, qty: number): number => pricePaise * qty
