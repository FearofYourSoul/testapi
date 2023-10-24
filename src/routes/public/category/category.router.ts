import { publicProcedure, router } from '../../createRouter';

export const categoryRouter = router({
  list: publicProcedure.query(async ({ ctx: { prisma } }) => {
    const totalCount = await prisma.category.count();
    const categories = await prisma.category.findMany();

    return {
      totalCount,
      categories,
    };
  }),
});
