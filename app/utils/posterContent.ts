export function hasPosterContent(content: unknown): boolean {
  if (!content || typeof content !== 'object') return false
  const { photo, texts } = content as { photo?: unknown; texts?: unknown }
  return photo === true || (Array.isArray(texts) && texts.some(text =>
    typeof text === 'string' && text.replace(/[\s\p{Cf}]/gu, '').length > 0,
  ))
}
