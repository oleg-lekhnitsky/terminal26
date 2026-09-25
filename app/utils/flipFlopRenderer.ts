import * as THREE from 'three'
import { renderBudget } from './renderBudget.ts'
import { configureTextFont, centeredTextBaseline, flow, type TextAppearance } from './textRenderer.ts'

// Local Figma Library: Flip Flop / Flip 01 (test-01).
export const flipFlopPreset = Object.freeze({
  count: 6, duration: 4.8, planeSize: .8, viewportFill: .82,
  perspective: 36, distance: 5, roughness: .72, cornerRadius: .045,
  hemisphereIntensity: 2.1, keyIntensity: 2.4,
})

export function flipFlopFrame(time: number, count = flipFlopPreset.count) {
  const faces = Math.max(2, count)
  const position = Math.max(0, time) / (flipFlopPreset.duration / faces)
  const step = Math.floor(position)
  return { front: step % faces, back: (step + 1) % faces, rotation: flow(position - step) * Math.PI }
}

export function createFlipFlopScene() {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(flipFlopPreset.perspective, 1, .1, 100)
  camera.position.z = flipFlopPreset.distance
  scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, flipFlopPreset.hemisphereIntensity))
  const key = new THREE.DirectionalLight(0xffffff, flipFlopPreset.keyIntensity)
  key.position.set(-3, 4, 5)
  scene.add(key)
  const panel = new THREE.Group()
  const radius = flipFlopPreset.cornerRadius
  const edge = .5 - radius
  const outline = new THREE.Shape()
  outline.absarc(edge, -edge, radius, -Math.PI / 2, 0, false)
  outline.absarc(edge, edge, radius, 0, Math.PI / 2, false)
  outline.absarc(-edge, edge, radius, Math.PI / 2, Math.PI, false)
  outline.absarc(-edge, -edge, radius, Math.PI, Math.PI * 1.5, false)
  outline.closePath()
  const geometry = new THREE.ShapeGeometry(outline, 8)
  // Preserve the square texture mapping on both rounded faces.
  const vertices = geometry.getAttribute('position'), uvs = geometry.getAttribute('uv')
  for (let i = 0; i < vertices.count; i++) {
    uvs.setXY(i, vertices.getX(i) + .5, vertices.getY(i) + .5)
  }
  const makeFace = (back: boolean) => {
    const material = new THREE.MeshStandardMaterial({
      side: THREE.FrontSide, roughness: flipFlopPreset.roughness, metalness: 0,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.y = back ? Math.PI : 0
    mesh.position.z = back ? -.001 : .001
    panel.add(mesh)
    return mesh
  }
  const front = makeFace(false), back = makeFace(true)
  scene.add(panel)
  function resize(aspect: number) {
    camera.aspect = aspect
    camera.updateProjectionMatrix()
    const viewportHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const size = Math.min(viewportHeight, viewportHeight * aspect) * flipFlopPreset.viewportFill * flipFlopPreset.planeSize
    panel.scale.setScalar(size)
  }
  function update(time: number, count = flipFlopPreset.count) {
    const frame = flipFlopFrame(time, count)
    panel.rotation.y = frame.rotation
    return frame
  }
  resize(1)
  return { scene, camera, panel, front, back, resize, update, dispose() {
    geometry.dispose()
    front.material.dispose()
    back.material.dispose()
  } }
}

export function createFlipFlopRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setClearColor(0, 0)
  const flip = createFlipFlopScene()
  let textures: THREE.CanvasTexture[] = []
  function setFaces(time: number) {
    const frame = flip.update(time, textures.length || flipFlopPreset.count)
    flip.front.material.map = textures[frame.front] ?? null
    flip.back.material.map = textures[frame.back] ?? null
  }
  return {
    updateFont(appearance: TextAppearance, background: string) {
      const letters = Array.from(appearance.text.toUpperCase().replace(/\s/g, '')).slice(0, flipFlopPreset.count)
      if (!letters.length) letters.push('A')
      if (letters.length === 1) letters.push(letters[0]!)
      const next = letters.map((letter, index) => {
        const sheet = document.createElement('canvas')
        sheet.width = sheet.height = 640
        const ctx = sheet.getContext('2d')!
        // Alternating ink/paper makes the two printed sides easy to read.
        ctx.fillStyle = index % 2 ? appearance.color : background
        ctx.fillRect(0, 0, 640, 640)
        configureTextFont(ctx, appearance, 100)
        const bounds = ctx.measureText(letter)
        const size = 100 * Math.min(490 / Math.max(1, bounds.width), 490 / Math.max(1, bounds.actualBoundingBoxAscent + bounds.actualBoundingBoxDescent))
        configureTextFont(ctx, appearance, size)
        ctx.textAlign = 'center'
        ctx.fillStyle = index % 2 ? background : appearance.color
        ctx.fillText(letter, 320, centeredTextBaseline(640, [ctx.measureText(letter)]))
        const texture = new THREE.CanvasTexture(sheet)
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
        return texture
      })
      textures.forEach(texture => texture.dispose())
      textures = next
      setFaces(0)
      flip.front.material.needsUpdate = flip.back.material.needsUpdate = true
    },
    draw(time: number) {
      const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight)
      const ratio = Math.min(window.devicePixelRatio || 1, renderBudget.pixelRatio)
      if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
        renderer.setPixelRatio(ratio)
        renderer.setSize(width, height, false)
        flip.resize(width / height)
      }
      setFaces(time)
      renderer.render(flip.scene, flip.camera)
    },
    dispose() { textures.forEach(texture => texture.dispose()); flip.dispose(); renderer.dispose() },
  }
}
