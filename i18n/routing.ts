import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from './config';

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Only show locale prefix for non-default locales (e.g., /km/editor but not /en/editor)
  localePrefix: 'as-needed',
  // Disable automatic locale detection from Accept-Language header
  // Users explicitly choose their language via the language switcher
  localeDetection: false,
});
