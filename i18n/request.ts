import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that the incoming `locale` is valid
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  // Load messages for the locale and English fallback
  const messages = (await import(`../messages/${locale}.json`)).default;
  const defaultMessages = locale !== 'en'
    ? (await import(`../messages/en.json`)).default
    : messages;

  // Deep merge: use locale messages, fall back to English for missing keys
  const mergedMessages = locale === 'en'
    ? messages
    : deepMerge(defaultMessages, messages);

  return {
    locale,
    messages: mergedMessages,
  };
});

// Deep merge two objects, with obj2 values taking precedence
function deepMerge(obj1: Record<string, unknown>, obj2: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...obj1 };

  for (const key in obj2) {
    if (Object.prototype.hasOwnProperty.call(obj2, key)) {
      if (
        typeof obj2[key] === 'object' &&
        obj2[key] !== null &&
        !Array.isArray(obj2[key]) &&
        typeof obj1[key] === 'object' &&
        obj1[key] !== null &&
        !Array.isArray(obj1[key])
      ) {
        result[key] = deepMerge(
          obj1[key] as Record<string, unknown>,
          obj2[key] as Record<string, unknown>
        );
      } else {
        result[key] = obj2[key];
      }
    }
  }

  return result;
}
