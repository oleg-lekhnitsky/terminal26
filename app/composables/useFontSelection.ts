import { fontVariants, type FontVariantId } from '~/utils/fontVariants'

export function useFontSelection() {
  const selectedFont = useState<FontVariantId>('specimen-font', () => 'bold')
  const activeFont = computed(() => fontVariants.find(font => font.id === selectedFont.value) ?? fontVariants[2])
  return { selectedFont, activeFont, fontVariants }
}
