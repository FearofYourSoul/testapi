import { router } from '../createRouter';
import { adminAuthRouter } from './admin';
import { clientAuthRouter } from './client';
import { employeeAuthRouter } from './employee';
import { managerAuthRouter } from './manager';
import { ownerAuthRouter } from './owner';

export const authRouter = router({
  admin: adminAuthRouter,
  client: clientAuthRouter,
  employee: employeeAuthRouter,
  manager: managerAuthRouter,
  owner: ownerAuthRouter,
})
