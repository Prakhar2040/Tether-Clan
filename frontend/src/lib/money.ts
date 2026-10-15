/* Prices cross the API as integer paise. People only ever see rupees.
 * This is the one formatter the member app uses for money. */

/** 125000 -> "₹1,250"; 49950 -> "₹499.50"; 0 -> "Free". Indian digit grouping. */
export function rupees(paise: number): string {
  if (paise <= 0) return 'Free'
  const r = paise / 100
  const whole = Number.isInteger(r)
  return `₹${r.toLocaleString('en-IN', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`
}
