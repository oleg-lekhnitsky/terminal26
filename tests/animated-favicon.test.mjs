import test from 'node:test'
import assert from 'node:assert/strict'

let moduleId = 0
async function setup(t, userAgent = 'AppleWebKit/537.36 Chrome/130 Safari/537.36') {
  const document = new EventTarget()
  document.hidden = false
  const icon = { href: '/favicon/frame-0.png' }
  document.querySelector = () => icon
  const motion = new EventTarget()
  motion.matches = false
  const images = []
  const intervals = new Map()
  const delays = []
  let nextTimer = 0
  let mounted, cleanup
  const globals = {
    document,
    navigator: { userAgent },
    matchMedia: () => motion,
    Image: class { constructor() { images.push(this) } },
    defineNuxtPlugin: plugin => plugin,
    setInterval: (fn, delay) => { const id = ++nextTimer; intervals.set(id, fn); delays.push(delay); return id },
    clearInterval: id => intervals.delete(id),
  }
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
  t.after(() => {
    cleanup?.()
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  })
  const { default: plugin } = await import(`../app/plugins/animated-favicon.client.ts?test=${++moduleId}`)
  plugin({ hook: (name, fn) => { assert.equal(name, 'app:mounted'); mounted = fn }, vueApp: { onUnmount: fn => { cleanup = fn } } })
  mounted()
  return { document, motion, icon, images, intervals, delays, cleanup, mounted,
    load: async () => { images.forEach(image => image.onload()); await new Promise(resolve => setImmediate(resolve)) },
    tick: () => { for (const fn of intervals.values()) fn() },
  }
}

test('waits for all frames, then alternates and restores the icon on cleanup', async t => {
  const env = await setup(t)
  assert.equal(env.images.length, 2)
  assert.equal(env.intervals.size, 0)
  env.images[0].onload()
  await Promise.resolve()
  assert.equal(env.intervals.size, 0)
  await env.load()
  assert.equal(env.intervals.size, 1)
  assert.deepEqual(env.delays, [800])
  env.tick()
  assert.equal(env.icon.href, '/favicon/frame-1.png')
  env.tick()
  assert.equal(env.icon.href, '/favicon/frame-0.png')
  env.tick()
  env.cleanup()
  assert.equal(env.intervals.size, 0)
  assert.equal(env.icon.href, '/favicon/frame-0.png')
})

test('visibility and reduced motion stop and resume a single timer', async t => {
  const env = await setup(t)
  await env.load()
  for (const [target, property, event] of [[env.document, 'hidden', 'visibilitychange'], [env.motion, 'matches', 'change']]) {
    env.tick()
    target[property] = true
    target.dispatchEvent(new Event(event))
    assert.equal(env.intervals.size, 0)
    assert.equal(env.icon.href, target === env.document ? '/favicon/frame-1.png' : '/favicon/frame-0.png')
    target[property] = false
    target.dispatchEvent(new Event(event))
    target.dispatchEvent(new Event(event))
    assert.equal(env.intervals.size, 1)
  }
})

test('duplicate visibility events preserve the current frame and timer', async t => {
  const env = await setup(t)
  await env.load()
  env.tick()
  const timer = [...env.intervals.keys()][0]
  env.document.dispatchEvent(new Event('visibilitychange'))
  assert.equal(env.icon.href, '/favicon/frame-1.png')
  assert.deepEqual([...env.intervals.keys()], [timer])
  assert.deepEqual(env.delays, [800])
})

test('late image loads cannot restart an unmounted plugin', async t => {
  const env = await setup(t)
  env.cleanup()
  await env.load()
  env.mounted()
  env.document.dispatchEvent(new Event('visibilitychange'))
  assert.equal(env.intervals.size, 0)
})

test('failed frames keep the static favicon without starting animation', async t => {
  const env = await setup(t)
  env.images[0].onerror()
  await new Promise(resolve => setImmediate(resolve))
  env.document.dispatchEvent(new Event('visibilitychange'))
  assert.equal(env.intervals.size, 0)
  assert.equal(env.icon.href, '/favicon/frame-0.png')
})

for (const browser of ['Version/18.0 Safari/605.1.15', 'CriOS/130 Mobile/15E148 Safari/604.1', 'FxiOS/132 Mobile/15E148 Safari/605.1.15']) {
  test(`WebKit keeps a static icon: ${browser}`, async t => {
    const env = await setup(t, `AppleWebKit/605.1.15 ${browser}`)
    assert.equal(env.images.length, 0)
    assert.equal(env.intervals.size, 0)
    assert.equal(env.icon.href, '/favicon/frame-0.png')
  })
}
