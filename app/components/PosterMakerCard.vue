<script setup lang="ts">
const { navigationHaptic } = useNavigationHaptics()
import { touchPair, pinchTransform } from '~/utils/posterTouch'
import { snapAxis, snapRotation } from '~/utils/posterSnapping'
import { hasPosterContent } from '~/utils/posterContent'
import { textPresets } from '~/utils/textRenderer'
const { activeFont } = useFontSelection()
const host = useTemplateRef('host')
const canvas = useTemplateRef('canvas')
const video = useTemplateRef('video')
const textEditor = useTemplateRef('textEditor')
const gallery = useTemplateRef('gallery')
const editing = ref(false)
const backgroundColor = ref('#b4869d')
const backgroundPickerOpen = ref(false)
const spacingOpen = ref(false)
watch(editing, () => { spacingOpen.value = false; backgroundPickerOpen.value = false })
function cycleAlignment() {
  const options = ['left', 'center', 'right'] as const
  alignment.value = options[(options.indexOf(alignment.value) + 1) % options.length]!
}
const studioOpen = ref(false)
const slide = ref(0)
const currentPoster = computed(() => posters.value[slide.value])
async function openStudio() {
  studioOpen.value = true
  if (!hasText.value) {
    await addText()
    return
  }
  editing.value = true
  await nextTick()
  textEditor.value?.focus({ preventScroll: true })
  void paint()
}
function closeStudio() {
  backgroundPickerOpen.value = false
  stopCamera()
  editing.value = false
  studioOpen.value = false
}
function changeSlide(direction: number) {
  if (!posters.value.length) return
  slide.value = (slide.value + direction + posters.value.length) % posters.value.length
  if (slide.value === posters.value.length - 1 && cursor.value) void loadGallery(true)
  syncGalleryPlayback()
}
function slideKey(event: KeyboardEvent) {
  if (studioOpen.value) return
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    changeSlide(event.key === 'ArrowLeft' ? -1 : 1)
  }
}
const textOffset = ref({ x: 0, y: 0 })
const rotation = ref(0)
const transforming = ref(false)
const snapGuides = ref<{ x: number | null; y: number | null }>({ x: null, y: null })
const rotationLabel = ref<number | null>(null)
const textWidth = ref(800)
const textBoxHeight = ref<number | null>(null)
const touchPoints = new Map<number, { x: number; y: number }>()
let pinch: { pair: ReturnType<typeof touchPair>; center: { x: number; y: number }; size: number; width: number; height: number | null; angle: number; offset: { x: number; y: number }; scale: number } | undefined
function preserveTextFocus(event: PointerEvent) { if (event.pointerType === 'mouse') event.preventDefault() }
function refocusText() { if (editing.value) textEditor.value?.focus({ preventScroll: true }) }
let gesture: { id: number; mode: 'move' | 'rotate' | 'resize' | 'left' | 'right' | 'top' | 'bottom'; x: number; y: number; offsetX: number; offsetY: number; angle: number; startAngle: number; cx: number; cy: number; scale: number; size: number; width: number; height: number; moved: boolean } | undefined
function beginTransform(event: PointerEvent, mode: 'move' | 'rotate' | 'resize' | 'left' | 'right' | 'top' | 'bottom') {
  if (event.button !== 0 || (mode === 'move' && editing.value)) return
  if (event.pointerType === 'touch' && mode === 'move') {
    if (touchPoints.size >= 2) return
    touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (gesture && touchPoints.size === 2) {
      event.preventDefault()
      const points = [...touchPoints.values()]
      const rect = canvas.value!.getBoundingClientRect()
      pinch = { pair: touchPair(points[0]!, points[1]!), center: { x: rect.left + (480 + textOffset.value.x) * rect.width / 960, y: rect.top + (600 + textOffset.value.y) * rect.width / 960 }, size: typeSize.value, width: textWidth.value, height: textBoxHeight.value, angle: rotation.value, offset: { ...textOffset.value }, scale: 960 / rect.width }
      gesture.moved = true
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
      return
    }
  }
  if (gesture) return
  const rect = canvas.value?.getBoundingClientRect()
  if (!rect?.width) return
  event.preventDefault()
  snapGuides.value = { x: null, y: null }
  rotationLabel.value = null
  transforming.value = true
  editing.value = false
  textEditor.value?.blur()
  const cx = rect.left + rect.width / 2 + textOffset.value.x * rect.width / 960
  const cy = rect.top + (textLayout.value.top + textLayout.value.height / 2) / 100 * rect.height + textOffset.value.y * rect.width / 960
  gesture = { id: event.pointerId, mode, x: event.clientX, y: event.clientY, offsetX: textOffset.value.x, offsetY: textOffset.value.y, angle: rotation.value, startAngle: Math.atan2(event.clientY - cy, event.clientX - cx), cx, cy, scale: 960 / rect.width, size: typeSize.value, width: textWidth.value, height: textLayout.value.height * 12, moved: false }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}
function updateTransform(event: PointerEvent) {
  if (touchPoints.has(event.pointerId)) touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (pinch && touchPoints.size === 2) {
    const points = [...touchPoints.values()]
    const next = pinchTransform(pinch.pair, touchPair(points[0]!, points[1]!), pinch.center)
    const ratio = Math.max(36 / pinch.size, next.ratio)
    typeSize.value = pinch.size * ratio
    textWidth.value = pinch.width * ratio
    if (pinch.height !== null) textBoxHeight.value = pinch.height * ratio
    textOffset.value = { x: pinch.offset.x + (next.x - pinch.center.x) * pinch.scale, y: pinch.offset.y + (next.y - pinch.center.y) * pinch.scale }
    rotation.value = snapRotation(pinch.angle + next.angle)
    rotationLabel.value = Math.round(((rotation.value % 360) + 360) % 360)
    snapGuides.value = { x: null, y: null }
    return
  }
  if (!gesture || gesture.id !== event.pointerId) return
  const g = gesture
  const dx = event.clientX - g.x, dy = event.clientY - g.y
  if (Math.hypot(dx, dy) > 3) g.moved = true
  if (!g.moved) return
  if (g.mode === 'move') {
    const radians = g.angle * Math.PI / 180
    const halfWidth = (Math.abs(Math.cos(radians)) * g.width + Math.abs(Math.sin(radians)) * g.height) / 2
    const halfHeight = (Math.abs(Math.sin(radians)) * g.width + Math.abs(Math.cos(radians)) * g.height) / 2
    const x = 480 + g.offsetX + dx * g.scale
    const y = 600 + g.offsetY + dy * g.scale
    const snappedX = event.altKey ? { value: x, guide: null } : snapAxis(x, halfWidth, 960, 6 * g.scale)
    const snappedY = event.altKey ? { value: y, guide: null } : snapAxis(y, halfHeight, 1200, 6 * g.scale)
    textOffset.value = { x: snappedX.value - 480, y: snappedY.value - 600 }
    snapGuides.value = { x: snappedX.guide, y: snappedY.guide }
  } else if (['left', 'right', 'top', 'bottom'].includes(g.mode)) {
    const angle = g.angle * Math.PI / 180
    const localX = (dx * Math.cos(angle) + dy * Math.sin(angle)) * g.scale
    const localY = (-dx * Math.sin(angle) + dy * Math.cos(angle)) * g.scale
    const horizontal = g.mode === 'left' || g.mode === 'right'
    const sign = g.mode === 'left' || g.mode === 'top' ? -1 : 1
    let shiftX = 0, shiftY = 0
    if (horizontal) {
      textWidth.value = Math.max(120, g.width + localX * sign)
      shiftX = (textWidth.value - g.width) * sign / 2
    } else {
      textBoxHeight.value = Math.max(48, g.height + localY * sign)
      shiftY = (textBoxHeight.value - g.height) * sign / 2
    }
    textOffset.value = { x: g.offsetX + shiftX * Math.cos(angle) - shiftY * Math.sin(angle), y: g.offsetY + shiftX * Math.sin(angle) + shiftY * Math.cos(angle) }
  } else if (g.mode === 'resize') {
    // Project onto the initial handle direction so rotation does not change the gesture.
    const sx = g.x - g.cx, sy = g.y - g.cy
    const ratio = Math.max(.1, ((event.clientX - g.cx) * sx + (event.clientY - g.cy) * sy) / Math.max(1, sx * sx + sy * sy))
    const size = Math.max(36, g.size * ratio)
    typeSize.value = Math.round(size * 10) / 10
    textWidth.value = g.width * typeSize.value / g.size
    if (textBoxHeight.value !== null) textBoxHeight.value = g.height * typeSize.value / g.size
  } else {
    let angle = g.angle + (Math.atan2(event.clientY - g.cy, event.clientX - g.cx) - g.startAngle) * 180 / Math.PI
    angle = snapRotation(angle, event.shiftKey, event.altKey)
    rotation.value = angle
    rotationLabel.value = Math.round(((angle % 360) + 360) % 360)
  }
}
function endTransform(event: PointerEvent) {
  touchPoints.delete(event.pointerId)
  if (pinch) {
    pinch = undefined
    touchPoints.clear()
    gesture = undefined
    transforming.value = false
    snapGuides.value = { x: null, y: null }
    rotationLabel.value = null
    const target = event.currentTarget as HTMLElement
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
    return
  }
  if (!gesture || gesture.id !== event.pointerId) return
  const edit = gesture.mode === 'move' && !gesture.moved && event.type === 'pointerup'
  gesture = undefined
  transforming.value = false
  snapGuides.value = { x: null, y: null }
  rotationLabel.value = null
  const target = event.currentTarget as HTMLElement
  if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
  if (edit) textEditor.value?.focus()
}
const textLayout = ref({ top: 35, fontSize: 15, height: 45 })
function openGallery() { stopCamera(); gallery.value?.showModal(); void loadGallery() }
const title = ref('')
const hasText = ref(false)
const layerFont = ref<{ style: string; weight: number } | null>(null)
const currentTextFont = computed(() => layerFont.value ?? activeFont.value)
watch(activeFont, () => { layerFont.value = null })
const ink = ref('#ffffff')
const alignment = ref<'left' | 'center' | 'right'>('center')
const lineHeight = ref(1.08)
const typeSize = ref(144)
const allCaps = ref(false)
const paletteOrder = ['poster', 'words', 'typewriter', 'fan', 'slide', 'letter', 'numbers', 'carousel', 'drop']
const typePalette = ['#ffffff', '#111111', ...paletteOrder.map(id => {
  const preset = textPresets.find(item => item.id === id)!
  return id === 'slide' ? preset.color : preset.background
})]
const displayTitle = computed(() => allCaps.value ? title.value.toUpperCase() : title.value)
type TextLayer = {
  id: number; title: string; ink: string; alignment: 'left' | 'center' | 'right'; lineHeight: number; size: number; caps: boolean;
  width: number; boxHeight: number | null; offset: { x: number; y: number }; rotation: number;
  layout: { top: number; fontSize: number; height: number }; font: { style: string; weight: number };
}
const savedTexts = ref<TextLayer[]>([])
const posterContent = computed(() => ({ photo: hasPhoto.value, texts: [...savedTexts.value.map(layer => layer.title), ...(hasText.value ? [title.value] : [])] }))
const canPublish = computed(() => hasPosterContent(posterContent.value))
let nextTextId = 0
let currentTextId = 0
function snapshotText(): TextLayer {
  return { id: currentTextId, title: title.value, ink: ink.value, alignment: alignment.value, lineHeight: lineHeight.value, size: typeSize.value, caps: allCaps.value, width: textWidth.value, boxHeight: textBoxHeight.value, offset: { ...textOffset.value }, rotation: rotation.value, layout: { ...textLayout.value }, font: { style: currentTextFont.value.style, weight: currentTextFont.value.weight } }
}
function keepText() {
  if (hasText.value && title.value.trim()) savedTexts.value.push(snapshotText())
}
function finishEditing() {
  backgroundPickerOpen.value = false
  textEditor.value?.blur()
  editing.value = false
  if (!title.value.trim()) hasText.value = false
}
async function addText() {
  keepText()
  currentTextId = ++nextTextId
  layerFont.value = null
  title.value = ''
  textOffset.value = { x: 0, y: 0 }
  rotation.value = 0
  textWidth.value = 800
  textBoxHeight.value = null
  hasText.value = true
  editing.value = true
  await nextTick()
  textEditor.value?.focus({ preventScroll: true })
  void paint()
}
async function editSavedText(id: number) {
  const layer = savedTexts.value.find(item => item.id === id)
  if (!layer) return
  keepText()
  savedTexts.value = savedTexts.value.filter(item => item.id !== id)
  currentTextId = id
  layerFont.value = { ...layer.font }
  title.value = layer.title
  ink.value = layer.ink
  alignment.value = layer.alignment
  lineHeight.value = layer.lineHeight
  typeSize.value = layer.size
  allCaps.value = layer.caps
  textWidth.value = layer.width
  textBoxHeight.value = layer.boxHeight
  textOffset.value = { ...layer.offset }
  rotation.value = layer.rotation
  textLayout.value = { ...layer.layout }
  hasText.value = true
  editing.value = true
  await nextTick()
  await paint()
  textEditor.value?.focus()
}
function savedTextStyle(layer: TextLayer) {
  return { left: `${(960 - layer.width) / 19.2}%`, width: `${layer.width / 9.6}%`, top: `${layer.layout.top}%`, height: `${layer.layout.height}%`, transform: `translate(${layer.offset.x / 9.6}cqw, ${layer.offset.y / 9.6}cqw) rotate(${layer.rotation}deg)`, color: layer.ink, fontSize: `${layer.size / 9.6}cqw`, fontWeight: layer.font.weight, fontStyle: layer.font.style, textAlign: layer.alignment, lineHeight: layer.lineHeight }
}
const cameraOpen = ref(false)
const cameraFacing = ref<'user' | 'environment'>('environment')
const cameraCanFlip = ref(false)
async function flipCamera() {
  if (cameraStarting.value) return
  cameraFacing.value = cameraFacing.value === 'user' ? 'environment' : 'user'
  await openCamera()
}
const cameraStarting = ref(false)
const hasPhoto = ref(false)
const publishing = ref(false)
const message = ref('')
const configured = ref(false)
const galleryLoading = ref(false)
const galleryError = ref('')
const posters = ref<{ id: string; url: string; createdAt: string }[]>([])
const cursor = ref<string | null>(null)
let stream: MediaStream | undefined
let photo: HTMLImageElement | undefined
let cameraVersion = 0
let photoVersion = 0
let paintVersion = 0
let disposed = false
let observer: IntersectionObserver | undefined
let galleryVisible = false
let galleryHovered = false
let galleryFocused = false
let galleryMotion: MediaQueryList | undefined
let galleryTimer: ReturnType<typeof setTimeout> | undefined
const addHintPlaying = ref(false)
let preloadedPoster = ''
function syncGalleryPlayback() {
  clearTimeout(galleryTimer)
  addHintPlaying.value = !disposed && galleryVisible && !studioOpen.value && !galleryHovered && !galleryFocused && !document.hidden && !galleryMotion?.matches
  if (!addHintPlaying.value || posters.value.length < 2) return
  const next = posters.value[(slide.value + 1) % posters.value.length]
  if (next && next.url !== preloadedPoster) {
    preloadedPoster = next.url
    const image = new Image()
    image.src = next.url
    void image.decode().catch(() => {})
  }
  galleryTimer = setTimeout(() => changeSlide(1), 3000)
}
function setGalleryHover(value: boolean) { galleryHovered = value; syncGalleryPlayback() }
function galleryFocus(event: FocusEvent) {
  galleryFocused = event.type === 'focusin' || Boolean(event.relatedTarget && host.value?.contains(event.relatedTarget as Node))
  syncGalleryPlayback()
}
watch([studioOpen, () => posters.value.length], syncGalleryPlayback)
let seen = false
function stopCamera() {
  cameraVersion++
  stream?.getTracks().forEach(track => track.stop())
  stream = undefined
  if (video.value) video.value.srcObject = null
  cameraOpen.value = false
  cameraStarting.value = false
}
async function openCamera() {
  backgroundPickerOpen.value = false
  message.value = ''
  if (!navigator.mediaDevices?.getUserMedia) { message.value = 'Camera needs a secure connection (HTTPS or localhost).'; return }
  const switching = cameraOpen.value
  stopCamera()
  cameraOpen.value = switching
  const version = ++cameraVersion
  cameraStarting.value = true
  try {
    const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: cameraFacing.value }, width: { ideal: 1440 }, height: { ideal: 1800 } }, audio: false })
    if (disposed || version !== cameraVersion) { next.getTracks().forEach(track => track.stop()); return }
    stream = next
    const actualFacing = next.getVideoTracks()[0]?.getSettings().facingMode
    if (actualFacing === 'user' || actualFacing === 'environment') cameraFacing.value = actualFacing
    void navigator.mediaDevices.enumerateDevices().then(devices => {
      if (version === cameraVersion) cameraCanFlip.value = devices.filter(device => device.kind === 'videoinput').length > 1
    }).catch(() => { if (version === cameraVersion) cameraCanFlip.value = true })
    cameraOpen.value = true
    await nextTick()
    if (!video.value || disposed || version !== cameraVersion) return
    video.value.srcObject = next
    await video.value.play()
  } catch { if (version === cameraVersion) { stopCamera(); message.value = 'Could not open the camera. Check camera permission and try again.' } }
  finally { if (version === cameraVersion) cameraStarting.value = false }
}
async function setPhoto(blob: Blob) {
  const version = ++photoVersion
  const url = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    if (disposed || version !== photoVersion) return
    photo = image
    hasPhoto.value = true
    backgroundPickerOpen.value = false
    message.value = ''
    await paint()
  } catch { message.value = 'Could not read this photo. Please take another one.' }
  finally { URL.revokeObjectURL(url) }
}
function capture() {
  if (cameraStarting.value || !video.value?.videoWidth) return
  const still = document.createElement('canvas')
  const ratio = Math.min(1, 1600 / Math.max(video.value.videoWidth, video.value.videoHeight))
  still.width = Math.round(video.value.videoWidth * ratio)
  still.height = Math.round(video.value.videoHeight * ratio)
  const context = still.getContext('2d')!
  if (cameraFacing.value === 'user') { context.translate(still.width, 0); context.scale(-1, 1) }
  context.drawImage(video.value, 0, 0, still.width, still.height)
  stopCamera()
  still.toBlob(blob => { if (blob && !disposed) void setPhoto(blob) }, 'image/jpeg', .92)
}
function wrap(context: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word
      if (line && context.measureText(next).width > width) { lines.push(line); line = word } else line = next
    }
    lines.push(line)
  }
  return lines
}
async function paint(exportCanvas?: HTMLCanvasElement) {
  const target = exportCanvas || canvas.value
  if (!target) return
  const version = exportCanvas ? paintVersion : ++paintVersion
  const font = currentTextFont.value
  if (exportCanvas) await Promise.all(savedTexts.value.map(layer => document.fonts.load(`${layer.font.style} ${layer.font.weight} 120px "AB Terminal"`)))
  await document.fonts.load(`${font.style} ${font.weight} 120px "AB Terminal"`)
  if (disposed || (!exportCanvas && version !== paintVersion)) return
  const context = target.getContext('2d')!
  const width = 960, height = 1200
  context.fillStyle = backgroundColor.value
  context.fillRect(0, 0, width, height)
  if (photo) {
    const scale = Math.max(width / photo.naturalWidth, height / photo.naturalHeight)
    const w = photo.naturalWidth * scale, h = photo.naturalHeight * scale
    context.drawImage(photo, (width - w) / 2, (height - h) / 2, w, h)
  }
  const size = typeSize.value
  context.font = `${font.style} ${font.weight} ${size}px "AB Terminal"`
  const lines = wrap(context, displayTitle.value || 'Your poster', textWidth.value)
  const blockHeight = lines.length * size * lineHeight.value
  const boxHeight = textBoxHeight.value ?? blockHeight
  const top = (height - boxHeight) / 2
  context.textAlign = alignment.value
  context.textBaseline = 'top'
  context.fillStyle = ink.value
  if (!exportCanvas) textLayout.value = { top: top / 12, fontSize: size / 9.6, height: Math.max(boxHeight / 12, 1) }
  if (exportCanvas) {
    const layers = [...savedTexts.value, ...(hasText.value ? [snapshotText()] : [])]
    for (const layer of layers) {
      context.font = `${layer.font.style} ${layer.font.weight} ${layer.size}px "AB Terminal"`
      const layerLines = wrap(context, layer.caps ? layer.title.toUpperCase() : layer.title, layer.width)
      const layerHeight = layer.boxHeight ?? layerLines.length * layer.size * layer.lineHeight
      const layerTop = (height - layerHeight) / 2
      const x = layer.alignment === 'left' ? (960 - layer.width) / 2 : layer.alignment === 'right' ? (960 + layer.width) / 2 : 480
      context.save()
      context.translate(480 + layer.offset.x, 600 + layer.offset.y)
      context.rotate(layer.rotation * Math.PI / 180)
      context.translate(-480, -600)
      context.beginPath()
      context.rect((960 - layer.width) / 2, layerTop, layer.width, layerHeight)
      context.clip()
      context.textAlign = layer.alignment
      context.textBaseline = 'alphabetic'
      context.fillStyle = layer.ink
      const metrics = context.measureText('Hg')
      const ascent = metrics.fontBoundingBoxAscent ?? layer.size * .8
      const descent = metrics.fontBoundingBoxDescent ?? layer.size * .2
      const baseline = (layer.size * layer.lineHeight - ascent - descent) / 2 + ascent
      layerLines.forEach((line, i) => context.fillText(line, x, layerTop + baseline + i * layer.size * layer.lineHeight))
      context.restore()
    }
    context.textBaseline = 'top'
  }
  context.fillStyle = '#ffffff'
  context.font = '400 20px "AB Terminal"'
  context.textAlign = 'center'
  context.fillText(`AB TERMINAL · ${activeFont.value.label}`, width / 2, 920)
}
watch([title, ink, backgroundColor, currentTextFont, alignment, lineHeight, typeSize, textWidth, textBoxHeight, allCaps], () => { void paint() })
async function posterBlob() {
  const output = document.createElement('canvas')
  output.width = 960
  output.height = 1200
  await paint(output)
  return new Promise<Blob>((resolve, reject) => output.toBlob(blob => blob ? resolve(blob) : reject(new Error('Export failed')), 'image/png'))
}
async function download() {
  try {
    const blob = await posterBlob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = 'AB-Terminal-poster.png'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  } catch { message.value = 'Could not export the poster. Please try again.' }
}
async function loadGallery(more = false) {
  if (galleryLoading.value) return
  galleryLoading.value = true
  galleryError.value = ''
  try {
    const result = await $fetch('/api/posters', { query: more && cursor.value ? { cursor: cursor.value } : {} })
    if (disposed) return
    configured.value = result.configured
    const merged = more ? [...posters.value, ...result.posters] : result.posters
    posters.value = merged.filter((item, i) => merged.findIndex(other => other.id === item.id) === i)
    slide.value = Math.min(slide.value, Math.max(0, posters.value.length - 1))
    cursor.value = result.cursor
  } catch { galleryError.value = 'Could not load the gallery.' }
  finally { galleryLoading.value = false }
}
async function publish() {
  if (publishing.value || !configured.value) return
  if (!canPublish.value) { message.value = 'Add text or take a photo before publishing.'; return }
  publishing.value = true
  message.value = ''
  try {
    const blob = await posterBlob()
    const result = await $fetch('/api/posters', { method: 'POST', body: blob, headers: { 'Content-Type': 'image/png', 'X-Poster-Content': encodeURIComponent(JSON.stringify(posterContent.value)) } })
    if (!disposed) { posters.value.unshift(result); message.value = 'Published. Your poster is now in the shared gallery.' }
  } catch (error: any) { message.value = error?.data?.statusMessage || 'Could not publish. Your draft is still here.' }
  finally { publishing.value = false }
}
function visibility() { if (document.hidden) stopCamera(); syncGalleryPlayback() }
onMounted(() => {
  galleryMotion = matchMedia('(prefers-reduced-motion: reduce)')
  galleryMotion.addEventListener('change', syncGalleryPlayback)
  void paint()
  document.addEventListener('visibilitychange', visibility)
  observer = new IntersectionObserver(([entry]) => {
    galleryVisible = Boolean(entry?.isIntersecting)
    syncGalleryPlayback()
    if (entry?.isIntersecting && !seen) { seen = true; void loadGallery() }
    if (!entry?.isIntersecting) stopCamera()
  })
  if (host.value) observer.observe(host.value)
})
onBeforeUnmount(() => { disposed = true; clearTimeout(galleryTimer); galleryMotion?.removeEventListener('change', syncGalleryPlayback); photoVersion++; stopCamera(); observer?.disconnect(); document.removeEventListener('visibilitychange', visibility) })
</script>

<template>
  <figure ref="host" class="poster-maker" @keydown="slideKey" @mouseenter="setGalleryHover(true)" @mouseleave="setGalleryHover(false)" @focusin="galleryFocus" @focusout="galleryFocus">
    <div v-if="!studioOpen" class="poster-maker__slides" role="region" aria-label="Poster studio slides">
      <Transition name="poster-slide"><img v-if="currentPoster" :key="currentPoster.id" class="poster-maker__published" :src="currentPoster.url" width="960" height="1200" decoding="async" alt="Community poster"></Transition>
      <div v-if="!currentPoster" class="poster-maker__empty" role="status">
        <span>{{ galleryLoading ? 'Loading posters…' : galleryError || 'Make the first poster.' }}</span>
        <button v-if="galleryError" type="button" @click="loadGallery()">Retry</button>
      </div>
      <template v-if="posters.length > 1">
        <button class="poster-maker__previous" type="button" aria-label="Previous slide" @click="changeSlide(-1); navigationHaptic()"></button>
        <button class="poster-maker__next" type="button" aria-label="Next slide" @click="changeSlide(1); navigationHaptic()"></button>
      </template>
      <span v-if="posters.length" class="poster-maker__count" aria-live="polite">{{ slide + 1 }} / {{ posters.length }}</span>
      <button type="button" class="poster-maker__add" :class="{ 'is-hinting': addHintPlaying }" aria-label="Create your poster" title="Create your poster" @click="openStudio"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>
    </div>
    <div v-show="studioOpen" class="poster-maker__art" :style="{ color: '#ffffff' }">
      <canvas ref="canvas" width="960" height="1200" role="img" aria-label="Poster background" @pointerdown="finishEditing" />
      <header v-if="!editing && !cameraOpen" class="poster-maker__heading"><button type="button" @click="closeStudio">← Back</button><button type="button" @click="openGallery">Gallery ↗</button></header>
      <header v-else-if="!cameraOpen" class="poster-maker__edit-heading" @click="refocusText">
        <div role="toolbar" aria-label="Text formatting">
          <button type="button" :aria-label="`Alignment: ${alignment}. Change alignment`" @pointerdown="preserveTextFocus" @click="cycleAlignment"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 13h16"/><path :d="alignment === 'left' ? 'M4 9h10M4 17h10' : alignment === 'right' ? 'M10 9h10M10 17h10' : 'M7 9h10M7 17h10'"/></svg></button>
          <button type="button" aria-label="All caps" :aria-pressed="allCaps" @pointerdown="preserveTextFocus" @click="allCaps = !allCaps">{{ allCaps ? 'AA' : 'Aa' }}</button>
          <button type="button" aria-label="Line height" :aria-expanded="spacingOpen" @pointerdown="preserveTextFocus" @click="spacingOpen = !spacingOpen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5h10M10 12h10M10 19h10M4 4v16m-2-2 2 2 2-2M2 6l2-2 2 2"/></svg></button>
        </div>
        <button type="button" class="poster-maker__done" @click="finishEditing">Done</button>
      </header>
      <textarea v-for="layer in savedTexts" v-show="!cameraOpen" :key="layer.id" class="poster-maker__saved-text" :style="savedTextStyle(layer)" :value="layer.caps ? layer.title.toUpperCase() : layer.title" readonly aria-label="Edit text element" @focus="editSavedText(layer.id)" />
      <div v-show="!cameraOpen && hasText" class="poster-maker__text-object" :class="{ 'is-active': editing || transforming }"
        :style="{ left: `${(960 - textWidth) / 19.2}%`, width: `${textWidth / 9.6}%`, top: `${textLayout.top}%`, height: `${textLayout.height}%`, transform: `translate(${textOffset.x / 9.6}cqw, ${textOffset.y / 9.6}cqw) rotate(${rotation}deg)` }">
        <textarea ref="textEditor" v-model="title" class="poster-maker__type" :class="{ 'is-editing': editing }" maxlength="96" placeholder="Type…" aria-label="Poster text. Drag to move, tap to edit."
          :style="{ color: ink, fontWeight: currentTextFont.weight, fontStyle: currentTextFont.style, fontSize: `${textLayout.fontSize}cqw`, textAlign: alignment, lineHeight, textTransform: allCaps ? 'uppercase' : 'none' }"
          @pointerdown="beginTransform($event, 'move')" @pointermove="updateTransform" @pointerup="endTransform" @pointercancel="endTransform" @lostpointercapture="endTransform"
          @focus="editing = true" @keydown.esc="finishEditing" @keydown.meta.enter.prevent="finishEditing" @keydown.ctrl.enter.prevent="finishEditing" />
        <button v-for="edge in (['left', 'right', 'top', 'bottom'] as const)" :key="edge" type="button" class="poster-maker__edge" :class="`poster-maker__edge--${edge}`" :aria-label="`Resize ${edge} boundary`" title="Drag to resize text box"
          @pointerdown="beginTransform($event, edge)" @pointermove="updateTransform" @pointerup="endTransform" @pointercancel="endTransform" @lostpointercapture="endTransform"><span/></button>
        <button v-for="corner in ['tl', 'tr', 'bl', 'br']" :key="corner" type="button" class="poster-maker__resize" :class="`poster-maker__resize--${corner}`" aria-label="Resize text" title="Drag to resize"
          @pointerdown="beginTransform($event, 'resize')" @pointermove="updateTransform" @pointerup="endTransform" @pointercancel="endTransform" @lostpointercapture="endTransform"
          @keydown.up.prevent="typeSize += 2" @keydown.down.prevent="typeSize = Math.max(36, typeSize - 2)"><span/></button>
        <button v-for="corner in ['tl', 'tr', 'bl', 'br']" :key="`rotate-${corner}`" type="button" class="poster-maker__rotate-zone" :class="`poster-maker__rotate-zone--${corner}`" aria-label="Rotate text. Use left and right arrow keys to rotate."
          @pointerdown="beginTransform($event, 'rotate')" @pointermove="updateTransform" @pointerup="endTransform" @pointercancel="endTransform" @lostpointercapture="endTransform"
          @keydown.left.prevent="rotation -= 5" @keydown.right.prevent="rotation += 5" />
      </div>
      <div v-if="snapGuides.x !== null" class="poster-maker__guide poster-maker__guide--vertical" :style="{ left: `${Math.max(.1, Math.min(99.9, snapGuides.x / 9.6))}%` }" aria-hidden="true"/>
      <div v-if="snapGuides.y !== null" class="poster-maker__guide poster-maker__guide--horizontal" :style="{ top: `${Math.max(.1, Math.min(99.9, snapGuides.y / 12))}%` }" aria-hidden="true"/>
      <span v-if="rotationLabel !== null" class="poster-maker__angle" aria-hidden="true">{{ rotationLabel }}°</span>
      <span v-if="!hasPhoto && !cameraOpen && !editing" class="poster-maker__hint">{{ hasText || savedTexts.length ? 'Drag to move. Tap to edit.' : 'Tap Aa to add text.' }}</span>
      <div v-if="!cameraOpen && !editing" class="poster-maker__tools" role="toolbar" aria-label="Poster tools">
        <button type="button" :disabled="cameraStarting" aria-label="Take a photo" title="Camera" @click="openCamera"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6.5 9.5 4.5h5L16 6.5h3A2.5 2.5 0 0 1 21.5 9v9a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 18V9A2.5 2.5 0 0 1 5 6.5Z"/><circle cx="12" cy="13.5" r="3.5"/></svg></button>
        <button v-if="!hasPhoto" type="button" aria-label="Background color" title="Background color" :aria-expanded="backgroundPickerOpen" @click="backgroundPickerOpen = !backgroundPickerOpen"><span class="poster-maker__background-swatch" :style="{ backgroundColor }"/></button>
        <button type="button" aria-label="Add text" title="Add text" @click="addText">Aa</button>
        <button type="button" aria-label="Download poster" title="Download" @click="download"><svg viewBox="0 0 24 24"><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/></svg></button>
        <button class="poster-maker__publish" type="button" :disabled="!configured || publishing || !canPublish" :aria-busy="publishing" :aria-label="publishing ? 'Publishing poster' : 'Publish poster to public gallery'" :title="!canPublish ? 'Add text or take a photo before publishing' : configured ? 'Publish to public gallery' : 'Publishing is not available yet'" @click="publish">{{ publishing ? 'Publishing…' : 'Publish' }}</button>
      </div>
      <section v-if="backgroundPickerOpen && !hasPhoto && !cameraOpen && !editing" class="poster-maker__background-picker" aria-label="Background color" @keydown.esc.stop="backgroundPickerOpen = false">
        <div class="poster-maker__swatches" role="group" aria-label="Background colors">
          <button v-for="color in ['#b4869d', ...typePalette]" :key="color" type="button" :style="{ '--swatch': color }" :aria-label="`Background color ${color}`" :aria-pressed="backgroundColor === color" @click="backgroundColor = color"><span aria-hidden="true"/></button>
        </div>
      </section>
      <section v-if="editing && !cameraOpen" class="poster-maker__settings" aria-label="Type settings" @keydown.esc.stop="finishEditing">
        <div class="poster-maker__swatches" role="group" aria-label="Text color" @click="refocusText">
          <button v-for="color in typePalette" :key="color" type="button" :style="{ '--swatch': color }" :aria-label="`Text color ${color}`" :aria-pressed="ink === color" @pointerdown="preserveTextFocus" @click="ink = color"><span aria-hidden="true"/></button>
        </div>
        <label v-if="spacingOpen" class="poster-maker__setting-range"><span>Line height <output>{{ lineHeight.toFixed(2) }}</output></span><input v-model.number="lineHeight" type="range" min="0.8" max="1.8" step="0.02"></label>
      </section>
      <template v-if="cameraOpen">
        <video ref="video" autoplay muted playsinline class="poster-maker__camera" :class="{ 'is-front': cameraFacing === 'user' }" aria-label="Camera preview" />
        <header class="poster-maker__heading poster-maker__camera-heading"><button type="button" @click="stopCamera">← Back</button></header>
        <div class="poster-maker__capture"><button class="poster-maker__shutter" type="button" aria-label="Take photo" :disabled="cameraStarting" @click="capture"/>
          <button v-if="cameraCanFlip" class="poster-maker__flip" type="button" :disabled="cameraStarting" :aria-label="cameraFacing === 'user' ? 'Use rear camera' : 'Use front camera'" @click="flipCamera"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8a9 9 0 0 1 15-3l2 2M21 2v5h-5M20 16a9 9 0 0 1-15 3l-2-2M3 22v-5h5"/></svg></button></div>
      </template>
      <button v-if="message" class="poster-maker__message" type="button" role="status" @click="message = ''">{{ message }}</button>
    </div>
    <figcaption>Poster studio</figcaption>
    <dialog ref="gallery" class="poster-gallery" aria-labelledby="poster-gallery-title" @click.self="gallery?.close()">
      <div class="poster-gallery__inner">
        <button class="poster-gallery__close" type="button" aria-label="Close gallery" @click="gallery?.close()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
        <h2 id="poster-gallery-title">Community posters</h2>
        <p v-if="galleryError" role="status">{{ galleryError }}</p>
        <p v-else-if="!posters.length">{{ galleryLoading ? 'Loading posters…' : 'The next poster could be yours.' }}</p>
        <div v-else class="poster-gallery__grid"><a v-for="poster in posters" :key="poster.id" :href="poster.url" target="_blank" rel="noopener noreferrer"><img :src="poster.url" width="960" height="1200" loading="lazy" decoding="async" alt="Open a community poster"></a></div>
        <button v-if="cursor" type="button" :disabled="galleryLoading" @click="loadGallery(true)">More posters</button>
        <button v-if="galleryError" type="button" @click="loadGallery()">Retry</button>
      </div>
    </dialog>
  </figure>
</template>

<style scoped lang="scss">
.poster-maker {
  margin: 0 0 var(--space-6); break-inside: avoid; font-family: var(--font-sans);
  &__slides { container-type: inline-size; position: relative; overflow: hidden; aspect-ratio: 4 / 5; border-radius: var(--radius-xl); background: #eeeae3; color: #29252b; }
  &__empty { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 12px; padding: 8cqw; text-align: center; font-size: 4cqw; }
  &__add {
    position: absolute; z-index: 2; bottom: 5cqw; left: 50%; transform: translateX(-50%);
    display: grid; place-items: center; width: 64px; height: 64px; padding: 0;
    border-radius: var(--radius-full); background: #f1d58a !important; color: #24221f !important;
    box-shadow: 0 0 0 1px #00000014, 0 2px 4px #00000024, 0 8px 24px #00000038;
    transition: background-color 150ms ease, box-shadow 150ms ease, scale 150ms ease;
  }
  &__add:hover { background: #ffe5a2 !important; box-shadow: 0 0 0 1px #00000014, 0 3px 6px #00000024, 0 10px 28px #00000045; }
  &__add:active { scale: .96; }
  button.poster-maker__add:focus-visible { outline: 3px solid #fff; outline-offset: 4px; }
  &__add.is-hinting { animation: poster-add-hint 3s ease-in-out infinite; }
  &__add svg { width: 30px; height: 30px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
  &__published { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: cover; }
  &__previous, &__next { appearance: none; -webkit-appearance: none; -webkit-tap-highlight-color: transparent; touch-action: manipulation; position: absolute; top: 0; bottom: 0; width: 30%; padding: 0; background: transparent; }
  &__previous { left: 0; }
  &__next { right: 0; }
  &__previous::after, &__next::after { content: ''; position: absolute; inset: 0; opacity: 0; transition: opacity .16s ease; pointer-events: none; }
  &__previous::after { background: linear-gradient(90deg, #00000014, transparent); }
  &__next::after { background: linear-gradient(-90deg, #00000014, transparent); }
  @media (hover: hover) { &__previous:hover::after, &__next:hover::after { opacity: 1; } }
  &__previous:focus-visible::after, &__next:focus-visible::after,
  &__previous:active::after, &__next:active::after { opacity: 1; }
  @media (prefers-reduced-motion: reduce) { &__previous::after, &__next::after { transition: none; } }
  &__count { position: absolute; top: 5cqw; left: 50%; transform: translateX(-50%); padding: .3rem .6rem; border-radius: var(--radius-full); background: #eeeae330; color: #ffffffb3; font-size: 2.5cqw; pointer-events: none; }
  &__art { container-type: inline-size; position: relative; isolation: isolate; overflow: hidden; aspect-ratio: 4 / 5; border-radius: var(--radius-xl); background: #b4869d; }
  canvas { display: block; width: 100%; height: 100%; border-radius: inherit; }
  &__heading { position: absolute; top: 5cqw; inset-inline: 7cqw; display: flex; justify-content: space-between; align-items: center; font-size: 2.5cqw; font-weight: 400; font-style: normal; }
  button { font: inherit; color: inherit; border: 0; background: transparent; cursor: pointer; min-height: 44px; }
  &__heading button { padding: 0; }
  &__type { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; cursor: move; padding: 0; border: 0; outline: 0; background: transparent; color: inherit; font-family: inherit; font-weight: inherit; font-style: inherit; line-height: 1.08; text-align: center; margin: 0; appearance: none; letter-spacing: 0; resize: none; overflow: auto; scrollbar-width: none; border-radius: 0; }
  &__text-object { position: absolute; left: 8.333%; width: 83.334%; transform-origin: center; }
  &__saved-text { position: absolute; padding: 0; margin: 0; border: 0; outline: 0; border-radius: 0; background: transparent; font-family: inherit; resize: none; overflow: hidden; cursor: text; transform-origin: center; }
  &__saved-text:hover { outline: 1px dashed #fff; }
  &__type::placeholder { color: inherit; opacity: .6; }
  &__type::-webkit-scrollbar { display: none; }
  &__type.is-editing { cursor: text; touch-action: auto; }
  &__text-object { outline: 1px dashed transparent; }
  &__text-object:hover, &__text-object:focus-within, &__text-object.is-active { outline-color: currentColor; }
  &__edge, &__resize { opacity: 0; }
  &__text-object:hover &__edge, &__text-object:hover &__resize,
  &__text-object:focus-within &__edge, &__text-object:focus-within &__resize,
  &__text-object.is-active &__edge, &__text-object.is-active &__resize { opacity: 1; }
  &__edge { position: absolute; width: 32px; height: 32px; min-height: 32px !important; padding: 0; display: grid; place-items: center; touch-action: none; }
  &__edge span { width: 5px; height: 16px; border-radius: 3px; background: #fff; box-shadow: 0 0 0 1px #29252b80; pointer-events: none; }
  button.poster-maker__edge--left { left: -16px; top: calc(50% - 16px); cursor: ew-resize; }
  button.poster-maker__edge--right { right: -16px; top: calc(50% - 16px); cursor: ew-resize; }
  button.poster-maker__edge--top { top: -16px; left: calc(50% - 16px); cursor: ns-resize; }
  button.poster-maker__edge--bottom { bottom: -16px; left: calc(50% - 16px); cursor: ns-resize; }
  &__edge--top span, &__edge--bottom span { width: 16px; height: 5px; }
  &__resize { position: absolute; z-index: 2; width: 32px; height: 32px; min-height: 32px !important; padding: 0; display: grid; place-items: center; touch-action: none; }
  &__resize span { width: 9px; height: 9px; border-radius: 2px; background: #fff; box-shadow: 0 0 0 1px #29252b80; pointer-events: none; }
  button.poster-maker__resize--tl { top: -16px; left: -16px; cursor: nwse-resize; }
  button.poster-maker__resize--tr { top: -16px; right: -16px; cursor: nesw-resize; }
  button.poster-maker__resize--bl { bottom: -16px; left: -16px; cursor: nesw-resize; }
  button.poster-maker__resize--br { bottom: -16px; right: -16px; cursor: nwse-resize; }
  button.poster-maker__rotate-zone { position: absolute; z-index: 1; width: 32px; height: 32px; min-height: 32px !important; padding: 0; touch-action: none; cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M5 8a8 8 0 1 1-1 7M5 3v5h5' fill='none' stroke='white' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M5 8a8 8 0 1 1-1 7M5 3v5h5' fill='none' stroke='%2329252b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 12 12, crosshair; }
  &__rotate-zone--tl { top: -40px; left: -40px; }
  &__rotate-zone--tr { top: -40px; right: -40px; }
  &__rotate-zone--bl { bottom: -40px; left: -40px; }
  &__rotate-zone--br { bottom: -40px; right: -40px; }
  &__guide { position: absolute; z-index: 4; pointer-events: none; background: #6bdcff; box-shadow: 0 0 1px #0008; }
  &__guide--vertical { top: 0; bottom: 0; width: 1px; }
  &__guide--horizontal { left: 0; right: 0; height: 1px; }
  &__angle { position: absolute; top: 5cqw; left: 50%; transform: translateX(-50%); z-index: 4; padding: 6px 10px; border-radius: var(--radius-full); background: #29252bcc; color: #fff; font-size: 12px; pointer-events: none; }
  &__hint { position: absolute; bottom: 22%; inset-inline: 7cqw; text-align: center; font-size: 2.4cqw; font-style: normal; font-weight: 400; opacity: .7; pointer-events: none; }
  &__tools { position: absolute; bottom: 0; inset-inline: 0; display: flex; justify-content: center; padding: 3cqw 6cqw; border-radius: 0 0 var(--radius-xl) var(--radius-xl); overflow: hidden; background: linear-gradient(transparent, #00000020); }
  &__tools button { flex: 1; min-width: 0; height: 44px; display: grid; place-items: center; padding: 0; border-radius: var(--radius-full); }
  &__tools button.poster-maker__publish { flex: 0 0 auto; padding: 0 16px; margin-left: 6px; background: #f1d58a; color: #24221f; font-size: 12px; font-style: normal; font-weight: 400; }
  &__tools button.poster-maker__publish:hover:not(:disabled) { background: #f7dfa3; }
  &__tools button:hover:not(:disabled) { background: #ffffff22; }
  &__tools button:disabled { opacity: .3; cursor: default; }
  &__tools svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linejoin: round; stroke-linecap: round; }
  button:focus-visible { outline: 2px solid currentColor; outline-offset: -3px; }
  &__edit-heading { position: absolute; z-index: 3; top: 4cqw; inset-inline: 5cqw; display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 14px; font-style: normal; font-weight: 400; }
  &__edit-heading > div { display: flex; gap: 4px; }
  &__edit-heading button { display: grid; place-items: center; min-width: 40px; min-height: 40px; padding: 0 8px; border-radius: var(--radius-full); background: #00000028; color: #fff; }
  &__edit-heading button[aria-pressed=true], &__edit-heading button[aria-expanded=true] { background: #fff; color: #29252b; }
  &__edit-heading svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  &__edit-heading button.poster-maker__done { padding-inline: 16px; }
  &__background-swatch { display: block; width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid #fff; box-shadow: 0 0 0 1px #0003; }
  &__background-picker { position: absolute; z-index: 3; bottom: calc(44px + 6cqw); inset-inline: 6cqw; border-radius: var(--radius-full); padding: 4px 8px; background: #29252bba; }
  &__settings { position: absolute; bottom: 0; inset-inline: 0; z-index: 3; display: flex; flex-direction: column-reverse; gap: 8px; padding: 14px 6cqw 5cqw; color: #fff; background: linear-gradient(transparent, #00000030); font-size: 12px; font-style: normal; font-weight: 400; }
  &__swatches { display: flex; overflow-x: auto; scrollbar-width: none; gap: 2px; padding: 4px; }
  &__swatches::-webkit-scrollbar { display: none; }
  &__swatches button { flex: 0 0 36px; width: 36px; min-height: 36px; padding: 5px; border-radius: var(--radius-full); display: grid; place-items: center; }
  &__swatches span { display: block; width: 26px; height: 26px; box-sizing: border-box; background: var(--swatch); border-radius: 50%; box-shadow: inset 0 0 0 1px #ffffff50; }
  &__swatches button[aria-pressed=true] span { outline: 2px solid #fff; outline-offset: 3px; }
  &__setting-range { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: var(--radius-full); background: #00000040; }
  &__setting-range > span { display: flex; gap: 8px; white-space: nowrap; }
  &__setting-range output { font-variant-numeric: tabular-nums; }
  &__setting-range input { display: block; appearance: none; flex: 1; min-width: 0; height: 28px; background: transparent; margin: 0; cursor: pointer; }
  &__setting-range input::-webkit-slider-runnable-track { height: 2px; border-radius: 2px; background: #ffffff60; }
  &__setting-range input::-webkit-slider-thumb { appearance: none; width: 12px; height: 12px; margin-top: -5px; border-radius: 50%; background: #fff; }
  &__setting-range input::-moz-range-track { height: 2px; border-radius: 2px; background: #ffffff60; }
  &__setting-range input::-moz-range-thumb { width: 12px; height: 12px; border: 0; border-radius: 50%; background: #fff; }
  &__setting-range input:focus-visible { outline: 1px solid #fff; outline-offset: 2px; border-radius: 8px; }
  &__camera { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: inherit; }
  &__camera.is-front { transform: scaleX(-1); }
  &__flip { position: absolute; right: 0; width: 44px; height: 44px; padding: 10px; display: grid; place-items: center; border-radius: 50%; background: #0004 !important; }
  &__flip svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  &__flip:disabled, &__shutter:disabled { opacity: .4; }
  &__capture { position: absolute; bottom: 6cqw; inset-inline: 7cqw; display: flex; align-items: center; justify-content: center; gap: 5cqw; color: #fff; }
  &__camera-heading { color: #fff; text-shadow: 0 1px 3px #000; }
  &__shutter { width: 56px; height: 56px; border-radius: 50%; background: #fff !important; border: 4px solid #ffffff80 !important; box-shadow: inset 0 0 0 3px #777; }
  &__message { position: absolute; bottom: 17%; inset-inline: 7cqw; padding: .8rem; border-radius: .5rem; background: #222c !important; color: #fff !important; font-size: max(11px, 2.5cqw); line-height: 1.4; }
  figcaption { padding: var(--space-3) var(--space-2) 0; font-size: var(--text-sm); color: var(--color-text); }
}
@media (pointer: coarse) {
  .poster-maker__text-object:has(.poster-maker__type:not(.is-editing)) { outline-color: #ffffff80; }
  .poster-maker__text-object .poster-maker__edge, .poster-maker__text-object .poster-maker__resize { opacity: 1; }
  .poster-maker button.poster-maker__edge, .poster-maker button.poster-maker__resize { width: 44px; height: 44px; min-height: 44px !important; }
  .poster-maker button.poster-maker__resize--tl { top: -22px; left: -22px; }
  .poster-maker button.poster-maker__resize--tr { top: -22px; right: -22px; }
  .poster-maker button.poster-maker__resize--bl { bottom: -22px; left: -22px; }
  .poster-maker button.poster-maker__resize--br { bottom: -22px; right: -22px; }
  .poster-maker button.poster-maker__edge--left { left: -22px; top: calc(50% - 22px); }
  .poster-maker button.poster-maker__edge--right { right: -22px; top: calc(50% - 22px); }
  .poster-maker button.poster-maker__edge--top { top: -22px; left: calc(50% - 22px); }
  .poster-maker button.poster-maker__edge--bottom { bottom: -22px; left: calc(50% - 22px); }
  .poster-maker button.poster-maker__rotate-zone { display: none; }
  .poster-maker__swatches button { flex-basis: 44px; width: 44px; min-height: 44px; }
  .poster-maker__edit-heading button { min-width: 44px; min-height: 44px; }
  .poster-maker__heading { font-size: max(12px, 2.5cqw); }
  .poster-maker__tools { padding-inline: 3cqw; }
  .poster-maker__tools button { min-width: 44px; }
  .poster-maker__tools button.poster-maker__publish { padding-inline: 12px; }
}

.poster-slide-enter-active, .poster-slide-leave-active { transition: opacity .8s ease; }
.poster-slide-enter-from, .poster-slide-leave-to { opacity: 0; }
@keyframes poster-add-hint {
  0%, 80%, 100% { transform: translateX(-50%) translateY(0) scale(1) rotate(0); }
  85% { transform: translateX(-50%) translateY(-5px) scale(1.14) rotate(-10deg); }
  90% { transform: translateX(-50%) translateY(-5px) scale(1.14) rotate(10deg); }
  95% { transform: translateX(-50%) translateY(-2px) scale(1.07) rotate(-5deg); }
}
@media (prefers-reduced-motion: reduce) {
  .poster-slide-enter-active, .poster-slide-leave-active { transition: none; }
  .poster-maker__add.is-hinting { animation: none; }
  .poster-maker__add { transition: none; }
}
.poster-gallery {
  width: min(56rem, calc(100vw - 2rem)); max-height: 85dvh; border: 0; padding: 0; background: transparent; color: #eeeae3; font-family: var(--font-sans);
  overflow-y: auto; scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
  &::backdrop { background: #000e; }
  &__inner { position: relative; padding: 4px; }
  h2 { margin: 0 56px 1.5rem 0; font-size: clamp(1.5rem, 4vw, 2.5rem); font-weight: 400; line-height: 1.2; }
  button { min-height: 44px; font: inherit; color: inherit; background: transparent; border: 0; cursor: pointer; }
  &__close { position: absolute; top: 0; right: 0; width: 44px; display: grid; place-items: center; border-radius: 50%; }
  &__close svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; }
  @media (hover: hover) { button:hover { color: #f2df64; } }
  :is(button, a):focus-visible { outline: 2px solid #f2df64; outline-offset: 2px; }
  &__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .75rem; }
  img { display: block; width: 100%; height: auto; aspect-ratio: 4 / 5; object-fit: cover; }
  @media (max-width: 480px) {
    &__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .5rem; }
  }
}
</style>
