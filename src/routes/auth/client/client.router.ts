import { router } from '../../createRouter';
import { mobileAuthRouter } from './mobile';
import { webAuthRouter } from './web';

export const clientAuthRouter = router({
  mobile: mobileAuthRouter,
  web: webAuthRouter,
});
