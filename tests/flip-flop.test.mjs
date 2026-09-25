import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { flipFlopFrame, flipFlopPreset, createFlipFlopScene } from '../app/utils/flipFlopRenderer.ts'

test('Flip 01 reveals the next printed face each slot and loops after the sequence', () => {
  const slot = flipFlopPreset.duration / flipFlopPreset.count
  for (let step = 0; step < 6; step++) {
    const start = flipFlopFrame(step * slot)
    assert.equal(start.front, step)
    assert.equal(start.back, (step + 1) % 6)
    assert.equal(start.rotation, 0)
    assert.ok(Math.abs(flipFlopFrame((step + .5) * slot).rotation - Math.PI / 2) < 1e-6)
    assert.ok(Math.abs(flipFlopFrame((step + 1) * slot - 1e-7).rotation - Math.PI) < 1e-5)
  }
  assert.deepEqual(flipFlopFrame(flipFlopPreset.duration), flipFlopFrame(0))
})

test('front and reverse have opposing normals and stay fitted at mobile and desktop aspects', () => {
  const flip = createFlipFlopScene()
  try {
    assert.equal(flip.front.material.side, THREE.FrontSide)
    assert.equal(flip.back.material.side, THREE.FrontSide)
    assert.equal(flip.back.rotation.y, Math.PI)
    for (const aspect of [.5, 1, 2]) {
      flip.resize(aspect)
      const height = 2 * flip.camera.position.z * Math.tan(THREE.MathUtils.degToRad(flip.camera.fov / 2))
      assert.ok(flip.panel.scale.x <= Math.min(height, height * aspect))
      for (const time of [.1, .4, .6, .9]) {
        flip.update(time)
        flip.scene.updateMatrixWorld(true)
        const normals = [flip.front, flip.back].map(mesh => new THREE.Vector3(0, 0, 1).applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion())))
        assert.ok(normals[0].dot(normals[1]) < -.9999)
      }
    }
  } finally { flip.dispose() }
})
