import i18next from 'i18next';
import i18nextMiddleware from 'i18next-http-middleware';
import Backend from 'i18next-fs-backend';
import path from 'path';

export const i18n = i18next
  .use(Backend)
  .init({
    // debug: true,
    backend: {
      loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json'),
    },
    ns: ['notifications', 'bookings'],
    defaultNS: 'notifications',
    fallbackLng: 'en',
    preload: ['en', 'ru'],
  });

export const i18nMiddleware = i18nextMiddleware.handle(i18next, {
  ignoreRoutes: ['/foo'], // or function(req, res, options, i18next) { /* return true to ignore */ }
  removeLngFromUrl: false, // removes the language from the url when language detected in path
});
