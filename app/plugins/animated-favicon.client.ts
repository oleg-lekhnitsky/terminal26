export default defineNuxtPlugin((nuxtApp) => {
  const frames = ['/favicon/frame-0.png', '/favicon/frame-1.png']
  const frameDuration = 800
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  const userAgent = navigator.userAgent
  const webkit = /AppleWebKit/i.test(userAgent) && !/Chrome|Chromium|Edg|OPR|Android/i.test(userAgent)
  let timer: ReturnType<typeof setInterval> | undefined
  let index = 0
  let ready = false
  let disposed = false
  let loading: Promise<void> | undefined
  const setIcon = (src: string) => {
    const icon = document.querySelector<HTMLLinkElement>('#terminal-favicon')
    if (icon) icon.href = src
  }
  function reset() {
    clearInterval(timer)
    timer = undefined
    index = 0
    setIcon(frames[0]!)
  }
  function preload() {
    if (loading) return
    loading = Promise.all(frames.map(src => new Promise<void>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve()
      image.onerror = () => reject(new Error(`Unable to load favicon: ${src}`))
      image.src = src
    }))).then(() => {
      ready = true
      sync()
    }).catch(() => {
      // Keep the static icon if a frame cannot be loaded.
      if (!disposed) reset()
    })
  }
  function sync() {
    if (disposed) return
    if (webkit || motion.matches) {
      reset()
      return
    }
    if (document.hidden) {
      // Pause on the current frame rather than flashing back to the first one.
      clearInterval(timer)
      timer = undefined
      return
    }
    if (!ready) {
      preload()
      return
    }
    // Repeated visibility events must not reset a frame or add another timer.
    if (timer !== undefined) return
    timer = setInterval(() => {
      index = (index + 1) % frames.length
      setIcon(frames[index]!)
    }, frameDuration)
  }
  nuxtApp.hook('app:mounted', () => {
    if (disposed) return
    document.addEventListener('visibilitychange', sync)
    motion.addEventListener('change', sync)
    sync()
  })
  function cleanup() {
    disposed = true
    reset()
    document.removeEventListener('visibilitychange', sync)
    motion.removeEventListener('change', sync)
  }
  nuxtApp.vueApp.onUnmount(cleanup)
  if (import.meta.hot) import.meta.hot.dispose(cleanup)
})
