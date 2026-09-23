import { renderBudget } from './renderBudget.ts'
import * as THREE from 'three'
import { configureTextFont, centeredTextBaseline, type TextAppearance } from './textRenderer.ts'
export const carousel3d06 = Object.freeze({
  count: 12, planeSize: 500, planeRotation: 90, distance: 660,
  rotationX: 90, rotationY: -90, rotationZ: 0, perspective: 160,
  duration: 5, orbitRadius: 0, offsetY: -203,
  hemisphereIntensity: 2.1, keyIntensity: 2.4,
  lightX: -3, lightY: 4, lightZ: 5, roughness: 0.72,
})
const wheelPreset = carousel3d06


// Matches Carousel 3D 06 in the local Figma Library renderer, normalized to width 1.
export function createCarousel3dScene() {
  const scene = new THREE.Scene()
  const fov = THREE.MathUtils.radToDeg(2 * Math.atan(1.125 / (wheelPreset.perspective / 100)))
  const camera = new THREE.PerspectiveCamera(fov, 4 / 5, 0.1, 100)
  camera.zoom = 1.3
  camera.updateProjectionMatrix()
  camera.position.z = -wheelPreset.distance / wheelPreset.planeSize
  camera.lookAt(0, 0, 0)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, wheelPreset.hemisphereIntensity))
  const key = new THREE.DirectionalLight(0xffffff, wheelPreset.keyIntensity)
  key.position.set(wheelPreset.lightX, wheelPreset.lightY, wheelPreset.lightZ)
  scene.add(key)
  const orientation = new THREE.Group()
  orientation.rotation.order = 'ZYX'
  orientation.rotation.set(...[wheelPreset.rotationX, wheelPreset.rotationY, wheelPreset.rotationZ].map(THREE.MathUtils.degToRad) as [number, number, number])
  const ring = new THREE.Group()
  orientation.add(ring)
  scene.add(orientation)
  const planeWidth = 1, planeHeight = 1
  const twist = THREE.MathUtils.degToRad(wheelPreset.planeRotation)
  const anchoredRadius = (Math.abs(Math.cos(twist)) * planeWidth + Math.abs(Math.sin(twist)) * planeHeight) / 2
  const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight)
  const planes = Array.from({ length: wheelPreset.count }, (_, index) => {
    const angle = index / wheelPreset.count * Math.PI * 2
    const material = new THREE.MeshStandardMaterial({
      transparent: false, depthWrite: true, depthTest: true,
      side: THREE.DoubleSide, roughness: wheelPreset.roughness, metalness: 0,
    })
    const plane = new THREE.Mesh(geometry, material)
    plane.position.set(Math.cos(angle) * anchoredRadius, 0, Math.sin(angle) * anchoredRadius)
    ring.add(plane)
    return plane
  })
  const position = new THREE.Vector3(), quaternion = new THREE.Quaternion()
  const normal = new THREE.Vector3(), view = new THREE.Vector3()
  function update(time: number) {
    ring.rotation.y = Math.max(0, time) / wheelPreset.duration * Math.PI * 2
    planes.forEach((plane, index) => {
      const slotDegrees = index / wheelPreset.count * 360
      plane.rotation.set(0, THREE.MathUtils.degToRad(((180 - slotDegrees) % 180 + 180) % 180), 0)
    })
    scene.updateMatrixWorld(true)
    planes.forEach(plane => {
      plane.getWorldPosition(position)
      plane.getWorldQuaternion(quaternion)
      normal.set(0, 0, 1).applyQuaternion(quaternion)
      view.copy(camera.position).sub(position)
      // Source applies in-plane twist toward the currently visible side.
      plane.rotateZ(twist * (normal.dot(view) < 0 ? -1 : 1))
      // Preset 06 has no depth fade.
      plane.material.opacity = 1
    })
    scene.updateMatrixWorld(true)
    planes.forEach(plane => {
      plane.getWorldPosition(position)
      plane.getWorldQuaternion(quaternion)
      normal.set(0, 0, 1).applyQuaternion(quaternion)
      view.copy(camera.position).sub(position)
      if (normal.dot(view) < 0) plane.rotateY(Math.PI)
    })
    scene.updateMatrixWorld(true)
  }
  function resize(aspect: number) {
    camera.aspect = aspect
    camera.updateProjectionMatrix()
    // Offset is specified in original scene units before plane-width normalization.
    const sourceHeight = 16 * Math.tan(18 * Math.PI / 180)
    const sourcePlaneWidth = Math.min(3.4, sourceHeight * aspect * 0.78) * wheelPreset.planeSize / 600
    orientation.position.y = wheelPreset.offsetY / 100 / sourcePlaneWidth
  }
  resize(camera.aspect)
  update(0)
  return { scene, camera, planes, update, resize, dispose() {
    geometry.dispose()
    planes.forEach(plane => { plane.material.map?.dispose(); plane.material.dispose() })
  } }
}

export function createCarousel3dRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  const wheel = createCarousel3dScene()
  renderer.setClearColor(0x000000, 0)
  return {
    updateFont(appearance: TextAppearance, background: string) {
      const letters = Array.from(appearance.text.toUpperCase().replace(/\s/g, ''))
      if (!letters.length) letters.push('A')
      wheel.planes.forEach((plane, index) => {
        const letter = letters[index % letters.length]!
        const sheet = document.createElement('canvas')
        sheet.width = 512
        sheet.height = 512
        const ctx = sheet.getContext('2d')!
        // Solid specimen faces occlude the densely packed planes behind them.
        ctx.fillStyle = background
        ctx.fillRect(0, 0, sheet.width, sheet.height)
        configureTextFont(ctx, appearance, 100)
        const measured = ctx.measureText(letter)
        const size = Math.min(440 / Math.max(1, measured.width), 440 / Math.max(1, measured.actualBoundingBoxAscent + measured.actualBoundingBoxDescent)) * 100
        configureTextFont(ctx, appearance, size)
        ctx.fillStyle = appearance.color
        ctx.textAlign = 'center'
        ctx.fillText(letter, 256, centeredTextBaseline(512, [ctx.measureText(letter)]))
        const texture = new THREE.CanvasTexture(sheet)
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
        plane.material.map?.dispose()
        plane.material.map = texture
        plane.material.needsUpdate = true
      })
    },
    draw(time: number) {
      const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight)
      const ratio = Math.min(window.devicePixelRatio || 1, renderBudget.pixelRatio)
      if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
        renderer.setPixelRatio(ratio)
        renderer.setSize(width, height, false)
        wheel.resize(width / height)
      }
      wheel.update(time)
      renderer.render(wheel.scene, wheel.camera)
    },
    dispose() { wheel.dispose(); renderer.dispose() },
  }
}
