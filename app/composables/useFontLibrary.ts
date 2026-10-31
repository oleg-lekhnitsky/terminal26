interface LibraryDownload { id: string; label: string; url: string }

export function useFontLibrary() {
  const downloads = useState<LibraryDownload[]>('font-library', () => [])
  const checkingPurchases = ref(false)
  const downloading = ref('')
  const downloadError = ref('')
  let disposed = false
  const purchased = (id: string) => downloads.value.some(item => item.id === id)

  async function refreshPurchases() {
    if (checkingPurchases.value) return
    checkingPurchases.value = true
    downloadError.value = ''
    const orders: { session_id: string; token: string }[] = []
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('terminal-font-orders-v1') || '[]')
      if (Array.isArray(saved)) for (const order of saved.slice(0, 20)) {
        if (typeof order?.url !== 'string' || !order.url.startsWith('/checkout?')) continue
        const url = new URL(order.url, location.origin)
        const id = url.searchParams.get('session_id')
        const token = url.searchParams.get('token')
        if (id && token) orders.push({ session_id: id, token })
      }
    } catch { /* The server can still restore the current order from its cookie. */ }
    try {
      const result = await $fetch<{ downloads: LibraryDownload[]; unavailable: boolean }>('/api/font-library', {
        method: 'POST', body: { orders },
      })
      if (disposed) return
      downloads.value = result.downloads
      if (result.unavailable) downloadError.value = 'Could not check some purchases. Open Your downloads to try again.'
    } catch {
      if (!disposed) downloadError.value = 'Could not check your purchases. Open Your downloads to try again.'
    } finally { if (!disposed) checkingPurchases.value = false }
  }

  async function downloadFont(id: string) {
    const item = downloads.value.find(item => item.id === id)
    if (!item || downloading.value) return
    downloading.value = id
    downloadError.value = ''
    try {
      const file = await $fetch<Blob>(item.url, { responseType: 'blob' })
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = `AB-Terminal-${id}.zip`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch { downloadError.value = 'Could not download your font. Try again or open Your downloads.' }
    finally { downloading.value = '' }
  }

  function storageChanged(event: StorageEvent) {
    if (event.key === 'terminal-font-orders-v1' || event.key === null) void refreshPurchases()
  }
  onMounted(() => {
    void refreshPurchases()
    window.addEventListener('storage', storageChanged)
  })
  onBeforeUnmount(() => {
    disposed = true
    window.removeEventListener('storage', storageChanged)
  })
  return { downloads, purchased, checkingPurchases, downloading, downloadError, downloadFont }
}
