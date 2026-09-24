export default defineNuxtPlugin((nuxtApp) => {
  const frames = ['/favicon/frame-0.png', '/favicon/frame-1.png']
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  const safari = /^((?!chrome|chromium|android).)*safari/i.test(navigator.userAgent)
  let timer: ReturnType<typeof setInterval> | undefined
  let index = 0
  const setIcon = (src: string) => {
    const icon = document.querySelector<HTMLLinkElement>('#terminal-favicon')
    if (icon) icon.href = src
  }
  function sync() {
    clearInterval(timer)
    if (safari || motion.matches || document.hidden) {
      index = 0
      setIcon(frames[0]!)
      return
    }
    timer = setInterval(() => {
      index = (index + 1) % frames.length
      setIcon(frames[index]!)
    }, 120)
  }
  nuxtApp.hook('app:mounted', () => {
    if (!safari && !motion.matches) frames.forEach(src => { const image = new Image(); image.src = src })
    document.addEventListener('visibilitychange', sync)
    motion.addEventListener('change', sync)
    sync()
  })
  function cleanup() {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', sync)
    motion.removeEventListener('change', sync)
  }
  nuxtApp.vueApp.onUnmount(cleanup)
  if (import.meta.hot) import.meta.hot.dispose(cleanup)
})
