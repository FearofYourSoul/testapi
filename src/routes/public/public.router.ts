import { router } from '../createRouter';
import { categoryRouter } from './category';
import { kitchenRouter } from './kitchen';
import { locationRouter } from './location';
import { paymentRouter } from './payment';
import { placeRouter } from './place';
import { variablesRouter } from './variables';

export const publicRouter = router({
  category: categoryRouter,
  kitchen: kitchenRouter,
  location: locationRouter,
  payments: paymentRouter,
  places: placeRouter,
  variables: variablesRouter,
});
