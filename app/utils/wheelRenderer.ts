import { renderBudget } from './renderBudget.ts'
import * as THREE from 'three'
import { configureTextFont, centeredTextBaseline, type TextAppearance } from './textRenderer.ts'
import { wheelPosters, wheelPreset, wheelRotation } from './specimenWheel.ts'

// Matches Carousel 3D 07 in the local Figma Library renderer, normalized to width 1.
export function createWheelScene() {
  const scene = new THREE.Scene()
  const fov = THREE.MathUtils.radToDeg(2 * Math.atan(1.125 / (wheelPreset.perspective / 100)))
  const camera = new THREE.PerspectiveCamera(fov, 4 / 5, 0.1, 100)
  camera.position.z = -wheelPreset.distance / wheelPreset.planeSize
  camera.lookAt(0, 0, 0)
  scene.add(new THREE.HemisphereLight(0xc7d6ef, 0x080a10, wheelPreset.hemisphereIntensity))
  // A fixed, feathered beam gives each flat poster a spatial light gradient.
  const key = new THREE.SpotLight(0xffffff, wheelPreset.keyIntensity, 0,
    THREE.MathUtils.degToRad(wheelPreset.lightAngle), wheelPreset.lightPenumbra, 0)
  key.position.set(wheelPreset.lightX, wheelPreset.lightY, wheelPreset.lightZ)
  key.target.position.set(0, wheelPreset.lightTargetY, 0)
  scene.add(key, key.target)
  const orientation = new THREE.Group()
  orientation.rotation.order = 'ZYX'
  orientation.rotation.set(...[wheelPreset.rotationX, wheelPreset.rotationY, wheelPreset.rotationZ].map(THREE.MathUtils.degToRad) as [number, number, number])
  const ring = new THREE.Group()
  orientation.add(ring)
  scene.add(orientation)
  const planeWidth = 1, planeHeight = 1.25
  const twist = THREE.MathUtils.degToRad(wheelPreset.planeRotation)
  const anchoredRadius = (Math.abs(Math.cos(twist)) * planeWidth + Math.abs(Math.sin(twist)) * planeHeight) / 2
  const radius = wheelPreset.cornerRadius
  const halfWidth = planeWidth / 2, halfHeight = planeHeight / 2
  const outline = new THREE.Shape()
  outline.absarc(halfWidth - radius, -halfHeight + radius, radius, -Math.PI / 2, 0, false)
  outline.absarc(halfWidth - radius, halfHeight - radius, radius, 0, Math.PI / 2, false)
  outline.absarc(-halfWidth + radius, halfHeight - radius, radius, Math.PI / 2, Math.PI, false)
  outline.absarc(-halfWidth + radius, -halfHeight + radius, radius, Math.PI, Math.PI * 1.5, false)
  outline.closePath()
  const geometry = new THREE.ShapeGeometry(outline, 8)
  // ShapeGeometry uses world coordinates for UVs; preserve the full poster mapping.
  const vertices = geometry.getAttribute('position'), uvs = geometry.getAttribute('uv')
  for (let i = 0; i < vertices.count; i++) {
    uvs.setXY(i, (vertices.getX(i) + halfWidth) / planeWidth, (vertices.getY(i) + halfHeight) / planeHeight)
  }
  const planes = wheelPosters.map((_, index) => {
    const angle = index / wheelPreset.count * Math.PI * 2
    const material = new THREE.MeshStandardMaterial({
      transparent: true, depthWrite: true, depthTest: true, alphaTest: 0.001,
      side: THREE.DoubleSide, roughness: wheelPreset.roughness, metalness: 0,
      // Two-pass transparency reverses winding for the back pass, making
      // gl_FrontFacing true on both sides and leaking mirrored artwork.
      forceSinglePass: true,
    })
    // Let the fixed spotlight shade the entire orbit, including the upper stack.
    // Only the unprinted reverse is black; printed faces retain spatial falloff.
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <opaque_fragment>', `
          if (!gl_FrontFacing) outgoingLight = vec3(0.0);
          #include <opaque_fragment>`)
    }
    material.customProgramCacheKey = () => 'wheel-black-reverse-spotlight-v3'
    const plane = new THREE.Mesh(geometry, material)
    plane.position.set(Math.cos(angle) * anchoredRadius, 0, Math.sin(angle) * anchoredRadius)
    ring.add(plane)
    return plane
  })
  const position = new THREE.Vector3(), quaternion = new THREE.Quaternion()
  const normal = new THREE.Vector3(), view = new THREE.Vector3()
  const posterUp = new THREE.Vector3()
  function update(time: number) {
    ring.rotation.y = wheelRotation(time)
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
      // Present the print without reflecting its UVs. Lighting follows the
      // surface angle to the fixed spotlight throughout the orbit.
      if (normal.dot(view) < 0) plane.rotateY(Math.PI)
      // A half-turn in the poster's own plane preserves its silhouette and side,
      // but stops the printed front being presented upside down.
      plane.getWorldQuaternion(quaternion)
      posterUp.set(0, 1, 0).applyQuaternion(quaternion)
      if (posterUp.dot(camera.up) < 0) plane.rotateZ(Math.PI)
      // Radius=0 uses the original minimum depth range, not a radial vignette.
      plane.material.opacity = 1 - THREE.MathUtils.clamp(position.z / 0.01, 0, 1)
    })
    scene.updateMatrixWorld(true)
  }
  update(0)
  return { scene, camera, planes, update, dispose() {
    geometry.dispose()
    planes.forEach(plane => { plane.material.map?.dispose(); plane.material.dispose() })
  } }
}

export function createWheelRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  const wheel = createWheelScene()
  renderer.setClearColor(0x000000, 0)
  return {
    updateFont(appearance: TextAppearance) {
      wheel.planes.forEach((plane, index) => {
        const poster = wheelPosters[index]!
        const sheet = document.createElement('canvas')
        sheet.width = 640
        sheet.height = 800
        const ctx = sheet.getContext('2d')!
        ctx.fillStyle = poster.color
        ctx.fillRect(0, 0, 640, 800)
        ctx.fillStyle = poster.ink
        configureTextFont(ctx, { ...appearance, letterSpacing: 0 }, 20)
        ctx.fillText('AB TERMINAL', 42, 58)
        ctx.textAlign = 'right'
        ctx.fillText(String(index + 1).padStart(2, '0'), 598, 58)
        ctx.textAlign = 'left'
        ctx.fillText('A STUDY IN TYPE', 42, 754)
        const lines = poster.text.split('\n')
        configureTextFont(ctx, appearance, 100)
        const widest = Math.max(...lines.map(line => ctx.measureText(line).width), 1)
        const size = Math.min(556 / widest * 100, 470 / lines.length, poster.text.length === 2 ? 290 : 120)
        configureTextFont(ctx, appearance, size)
        const advance = size * 1.1
        const bounds = lines.map(line => ctx.measureText(line))
        const baseline = centeredTextBaseline(800, bounds, advance)
        lines.forEach((line, i) => ctx.fillText(line, 42, baseline + i * advance))
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
        wheel.camera.aspect = width / height
        wheel.camera.updateProjectionMatrix()
      }
      wheel.update(time)
      renderer.render(wheel.scene, wheel.camera)
    },
    dispose() { wheel.dispose(); renderer.dispose() },
  }
}
