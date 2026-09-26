import { flow } from './textRenderer.ts'

export const wheelPreset = Object.freeze({
  count: 18, planeSize: 380, planeRotation: 90, orbitRadius: 0, cornerRadius: .045,
  distance: 900, perspective: 150, rotationX: 90, rotationY: -90, rotationZ: 0,
  duration: 8.5, lightX: -.2, lightY: .3, lightZ: -2.8,
  lightTargetY: 0, lightAngle: 32, lightPenumbra: 1,
  hemisphereIntensity: .2, keyIntensity: 3.2, roughness: .85, fade: .01,
})

export const wheelPosters = [
  { text: 'WHAT\nTHE\nFONT', color: '#f3eedf', ink: '#252e48' },
  { text: 'Aa', color: '#daf759', ink: '#263219' },
  { text: 'MAKE\nTYPE\nMOVE', color: '#294acb', ink: '#f3eedf' },
  { text: '012\n345\n678', color: '#dc392f', ink: '#f7e8d2' },
  { text: 'Sans\nseriously.', color: '#f0bed0', ink: '#642a46' },
  { text: 'Bb', color: '#daf759', ink: '#473414' },
  { text: 'GOOD\nTYPE\nONLY', color: '#b7d3cb', ink: '#173d35' },
  { text: 'Cc', color: '#c8b9eb', ink: '#38214a' },
    { text: 'Sans\nseriously.', color: '#f0bed0', ink: '#642a46' },
  { text: 'Bb', color: '#daf759', ink: '#473414' },
  { text: 'GOOD\nTYPE\nONLY', color: '#b7d3cb', ink: '#173d35' },
  { text: 'Cc', color: '#c8b9eb', ink: '#38214a' },
    { text: 'Cc', color: '#c8b9eb', ink: '#38214a' },
    { text: 'Sans\nseriously.', color: '#f0bed0', ink: '#642a46' },
  { text: 'Bb', color: '#daf759', ink: '#473414' },
  { text: 'GOOD\nTYPE\nONLY', color: '#b7d3cb', ink: '#173d35' },
  { text: 'Cc', color: '#c8b9eb', ink: '#38214a' },

]

export function wheelRotation(time: number) {
  const cycle = Math.max(0, time) / wheelPreset.duration
  const whole = Math.floor(cycle)
  return (whole + flow(cycle - whole)) * Math.PI * 2
}
