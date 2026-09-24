import { WebHaptics } from 'web-haptics'

export function useNavigationHaptics() {
  let haptics: WebHaptics | undefined

  onBeforeUnmount(() => haptics?.destroy())

  function navigationHaptic() {
    if (!import.meta.client || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Trigger synchronously from the click to preserve iOS user activation.
    haptics ??= new WebHaptics({ debug: false, showSwitch: false })
    void haptics.trigger([{ duration: 15, intensity: 0.4 }]).catch(() => {})
  }

  return { navigationHaptic }
}
