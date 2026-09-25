<script setup lang="ts">
const route = useRoute()
useHead({ meta: [{ name: 'referrer', content: 'no-referrer' }, { name: 'robots', content: 'noindex, nofollow' }] })
const { data, error, status, refresh } = await useFetch('/api/checkout', {
  query: { session_id: route.query.session_id, token: route.query.token },
})
const cart = useState<string[]>('font-cart', () => [])
const savedOrders = ref<{ url: string; label: string }[]>([])
const downloadError = ref('')
const downloading = ref('')
function rememberOrder() {
  if (!data.value?.paid) return
  cart.value = []
  try {
    localStorage.removeItem('terminal-font-cart-v1')
    const entry = { url: data.value.restoreUrl, label: data.value.downloads.map(item => item.label).join(' + ') }
    const sessionId = new URL(entry.url, location.origin).searchParams.get('session_id')
    savedOrders.value = [entry, ...savedOrders.value.filter(item => new URL(item.url, location.origin).searchParams.get('session_id') !== sessionId)].slice(0, 20)
    localStorage.setItem('terminal-font-orders-v1', JSON.stringify(savedOrders.value))
  } catch { /* Downloads remain available without storage. */ }
}
onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem('terminal-font-orders-v1') || '[]')
    if (Array.isArray(saved)) savedOrders.value = saved.filter(item => typeof item?.url === 'string' && item.url.startsWith('/checkout?') && typeof item.label === 'string')
  } catch { /* Storage is optional. */ }
  rememberOrder()
})
watch(() => data.value, () => { if (import.meta.client) rememberOrder() })
async function download(item: { id: string; url: string }) {
  if (downloading.value) return
  downloading.value = item.id
  downloadError.value = ''
  try {
    const file = await $fetch<Blob>(item.url, { responseType: 'blob' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = `AB-Terminal-${item.id}.zip`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  } catch { downloadError.value = 'Could not download your fonts. Please try again.' }
  finally { downloading.value = '' }
}
</script>
<template>
  <main class="checkout-result">
    <h1>AB TERMINAL</h1>
    <h2>{{ data?.paid ? 'Your fonts are ready.' : error ? 'Open your order to download.' : 'Payment processing.' }}</h2>
    <p>{{ data?.paid ? 'Download your fonts below. Keep this page bookmarked to download them again.' : error ? 'Choose a saved order below or return using your checkout link.' : 'We’ll unlock your downloads once Stripe confirms payment.' }}</p>
    <div v-if="data?.paid" class="checkout-result__files">
      <button v-for="item in data.downloads" :key="item.id" :disabled="!!downloading" @click="download(item)">
        {{ downloading === item.id ? 'Downloading…' : `Download ${item.label}` }} <small>ZIP · TTF</small>
      </button>
      <p v-if="downloadError" role="alert">{{ downloadError }}</p>
      <NuxtLink :to="data.restoreUrl" replace>Save this download link</NuxtLink>
      <NuxtLink to="/license">Font license</NuxtLink>
    </div>
    <button v-if="!data?.paid" :disabled="status === 'pending'" @click="refresh()">Check payment status</button>
    <section v-if="savedOrders.length && !data?.paid">
      <h2>Saved orders</h2>
      <a v-for="order in savedOrders" :key="order.url" :href="order.url">{{ order.label }}</a>
    </section>
    <NuxtLink to="/">Back to font shop</NuxtLink>
  </main>
</template>
<style scoped>
.checkout-result { max-width: 32rem; margin: 8vh auto; padding: 2rem; background: #f4f1e7; color: #22221e; font-family: var(--font-sans); }
h1 { font-size: 2rem; } h2 { font-size: 1.25rem; margin-top: 2rem; } p { line-height: 1.6; }
a, button { display: block; margin-top: 1.25rem; color: inherit; font: inherit; }
button { width: 100%; min-height: 44px; padding: 1rem; cursor: pointer; border: 1px solid #22221e; background: transparent; text-align: left; }
button:disabled { opacity: .5; cursor: wait; }
.checkout-result__files { border-block: 1px dashed #22221e80; padding-block: .5rem 1.5rem; }
.checkout-result__files button { background: #22221e; color: #f4f1e7; }
small { display: block; font-size: .7rem; margin-top: .5rem; }
</style>
