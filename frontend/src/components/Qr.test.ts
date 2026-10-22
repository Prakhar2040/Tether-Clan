import { describe, expect, it } from 'vitest'
import jsQR from 'jsqr'
import { qrMatrix } from './Qr'

// Rasterise the matrix with a quiet zone and read it back with an independent decoder.
describe('qrMatrix', () => {
  it('decodes back to exactly the ticket ref', () => {
    const ref = 'TC-K7M2QX9A'
    const g = qrMatrix(ref)
    const scale = 6, q = 4, dim = (g.length + q * 2) * scale
    const px = new Uint8ClampedArray(dim * dim * 4).fill(255)
    g.forEach((row, y) => row.forEach((on, x) => {
      if (!on) return
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const i = (((y + q) * scale + dy) * dim + (x + q) * scale + dx) * 4
        px[i] = px[i + 1] = px[i + 2] = 0
      }
    }))
    expect(jsQR(px, dim, dim)?.data).toBe(ref)
  })
})
