// Rendering quality is independent of the shared animation clock and easing.
export const renderBudget = Object.freeze({ fps: 30, matrixFps: 24, pixelRatio: 1.5, silhouetteSize: 180 })

export function createFrameGate(fps: number) {
  const interval = 1000 / fps
  let last: number | undefined
  return {
    reset() { last = undefined },
    shouldDraw(now: number) {
      if (last === undefined || now < last) { last = now; return true }
      const elapsed = now - last
      if (elapsed + .001 < interval) return false
      // Preserve the remainder so 24/30fps stays consistent on 60/120Hz screens.
      last += Math.floor((elapsed + .001) / interval) * interval
      return true
    },
  }
}
