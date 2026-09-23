import test from 'node:test'
import assert from 'node:assert/strict'
import { createCarousel3dScene } from '../app/utils/carousel3dRenderer.ts'

test('Carousel 3D 06 keeps its 33-plane geometry and completes a continuous five-second turn', () => {
  const model = createCarousel3dScene()
  try {
    assert.equal(model.planes.length, 33)
    assert.ok(model.planes.every(plane => !plane.material.transparent && plane.material.depthWrite))
    assert.equal(model.camera.position.z, -660 / 250)
    const ring = model.planes[0].parent
    const orientation = ring.parent
    assert.equal(orientation.rotation.x, Math.PI / 2)
    assert.equal(orientation.rotation.y, -Math.PI / 2)
    model.update(1.25)
    assert.equal(ring.rotation.y, Math.PI / 2)
    model.update(5)
    assert.equal(ring.rotation.y, Math.PI * 2)
    assert.ok(model.planes.every(plane => plane.material.opacity === 1))
    model.resize(0.5)
    assert.equal(model.camera.aspect, 0.5)
    assert.equal(orientation.position.y, 0)
  } finally { model.dispose() }
})
