import { describe, expect, it } from 'vitest'
import { rupees } from './money'

describe('rupees', () => {
  it('groups the Indian way and drops needless decimals', () => {
    expect(rupees(49900)).toBe('₹499')
    expect(rupees(125000)).toBe('₹1,250')
    expect(rupees(12345600)).toBe('₹1,23,456')
  })
  it('keeps two decimals when paise matter, and says Free for zero', () => {
    expect(rupees(49950)).toBe('₹499.50')
    expect(rupees(0)).toBe('Free')
  })
})
