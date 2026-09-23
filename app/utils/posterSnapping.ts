export function snapAxis(center: number, halfExtent: number, extent: number, threshold: number) {
  let value = center
  let guide: number | null = null
  let distance = threshold
  const candidates = [
    { value: extent / 2, guide: extent / 2 },
    { value: halfExtent, guide: 0 },
    { value: extent - halfExtent, guide: extent },
  ]
  for (const candidate of candidates) {
    const delta = Math.abs(candidate.value - center)
    if (delta <= distance) {
      value = candidate.value
      guide = candidate.guide
      distance = delta
    }
  }
  return { value, guide }
}

export function snapRotation(angle: number, force = false, disabled = false) {
  const nearest = Math.round(angle / 15) * 15
  return !disabled && (force || Math.abs(angle - nearest) <= 3) ? nearest : angle
}
