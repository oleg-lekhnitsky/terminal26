import { renderBudget } from './renderBudget.ts'
import * as THREE from 'three'
import { configureTextFont, type TextAppearance } from './textRenderer'

export const coffeePalette = Object.freeze({
  background: '#db3b32', pack: '#fff0d9', fold: '#fff0d9', ink: '#db3b32',
})

// Width/depth cross-sections form a flat bottom, full pouch, pinched neck and seal.
export const coffeeProfile = [
  [-1.25, .67, .08], [-1.13, .77, .25], [-.9, .81, .30],
  [.65, .77, .24], [1.03, .70, .025], [1.20, .70, .018], [1.25, .70, .018],
] as const

export function createCoffeeRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setClearColor(0, 0)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, .8, .1, 20)
  camera.position.z = 4.7
  const pack = new THREE.Group()
  scene.add(pack)
  const face = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  const fold = new THREE.MeshBasicMaterial({ color: coffeePalette.fold, side: THREE.DoubleSide })
  const seal = new THREE.MeshBasicMaterial({ color: coffeePalette.pack, side: THREE.DoubleSide })
  const geometries: THREE.BufferGeometry[] = []
  const ring = ([y, w, d]: readonly number[]) => [
    [-w!, y!, -d!], [0, y!, -d! * 1.06], [w!, y!, -d!], [w! * .84, y!, 0],
    [w!, y!, d!], [0, y!, d! * 1.06], [-w!, y!, d!], [-w! * .84, y!, 0],
  ]
  const rings = coffeeProfile.map(ring)
  function mesh(vertices: number[], uvs: number[], material: THREE.Material) {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometries.push(geometry)
    pack.add(new THREE.Mesh(geometry, material))
  }
  for (let side = 0; side < 8; side++) {
    const vertices: number[] = [], uvs: number[] = []
    for (let level = 0; level < rings.length - 1; level++) {
      const next = (side + 1) % 8
      const corners = [rings[level]![side]!, rings[level]![next]!, rings[level + 1]![side]!, rings[level + 1]![next]!]
      for (const i of [0, 1, 2, 1, 3, 2]) {
        const p = corners[i]!
        vertices.push(...p)
        uvs.push(.5 + p[0]! / 1.62 * (side < 2 ? -1 : 1), (p[1]! + 1.25) / 2.5)
      }
    }
    mesh(vertices, uvs, [0, 1, 4, 5].includes(side) ? face : fold)
  }
  for (const points of [rings[0]!, rings[rings.length - 1]!]) {
    const vertices: number[] = []
    for (let i = 0; i < 8; i++) vertices.push(0, points[0]![1]!, 0, ...points[i]!, ...points[(i + 1) % 8]!)
    mesh(vertices, new Array(vertices.length / 3 * 2).fill(0), seal)
  }
  let texture: THREE.CanvasTexture | undefined
  return {
    update(appearance: TextAppearance, label: string) {
      const sheet = document.createElement('canvas')
      sheet.width = 1024; sheet.height = 1536
      const ctx = sheet.getContext('2d')!
      ctx.fillStyle = coffeePalette.pack; ctx.fillRect(0, 0, 1024, 1536)
      // Flat printed seal bands, without shadows or outlines.
      ctx.fillStyle = coffeePalette.fold; ctx.fillRect(0, 0, 1024, 95); ctx.fillRect(0, 1450, 1024, 86)
      ctx.fillStyle = coffeePalette.ink; ctx.textAlign = 'center'
      for (const [text, size, y] of [
        ['AB TERMINAL', 42, 300],
        ['RANAK', 300, 1400],
      ] as const) {
        configureTextFont(ctx, appearance, size)
        ctx.fillText(text, 512, y, text === 'RANAK' ? 950 : 870)
      }
      texture?.dispose()
      texture = new THREE.CanvasTexture(sheet)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
      face.map = texture; face.needsUpdate = true
    },
    draw(rotation: number, tilt = .28, roll = .16) {
      const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight)
      const ratio = Math.min(window.devicePixelRatio || 1, renderBudget.pixelRatio)
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        renderer.setPixelRatio(ratio); renderer.setSize(width, height, false)
        camera.aspect = width / height; camera.updateProjectionMatrix()
      }
      pack.rotation.set(tilt, rotation, roll, 'ZYX')
      renderer.render(scene, camera)
    },
    dispose() {
      texture?.dispose(); geometries.forEach(g => g.dispose())
      face.dispose(); fold.dispose(); seal.dispose(); renderer.dispose()
    },
  }
}
