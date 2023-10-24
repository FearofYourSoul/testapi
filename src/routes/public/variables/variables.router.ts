import { publicProcedure, router } from '../../createRouter';

export const variablesRouter = router({
  list: publicProcedure.query(async ({ ctx: { prisma } }) => {
    const variables = await prisma.appSettings.findFirst({
      select: { client_transaction_time: true },
      orderBy: { created_at: 'desc' },
    });

    return variables;
  }),
});
