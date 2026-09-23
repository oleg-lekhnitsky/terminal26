type Point = { x: number; y: number }
export function touchPair(a: Point, b: Point) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)), angle: Math.atan2(b.y - a.y, b.x - a.x) }
}
export function pinchTransform(start: ReturnType<typeof touchPair>, next: ReturnType<typeof touchPair>, center: Point) {
  const ratio = next.distance / start.distance
  const angle = Math.atan2(Math.sin(next.angle - start.angle), Math.cos(next.angle - start.angle))
  const x = center.x - start.x, y = center.y - start.y
  return { ratio, angle: angle * 180 / Math.PI, x: next.x + (x * Math.cos(angle) - y * Math.sin(angle)) * ratio, y: next.y + (x * Math.sin(angle) + y * Math.cos(angle)) * ratio }
}
