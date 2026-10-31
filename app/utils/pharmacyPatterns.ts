// Cycle continuously through 2–8 second geometric LED programs.
export const pharmacyResolution = 45
export const pharmacyProgramCount = 288
const pharmacyFamilies = [0, 1, 2, 3, 6, 9, 11] as const
export function pharmacyProgram(time: number, beat = .5) {
  const totalBeats = pharmacyProgramCount / 4 * 40
  let remaining = ((time / beat) % totalBeats + totalBeats) % totalBeats
  let index = 0
  for (; index < pharmacyProgramCount - 1; index++) {
    const duration = 4 * (index % 4 + 1)
    if (remaining < duration) break
    remaining -= duration
  }
  const duration = 4 * (index % 4 + 1)
  return { index, family: pharmacyFamilies[index % pharmacyFamilies.length]!, variant: Math.floor(index / pharmacyFamilies.length), phase: remaining, beats: duration }
}
export function pharmacyFrame(time: number, beat = .5) {
  const { index, family, variant, phase: clockPhase, beats } = pharmacyProgram(time, beat)
  const phase = (clockPhase * (1 + variant * .037)) % beats
  const frame = new Float32Array(45 * 45)
  const angle = phase * .75
  const set = (x: number, y: number, value = 1) => {
    x = Math.round(x); y = Math.round(y)
    if (x < 0 || x > 44 || y < 0 || y > 44 || (Math.abs(x - 22) > 7 && Math.abs(y - 22) > 7)) return
    frame[y * 45 + x] = Math.max(frame[y * 45 + x]!, value)
  }
  const line = (x: number, y: number, xx: number, yy: number, value = 1) => {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(xx - x), Math.abs(yy - y))))
    for (let i = 0; i <= steps; i++) set(x + (xx - x) * i / steps, y + (yy - y) * i / steps, value)
  }
  const plus = (x: number, y: number, radius: number, rotation = 0, value = 1) => {
    const c = Math.cos(rotation) * radius, s = Math.sin(rotation) * radius
    line(x - c, y - s, x + c, y + s, value)
    line(x + s, y - c, x - s, y + c, value)
  }
  if ([1, 2, 6, 9, 11].includes(family)) {
    for (let y = -22; y <= 22; y++) for (let x = -22; x <= 22; x++) {
      const radius = Math.hypot(x, y), theta = Math.atan2(y, x)
      let on = false
      if (family === 1) on = (Math.abs(x) + Math.abs(y) + phase * (variant % 2 ? -5 : 5)) % (6 + variant % 5) < 1.5
      if (family === 2) on = Math.cos(theta * (2 + variant % 5) + radius * .3 - angle * 2) > .72
      // Cover the full face, changing checker phase on the shared beat.
      if (family === 6) on = (Math.floor((x + 22) / 3) + Math.floor((y + 22) / 3) + Math.floor(clockPhase)) % 2 === 0
      if (family === 9) on = Math.abs(radius - (phase * 5 % 25)) < .8 || (Math.abs(Math.sin(theta - angle)) < .035 && radius > 5) || (Math.abs(x) < 1 && Math.abs(y) < 4)
      if (family === 11) {
        const wave = Math.round(Math.sin(y * .22 + angle) * 3)
        const gx = ((x + 24 + wave) % 7 + 7) % 7, gy = ((y + 24 + Math.floor(phase * 3)) % 7 + 7) % 7
        on = (gx === 3 && gy >= 1 && gy <= 5) || (gy === 3 && gx >= 1 && gx <= 5)
      }
      if (on) set(x + 22, y + 22)
    }
  } else if (family === 0) {
    const stage = Math.floor(phase) % 4, p = phase % 1
    if (stage === 0 || stage === 2) {
      const rotation = stage === 2 ? p * Math.PI / 4 : 0
      const c = Math.cos(rotation), s = Math.sin(rotation)
      const thickness = stage === 0 ? 7 * (1 - p) + .5 : 7 + 9 * Math.abs(Math.sin(rotation * 2))
      // Sample full-length bars through the entire face, clipped only by the
      // physical cross. Rotated bars retain reach to all four arm tips.
      for (let y = -22; y <= 22; y++) for (let x = -22; x <= 22; x++) {
        const u = x * c + y * s, v = -x * s + y * c
        if (Math.abs(u) <= thickness || Math.abs(v) <= thickness) set(x + 22, y + 22)
      }
    }
    if (stage === 1) for (let d = -2; d <= 2; d++) line(0, 22 + d, 44, 22 + d)
    if (stage === 3) for (let y = 2; y < 45; y += 8) for (let x = 2; x < 45; x += 8) plus(x, y, 2, variant * .2)
  } else if (family === 3) {
    const trace = [0, 0, 0, -2, 0, 0, 4, -12, 8, 0, 0, -2, 0, 0, 0, 0]
    for (let x = 0; x < 44; x++) {
      const sample = (x + Math.floor(phase * 8)) % trace.length
      line(x, 22 + trace[sample]!, x + 1, 22 + trace[(sample + 1) % trace.length]!)
    }
  }
  // Short deterministic line corruption, confined to a band of LEDs.
  if (index % 3 === 1 && phase % 4 > 3.75) {
    const old = frame.slice()
    for (let y = 19; y < 24; y++) for (let x = 0; x < 45; x++) frame[y * 45 + x] = old[y * 45 + (x + 7) % 45]!
  }
  return frame
}
