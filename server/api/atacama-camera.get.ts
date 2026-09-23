// DGAC publishes timestamped filenames, so resolve the newest south-view image.
const latestSnapshot = defineCachedFunction(async () => {
  const html = await $fetch<string>('https://aipchile.dgac.gob.cl/camara/show/id/23', {
    responseType: 'text', timeout: 12000, retry: 0,
  })
  const images = [...html.matchAll(/https:\/\/aipchile\.dgac\.gob\.cl\/camara\/ftp\/COPIAPO\/Sur\/SCAT-SUR_[A-Za-z0-9]+_(\d{17})_TIMING\.jpg/g)]
  images.sort((a, b) => b[1]!.localeCompare(a[1]!))
  if (!images[0]) throw new Error('No south-view snapshot found')
  return images[0][0]
}, { name: 'atacama-south-snapshot', maxAge: 60, swr: false })

export default defineEventHandler(async (event) => {
  try {
    const url = await latestSnapshot()
    setHeader(event, 'Cache-Control', 'no-store')
    return sendRedirect(event, url, 302)
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Camera snapshot is temporarily unavailable' })
  }
})
