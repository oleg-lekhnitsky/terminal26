import { renderBudget } from './renderBudget.ts'
import * as THREE from 'three'
import { configureTextFont, type TextAppearance } from './textRenderer'

// Carousel palette, reversed so the truck reads as one flat graphic form.
export const truckPalette = Object.freeze({ background: '#38214a', body: '#c8b9eb', ink: '#38214a' })

export function createTruckRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setClearColor(0, 0)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, .8, .1, 30)
  camera.position.set(0, 0, 8)
  const truck = new THREE.Group()
  scene.add(truck)
  const body = new THREE.MeshBasicMaterial({ color: truckPalette.body })
  const ink = new THREE.MeshBasicMaterial({ color: truckPalette.ink })
  const print = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const geometries: THREE.BufferGeometry[] = []
  function add(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], x: number, y: number, z: number) {
    geometries.push(geometry)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    truck.add(mesh)
    return mesh
  }
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material = body) =>
    add(new THREE.BoxGeometry(w, h, d), material, x, y, z)
  // Cargo sides share an outward-facing print; no mirrored backface lettering.
  add(new THREE.BoxGeometry(2.45, 1.45, 1.08), [body, body, body, body, print, print], -.58, .2, 0)
  box(3.8, .17, .92, .02, -.60, 0)
  // Sloped windshield and short hood make the cab distinct from the cargo box.
  const cab = new THREE.Shape()
  cab.moveTo(.72, -.54); cab.lineTo(1.94, -.54); cab.lineTo(1.94, -.04)
  cab.lineTo(1.69, .06); cab.lineTo(1.43, .71); cab.lineTo(.72, .71); cab.closePath()
  add(new THREE.ExtrudeGeometry(cab, { depth: 1.02, bevelEnabled: false, steps: 1 }), body, 0, 0, -.51)
  for (const side of [-1, 1]) {
    const window = new THREE.Shape()
    window.moveTo(.85, .15); window.lineTo(1.55, .15)
    window.lineTo(1.35, .59); window.lineTo(.85, .59); window.closePath()
    const glass = add(new THREE.ShapeGeometry(window), new THREE.MeshBasicMaterial({ color: truckPalette.ink, side: THREE.DoubleSide }), 0, 0, side * .515)
    glass.name = 'cab-window'
    box(.18, .035, .016, .98, .015, side * .524, ink)
    for (const x of [-1.23, 1.30]) {
      const wheel = add(new THREE.CylinderGeometry(.32, .32, .16, 40), ink, x, -.65, side * .54)
      wheel.rotation.x = Math.PI / 2
      const hub = add(new THREE.CylinderGeometry(.135, .135, .17, 32), body, x, -.65, side * .55)
      hub.rotation.x = Math.PI / 2
    }
  }
  // Front windshield lies on the slanted cab surface.
  const windscreen = add(new THREE.PlaneGeometry(.76, .47), ink, 1.565, .36, 0)
  windscreen.rotation.set(0, Math.PI / 2, 0)
  windscreen.rotateX(-.38)
  box(.025, .11, .20, 1.957, -.22, -.33, ink)
  box(.025, .11, .20, 1.957, -.22, .33, ink)
  box(.09, .12, 1.08, 1.96, -.50, 0)
  let texture: THREE.CanvasTexture | undefined
  return {
    update(appearance: TextAppearance, _label: string) {
      const sheet = document.createElement('canvas')
      sheet.width = 1536; sheet.height = 900
      const ctx = sheet.getContext('2d')!
      ctx.fillStyle = truckPalette.body; ctx.fillRect(0, 0, 1536, 900)
      ctx.fillStyle = truckPalette.ink
      ctx.textAlign = 'left'
      configureTextFont(ctx, appearance, 54)
      ctx.fillText('AB TERMINAL', 90, 140, 1356)
      const heading = ['TYPE', 'DELIVERY']
      configureTextFont(ctx, appearance, 240)
      const widest = Math.max(...heading.map(line => ctx.measureText(line).width), 1)
      const headingSize = 240 * Math.min(1, 1356 / widest)
      const lineHeight = headingSize * .9
      configureTextFont(ctx, appearance, headingSize)
      heading.forEach((line, index) => ctx.fillText(line, 90, 440 + index * lineHeight))
      texture?.dispose()
      texture = new THREE.CanvasTexture(sheet)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
      print.map = texture; print.needsUpdate = true
    },
    draw(rotation: number, tilt = .24, roll = 0) {
      const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight)
      const ratio = Math.min(window.devicePixelRatio || 1, renderBudget.pixelRatio)
      if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
        renderer.setPixelRatio(ratio); renderer.setSize(width, height, false)
        camera.aspect = width / height; camera.updateProjectionMatrix()
      }
      truck.rotation.set(tilt, rotation, roll, 'ZYX')
      renderer.render(scene, camera)
    },
    dispose() {
      texture?.dispose(); geometries.forEach(g => g.dispose())
      const materials = new Set<THREE.Material>()
      truck.traverse(object => { if (object instanceof THREE.Mesh) for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material) })
      materials.forEach(m => m.dispose()); renderer.dispose()
    },
  }
}
