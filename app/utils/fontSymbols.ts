// Generated from the Unicode cmap tables of the bundled AB Terminal fonts.
// Keep variant-specific coverage so unsupported characters never use fallback fonts.
import type { FontVariantId } from './fontVariants.ts'

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
