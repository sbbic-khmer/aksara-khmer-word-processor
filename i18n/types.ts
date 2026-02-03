import messages from '../messages/en.json';

type Messages = typeof messages;

declare global {
  // Use type safe message keys with `useTranslations`
  interface IntlMessages extends Messages {}
}
