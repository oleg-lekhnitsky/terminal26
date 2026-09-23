import { flow, motionSystem } from './textRenderer.ts'

export const cubeNormals = [
  [0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0], [0, -1, 0], [0, 1, 0],
] as const

// Take the long, 270-degree route to each upright face.
// Unwrapped angles preserve continuous rotation across the repeating sequence.
const cubeStops = [
  [0, 0], [0, -270], [0, -540], [0, -810],
  [0, -1080], [-270, -1080], [0, -1080], [270, -1080],
] as const

export function cubePose(time: number) {
  const move = motionSystem.enter * 2
  const cycle = move + motionSystem.hold
  const elapsed = Math.max(0, time) / cycle
  const step = Math.floor(elapsed)
  const progress = flow((elapsed - step) * cycle / move)
  const from = cubeStops[step % cubeStops.length]!
  const next = (step + 1) % cubeStops.length
  const to = next === 0 ? [0, -1080] : cubeStops[next]!
  const fullTurns = Math.floor(step / cubeStops.length) * -1080
  const turnX = to[0]! - from[0]
  const turnY = to[1]! - from[1]
  // A curved detour peaks mid-turn and vanishes at both readable poses.
  // The same Flow progress drives the main turn, secondary tilt, and roll.
  const arc = 4 * progress * (1 - progress)
  const direction = step % 2 === 0 ? 1 : -1
  const tilt = 90 / 2
  return {
    x: from[0] + turnX * progress + (turnY ? direction * tilt * arc : 0),
    y: fullTurns + from[1] + turnY * progress + (turnX ? direction * tilt * arc : 0),
    z: arc === 0 ? 0 : direction * tilt / 2 * arc,
  }
}

// A negative normal points away from the viewer. The margin avoids edge-on swaps.
// The outer screen-space Z roll does not change a normal's depth component.
export function cubeHiddenFaces(x: number, y: number) {
  const rx = x * Math.PI / 180
  const ry = y * Math.PI / 180
  return cubeNormals.map(([nx, ny, nz]) =>
    ny * Math.sin(rx) + (-nx * Math.sin(ry) + nz * Math.cos(ry)) * Math.cos(rx) < -0.25,
  )
}

export function alphabetPair(index: number) {
  const upper = String.fromCharCode(65 + (index % 26 + 26) % 26)
  return upper + upper.toLowerCase()
}
