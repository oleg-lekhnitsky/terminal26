import { watch, type Ref } from 'vue'

export function useKeyboardReveal(target: Readonly<Ref<HTMLElement | null>>, active: Ref<boolean>) {
  watch(active, (isActive, _, onCleanup) => {
    if (!isActive || !window.matchMedia('(pointer: coarse)').matches) return
    const viewport = window.visualViewport
    let timer: ReturnType<typeof setTimeout> | undefined
    function stopReveal() {
      clearTimeout(timer)
      viewport?.removeEventListener('resize', scheduleReveal)
      window.removeEventListener('resize', scheduleReveal)
      window.removeEventListener('touchstart', stopReveal)
      window.removeEventListener('wheel', stopReveal)
    }
    function revealEditor() {
      // One adjustment per edit session; never pull the user back as they scroll.
      stopReveal()
      const editor = target.value
      if (!editor || document.activeElement !== editor || (viewport && viewport.scale !== 1)) return
      const rect = editor.getBoundingClientRect()
      const top = (viewport?.offsetTop ?? 0) + 24
      const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - 24
      const available = bottom - top
      if (available <= 0) return
      // Leave already-visible text alone; oversized text boxes align at the top.
      const delta = rect.height > available || rect.top < top
        ? rect.top - top
        : rect.bottom > bottom ? rect.bottom - bottom : 0
      if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: 'instant' })
    }
    function scheduleReveal() {
      clearTimeout(timer)
      timer = setTimeout(revealEditor, 300)
    }
    scheduleReveal()
    viewport?.addEventListener('resize', scheduleReveal)
    window.addEventListener('resize', scheduleReveal)
    window.addEventListener('touchstart', stopReveal, { passive: true })
    window.addEventListener('wheel', stopReveal, { passive: true })
    onCleanup(stopReveal)
  }, { flush: 'post' })
}
