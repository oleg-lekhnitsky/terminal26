import type { FontProductId } from '~/utils/fontShop'

export function useFontCheckout(items: () => FontProductId[]) {
  const checkingOut = ref(false)
  const checkoutError = ref('')
  async function checkout() {
    if (checkingOut.value || !items().length) return
    checkingOut.value = true
    checkoutError.value = ''
    try {
      const result = await $fetch('/api/checkout', { method: 'POST', body: { items: items() } })
      window.location.assign(result.url)
    } catch (error: any) {
      checkoutError.value = error?.data?.statusMessage || 'Could not open checkout. Please try again.'
      checkingOut.value = false
    }
  }
  return { checkingOut, checkoutError, checkout }
}
