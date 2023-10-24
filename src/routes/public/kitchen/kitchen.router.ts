import { publicProcedure, router } from '../../createRouter';

export const kitchenRouter = router({
  list: publicProcedure.query(async ({ ctx: { prisma } }) => {
    const totalCount = await prisma.kitchen.count();
    const kitchens = await prisma.kitchen.findMany();

    return {
      totalCount,
      kitchens,
    };
  }),
});
