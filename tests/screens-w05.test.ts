// W-05 (the owner, 22 Nov 2026): screenshot fingerprints, so the UI/UX reviewer sees only screens that changed.
import { describe, expect, it } from 'vitest'
import { compare, distance, fingerprint, THRESHOLD } from '../tools/screens.mjs'

/** A 400×300 light "screen" with a dark bar; `extra` adds a dark box (a new button, a moved panel). */
function screen(extra?: { x: number; y: number; w: number; h: number }, noise = 0) {
  const width = 400
  const height = 300
  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      let v = y < 30 ? 40 : 235
      if (extra && x >= extra.x && x < extra.x + extra.w && y >= extra.y && y < extra.y + extra.h) v = 60
      v += noise && (x * 7 + y * 13) % 5 === 0 ? noise : 0
      data[i] = data[i + 1] = data[i + 2] = v
      data[i + 3] = 255
    }
  return { width, height, data }
}

describe('screen fingerprints', () => {
  it('ignores rendering noise', () => {
    expect(distance(fingerprint(screen()), fingerprint(screen(undefined, 2)))).toBeLessThanOrEqual(THRESHOLD)
  })

  it('notices a new element of button size', () => {
    expect(distance(fingerprint(screen()), fingerprint(screen({ x: 150, y: 120, w: 60, h: 24 })))).toBeGreaterThan(THRESHOLD)
  })

  it('sorts screens into changed, added and removed', () => {
    const a = fingerprint(screen())
    const b = fingerprint(screen({ x: 20, y: 200, w: 120, h: 40 }))
    expect(compare({ start: a, old: a, same: a }, { start: b, same: a, fresh: a })).toEqual({ changed: ['start'], added: ['fresh'], removed: ['old'] })
    expect(distance(a, 'ff')).toBe(1024)
  })
})
