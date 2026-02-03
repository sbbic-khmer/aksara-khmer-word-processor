import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Export localized navigation components and hooks
// These automatically handle locale prefixes in URLs
export const {
  Link,
  redirect,
  usePathname,
  useRouter,
  getPathname,
} = createNavigation(routing);
