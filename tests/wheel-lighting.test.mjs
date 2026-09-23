import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createWheelScene } from '../app/utils/wheelRenderer.ts'
import { wheelPreset, wheelRotation, wheelPosters } from '../app/utils/specimenWheel.ts'

test('wheel performs a complete Flow-eased revolution at its configured duration', () => {
  assert.equal(wheelRotation(0), 0)
  assert.ok(Math.abs(wheelRotation(wheelPreset.duration / 2) - Math.PI) < 1e-6)
  assert.equal(wheelRotation(wheelPreset.duration), Math.PI * 2)
  assert.ok(Math.abs(wheelRotation(wheelPreset.duration - 1e-6) - wheelRotation(wheelPreset.duration + 1e-6)) < 1e-4)
})

test('wheel keeps artwork readable through the orbit with fixed lighting and depth fade', () => {
  const wheel = createWheelScene()
  try {
    assert.equal(wheel.planes.length, wheelPosters.length)
    assert.equal(wheel.camera.position.z, -wheelPreset.distance / wheelPreset.planeSize)
    const lights = wheel.scene.children.filter(child => child.isLight)
    assert.equal(lights.length, 2)
    assert.ok(lights.some(light => light.isHemisphereLight && light.intensity === wheelPreset.hemisphereIntensity))
    const key = lights.find(light => light.isSpotLight)
    assert.deepEqual(key.position.toArray(), [wheelPreset.lightX, wheelPreset.lightY, wheelPreset.lightZ])
    assert.equal(key.intensity, wheelPreset.keyIntensity)
    assert.equal(key.penumbra, 1)
    assert.deepEqual(key.target.position.toArray(), [0, wheelPreset.lightTargetY, 0])
    const twist = THREE.MathUtils.degToRad(wheelPreset.planeRotation)
    const radius = (Math.abs(Math.cos(twist)) + Math.abs(Math.sin(twist)) * 1.25) / 2
    for (const time of Array.from({ length: 120 }, (_, i) => i / 120 * wheelPreset.duration)) {
      wheel.update(time)
      assert.deepEqual(key.position.toArray(), [wheelPreset.lightX, wheelPreset.lightY, wheelPreset.lightZ])
      for (const plane of wheel.planes) {
        assert.ok(Math.abs(Math.hypot(plane.position.x, plane.position.z) - radius) < 1e-10)
        assert.equal(plane.material.roughness, wheelPreset.roughness)
        assert.equal(plane.material.depthWrite, true)
        assert.equal(plane.material.side, THREE.DoubleSide)
        assert.equal(plane.material.forceSinglePass, true, 'Backface winding must remain intact for the black-reverse shader')
        const position = plane.getWorldPosition(new THREE.Vector3())
        assert.ok(Math.abs(plane.material.opacity - (1 - THREE.MathUtils.clamp(position.z / 0.01, 0, 1))) < 1e-8)
        const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(plane.getWorldQuaternion(new THREE.Quaternion()))
        const posterUp = new THREE.Vector3(0, 1, 0).applyQuaternion(plane.getWorldQuaternion(new THREE.Quaternion()))
        assert.ok(posterUp.dot(wheel.camera.up) >= -1e-8, 'Printed tops should stay upright without reflecting the texture')
        const facing = normal.dot(wheel.camera.position.clone().sub(position))
        assert.ok(facing >= -1e-8, 'Visible artwork must face the camera rather than exposing mirrored or black reverse faces')
      }
    }
  } finally { wheel.dispose() }
})
