export const fontVariants = [
  { id: 'regular', label: 'Regular', family: '"AB Terminal", sans-serif', weight: 400, style: 'normal' },
  { id: 'italic', label: 'Italic', family: '"AB Terminal", sans-serif', weight: 400, style: 'italic' },
  { id: 'bold', label: 'Bold', family: '"AB Terminal", sans-serif', weight: 700, style: 'normal' },
  { id: 'bold-italic', label: 'Bold Italic', family: '"AB Terminal", sans-serif', weight: 700, style: 'italic' },
  { id: 'condensed', label: 'Condensed', family: '"AB Terminal Condensed", sans-serif', weight: 400, style: 'normal' },
  { id: 'condensed-italic', label: 'Condensed Italic', family: '"AB Terminal Condensed", sans-serif', weight: 400, style: 'italic' },
  { id: 'condensed-bold', label: 'Condensed Bold', family: '"AB Terminal Condensed", sans-serif', weight: 700, style: 'normal' },
  { id: 'condensed-bold-italic', label: 'Condensed Bold Italic', family: '"AB Terminal Condensed", sans-serif', weight: 700, style: 'italic' },
] as const

export type FontVariantId = typeof fontVariants[number]['id']
