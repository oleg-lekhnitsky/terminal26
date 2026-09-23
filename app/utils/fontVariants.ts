export const fontVariants = [
  { id: 'regular', label: 'Regular', weight: 400, style: 'normal' },
  { id: 'italic', label: 'Italic', weight: 400, style: 'italic' },
  { id: 'bold', label: 'Bold', weight: 700, style: 'normal' },
  { id: 'bold-italic', label: 'Bold Italic', weight: 700, style: 'italic' },
] as const

export type FontVariantId = typeof fontVariants[number]['id']
