// Generated from the Unicode cmap tables of the bundled AB Terminal fonts.
// Keep variant-specific coverage so unsupported characters never use fallback fonts.
import type { FontVariantId } from './fontVariants.ts'

// Character-by-character renderers cannot shape a multi-letter font ligature.
// Resolve it before casing or segmentation; normal text still uses OpenType.
export function resolveFontSymbols(text: string) {
  return text.replaceAll('thebird', '\uE000').replaceAll('thekey', '\uE001').replaceAll('thecup', '\uE002').replaceAll('thecoctail', '\uE003').replaceAll('thetaxi', '\uE004').replaceAll('thechair', '\uE005')
}

export const fontSymbols: Record<FontVariantId, readonly string[]> = {
  "regular": ["!", "\"", "#", "$", "%", "&", "'", "(", ")", "*", "+", ",", "-", ".", "/", ":", ";", "<", "=", ">", "?", "@", "[", "\\", "]", "^", "_", "`", "{", "|", "}", "©", "¶", "×", "₽", "←", "↑", "→", "↓", "−", "｛", "｝"],
  "italic": ["!", "\"", "#", "$", "&", "'", "(", ")", "*", "+", ",", "-", ".", "/", ":", ";", "<", "=", ">", "?", "@", "[", "\\", "]", "^", "_", "{", "}", "×", "–", "•", "₽", "←", "↑", "→", "↓", "−", "！", "＃", "％", "＆", "＇", "＊", "，", "－", "．", "／", "：", "；", "＠", "＼"],
  "bold": ["!", "\"", "#", "$", "&", "'", "(", ")", "*", "+", ",", "-", ".", "/", ":", ";", "<", "=", ">", "?", "@", "[", "]", "^", "_", "{", "|", "}", "£", "¥", "©", "¶", "–", "—", "‘", "’", "„", "…", "‹", "›", "₽", "←", "↑", "→", "↓", "−", "、", "＂", "＃", "％", "＊", "，", "？", "＠", "＼"],
  "bold-italic": ["!", "\"", "#", "$", "%", "&", "'", "(", ")", "*", "+", ",", "-", ".", "/", ":", ";", "<", "=", ">", "?", "@", "[", "\\", "]", "^", "_", "{", "|", "}", "©", "•", "…", "‹", "›", "₽", "←", "↑", "→", "↓", "−", "〈", "〉", "＃", "％", "（", "）", "＊", "，", "－", "．", "／", "：", "；", "？", "［", "＼", "］"],
}

export function oneShotText(variant: FontVariantId) {
  const pairs = Array.from({ length: 26 }, (_, index) => {
    const upper = String.fromCharCode(65 + index)
    return upper + upper.toLowerCase()
  })
  return [...pairs, ...fontSymbols[variant]].join(' ')
}
