import qrcode from 'qrcode-generator'

/* A real QR code. It encodes exactly `value` (the ticket's TC-XXXXXXXX ref)
 * so a phone camera or the door scanner reads that string back.
 *
 * Drawn as SVG rects with literal hex fills (no CSS variables). Dark modules
 * on a white quiet zone keep the contrast scanners need; brand blue is used
 * only for the three finder eyes, and it is dark enough to read as "dark".
 */

const INK = '#070808'
const BLUE = '#15477C'
const QUIET = 4 // modules of white around the code, per the QR spec

export function qrMatrix(value: string): boolean[][] {
  const qr = qrcode(0, 'M') // type 0 = smallest version that fits
  qr.addData(value, 'Byte')
  qr.make()
  const n = qr.getModuleCount()
  return Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => qr.isDark(y, x)))
}

export function QrCode({ value, label }: { value: string; label?: string }) {
  const g = qrMatrix(value)
  const n = g.length
  const dim = n + QUIET * 2
  const inEye = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7)
  return (
    <svg
      className="qr"
      viewBox={`0 0 ${dim} ${dim}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label ?? `QR code for ticket ${value}`}
    >
      <rect width={dim} height={dim} fill="#FFFFFF" />
      {g.flatMap((row, y) =>
        row.map((on, x) =>
          on ? (
            <rect key={`${x}-${y}`} x={x + QUIET} y={y + QUIET} width={1} height={1} fill={inEye(x, y) ? BLUE : INK} />
          ) : null,
        ),
      )}
    </svg>
  )
}
