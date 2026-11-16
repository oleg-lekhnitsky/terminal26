import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import outlines from './metallicLetterOutlines.json' with { type: 'json' }
import type { FontVariantId } from './fontVariants'
import { renderBudget } from './renderBudget.ts'

type Command = (string | number)[]

function createScratchTexture() {
  const sheet = document.createElement('canvas')
  sheet.width = sheet.height = 1024
  const ctx = sheet.getContext('2d')!
  ctx.fillStyle = '#606060'
  ctx.fillRect(0, 0, 1024, 1024)
  // Stable, sparse hairlines in surface space, so they rotate with the metal.
  let seed = 2847
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  ctx.lineCap = 'round'
  for (let i = 0; i < 420; i++) {
    const x = random() * 1024, y = random() * 1024
    const length = 8 + random() * 100
    const angle = -.25 + random() * .5 + (i % 5 === 0 ? Math.PI / 3 : 0)
    ctx.strokeStyle = `rgba(230,230,230,${.12 + random() * .32})`
    ctx.lineWidth = .45 + random() * .8
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length)
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(sheet)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)
  return texture
}

export function createMetallicLetterGeometry(style: FontVariantId, index: number) {
  const path = new THREE.ShapePath()
  for (const command of outlines[style][index]! as Command[]) {
    const [kind, ...values] = command
    const n = values as number[]
    if (kind === 'M') path.moveTo(n[0]!, n[1]!)
    else if (kind === 'L') path.lineTo(n[0]!, n[1]!)
    else if (kind === 'Q') path.quadraticCurveTo(n[0]!, n[1]!, n[2]!, n[3]!)
    else if (kind === 'C') path.bezierCurveTo(n[0]!, n[1]!, n[2]!, n[3]!, n[4]!, n[5]!)
    else if (kind === 'Z') path.currentPath?.closePath()
  }
  const geometry = new THREE.ExtrudeGeometry(path.toShapes(false), {
    depth: .12, bevelEnabled: true, bevelThickness: .014, bevelSize: .009,
    bevelSegments: 3, curveSegments: 4, steps: 1,
  })
  // Keep the font's y coordinates so a and b share their original baseline.
  geometry.computeBoundingBox()
  const center = geometry.boundingBox!.getCenter(new THREE.Vector3())
  geometry.translate(-center.x, 0, -center.z)
  geometry.computeBoundingBox()
  return geometry
}

export function createMetallicLettersRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = .85
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, 4 / 5, .1, 30)
  camera.position.set(0, .12, 3.8)
  camera.lookAt(0, 0, 0)
  const studio = new RoomEnvironment()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(studio, .025)
  scene.environment = environment.texture
  studio.dispose()
  pmrem.dispose()
  const scratches = createScratchTexture()
  scratches.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  const material = new THREE.MeshStandardMaterial({
    color: 0xdde2e8, metalness: 1, roughness: .4, envMapIntensity: 1.4,
    roughnessMap: scratches, bumpMap: scratches, bumpScale: -.0012,
  })
  const pair = new THREE.Group()
  scene.add(pair)
  const letters: THREE.Mesh<THREE.ExtrudeGeometry, THREE.MeshStandardMaterial>[] = []
  let disposed = false
  function updateFont(style: FontVariantId) {
    for (const letter of letters) { pair.remove(letter); letter.geometry.dispose() }
    letters.length = 0
    const geometries = [0, 1].map(index => createMetallicLetterGeometry(style, index))
    const widths = geometries.map(geometry => geometry.boundingBox!.max.x - geometry.boundingBox!.min.x)
    const gap = .045
    const total = widths[0]! + widths[1]! + gap
    const bottom = Math.min(...geometries.map(geometry => geometry.boundingBox!.min.y))
    const top = Math.max(...geometries.map(geometry => geometry.boundingBox!.max.y))
    let left = -total / 2
    geometries.forEach((geometry, index) => {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.x = left + widths[index]! / 2
      mesh.position.y = -(bottom + top) / 2
      left += widths[index]! + gap
      letters.push(mesh)
      pair.add(mesh)
    })
    // Fit every style, including the wider italic outlines, inside the card.
    const scale = 1.55 / total
    pair.scale.setScalar(scale)
  }
  return {
    updateFont,
    draw(time: number) {
      if (disposed) return
      const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight)
      const ratio = Math.min(window.devicePixelRatio || 1, renderBudget.pixelRatio)
      if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
        renderer.setPixelRatio(ratio)
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
      }
      pair.rotation.set(-.14 + Math.sin(time * .45) * .1, time * Math.PI / 6 + .3, -.1)
      renderer.render(scene, camera)
    },
    dispose() {
      disposed = true
      for (const letter of letters) letter.geometry.dispose()
      material.dispose()
      scratches.dispose()
      environment.dispose()
      renderer.dispose()
    },
  }
}
