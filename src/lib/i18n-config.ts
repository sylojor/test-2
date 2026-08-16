// ============================================
// i18n Configuration — URL-based locale routing
// ============================================

export const i18n = {
  defaultLocale: 'ar',
  locales: ['ar', 'en'],
} as const

export type Locale = 'ar' | 'en'
