// import the original type declarations
import 'i18next';
// import all namespaces (for the default language, only)
import notifications from './locales/en/notifications.json';
import bookings from './locales/en/bookings.json';
import email from './locales/en/bookings.json';

declare module 'i18next' {
  // Extend CustomTypeOptions
  interface CustomTypeOptions {
    // custom namespace type, if you changed it
    defaultNS: 'notifications';
    // custom resources type
    resources: {
      notifications: typeof notifications;
      bookings: typeof bookings;
      email: typeof email;
    };
    // other
  }
}
