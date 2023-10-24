import { publicProcedure, router } from '../../createRouter';

export const paymentRouter = router({
  plans: publicProcedure.query(async ({ ctx: { prisma } }) => {
    return await prisma.subscriptionPlan.findMany({
      include: {
        SubscriptionOption: true,
      },
    });
  })
})
