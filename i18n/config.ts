// Supported locales
export const locales = ['en', 'km'] as const;
export type Locale = (typeof locales)[number];

// Default locale (English) - served at root without prefix
export const defaultLocale: Locale = 'en';

// Locale display names (in their native script)
export const localeNames: Record<Locale, string> = {
  en: 'English',
  km: 'ភាសាខ្មែរ',
};

// Validate if a string is a supported locale
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}
