/**
 * Tag color constants
 * These colors are optimized for accessibility (WCAG AA 4.5:1 contrast ratio with dark text)
 */

export interface TagColor {
  value: string
  label: string
  bgColor: string
  textColor: string
}

export const TAG_COLORS: TagColor[] = [
  {
    value: 'blue-100',
    label: 'Light Blue',
    bgColor: '#dbeafe',
    textColor: '#18181b', // zinc-950
  },
  {
    value: 'green-100',
    label: 'Light Green',
    bgColor: '#dcfce7',
    textColor: '#18181b',
  },
  {
    value: 'amber-100',
    label: 'Light Yellow',
    bgColor: '#fef3c7',
    textColor: '#18181b',
  },
  {
    value: 'red-100',
    label: 'Light Pink',
    bgColor: '#ffe2e2',
    textColor: '#18181b',
  },
  {
    value: 'zinc-100',
    label: 'Light Gray',
    bgColor: '#f4f4f5',
    textColor: '#18181b',
  },
  {
    value: 'blue-200',
    label: 'Medium Blue',
    bgColor: '#bedbff',
    textColor: '#18181b',
  },
  {
    value: 'green-200',
    label: 'Medium Green',
    bgColor: '#b9f8cf',
    textColor: '#18181b',
  },
  {
    value: 'amber-200',
    label: 'Medium Yellow',
    bgColor: '#fee685',
    textColor: '#18181b',
  },
]

/**
 * Get the next available color for a user's tags
 * Auto-assigns colors in order, cycling back to start if all colors are used
 */
export function getNextAvailableColor(usedColors: string[]): string {
  // Find first color not in usedColors
  const availableColor = TAG_COLORS.find(
    (color) => !usedColors.includes(color.bgColor)
  )

  // If found, return it; otherwise cycle back to first color
  return availableColor ? availableColor.bgColor : TAG_COLORS[0].bgColor
}

/**
 * Get text color for a given background color
 */
export function getTextColorForBackground(bgColor: string): string {
  const tagColor = TAG_COLORS.find((color) => color.bgColor === bgColor)
  return tagColor ? tagColor.textColor : '#18181b' // default to zinc-950
}

/**
 * Get label for a color value
 */
export function getColorLabel(bgColor: string): string {
  const tagColor = TAG_COLORS.find((color) => color.bgColor === bgColor)
  return tagColor ? tagColor.label : 'Unknown'
}
