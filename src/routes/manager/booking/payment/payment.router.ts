import { TRPCError } from '@trpc/server';

import { managerPrivateProcedure } from '../../../../privateProcedures';
import { router } from '../../../createRouter';
import { refundDto, refundTransactionsDto } from './dto';
import { phoneAuthDto } from '../../../auth/dto';
import { logger } from '../../../../log';
import { bepaidService, expoPushService } from '../../../../services';

export const paymentRouter = router({
  refund: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(refundDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const place = await prisma.place.findFirst({
        where: {
          id: input.placeId,
        },
        select: {
          id: true,
          bepaid_id: true,
          bepaid_secret_key: true,
          name: true,
        },
      });

      if (!place?.bepaid_id || !place?.bepaid_secret_key) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid placeId',
        });
      }

      const transactions = await prisma.refundTransaction.findMany({
        where: {
          booking_id: input.bookingId,
        },
        select: {
          deposit_payment_id: true,
          CanceledMenuItem: {
            where: {
              preorder_menu_item_id: {
                in: input.menuItems?.map((e) => e.itemId) || [],
              },
            },
            select: {
              count: true,
              preorder_menu_item_id: true,
            },
          },
        },
      });

      const isDepositReturned = transactions.some((e) => !!e.deposit_payment_id);
      const canceledItems = transactions.reduce<
        Array<{
          count: number;
          preorder_menu_item_id: string;
        }>
      >((data, prev) => {
        return [...data, ...prev.CanceledMenuItem];
      }, []);

      const depositReq = prisma.depositPayment.findUnique({
        where: { id: input.depositId || '' },
        select: {
          id: true,
          amount: true,
        },
      });
      const itemsReq = prisma.preOrderMenuItem.findMany({
        where: {
          bookingId: input.bookingId,
          id: {
            in: input.menuItems?.map((e) => e.itemId) || [],
          },
        },
        select: {
          id: true,
          count: true,
          PlaceMenuItem: {
            select: {
              price: true,
            },
          },
        },
      });
      const paymentReq = prisma.payment.findFirst({
        where: {
          Booking: {
            id: input.bookingId,
          },
        },
        select: {
          id: true,
          bepaid_captures_id: true,
        },
      });

      let [deposit, preorderItems, payment] = await prisma.$transaction([depositReq, itemsReq, paymentReq]);

      deposit = isDepositReturned ? null : deposit;
      preorderItems = preorderItems.reduce<
        Array<{
          PlaceMenuItem: {
            price: number;
          };
          id: string;
          count: number;
        }>
      >((data, prev) => {
        const canceledItemCount = canceledItems.reduce(
          (sum, item) => (item.preorder_menu_item_id === prev.id ? sum + item.count : sum),
          0
        );
        const item = input.menuItems?.find((item) => item.itemId === prev.id);
        if (item && item.count !== 0 && prev.count >= canceledItemCount + item.count) {
          return [...data, prev];
        }
        return data;
      }, []);

      const totalAmount =
        (deposit?.amount || 0) +
        preorderItems.reduce((sum, prev) => {
          if (!input.menuItems?.length) return sum;
          const item = input.menuItems.find((e) => e.itemId === prev.id);
          if (item) {
            return item.count * prev.PlaceMenuItem.price;
          }
          return sum;
        }, 0);

      if (!totalAmount) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid totalCount. It must not to be 0',
        });
      }

      if (!payment?.bepaid_captures_id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Payment not found',
        });
      }

      const refundData = await bepaidService.refund({
        amount: totalAmount,
        uid: payment.bepaid_captures_id,
        bePaidId: place.bepaid_id,
        secretKey: place.bepaid_secret_key,
      });

      let manager = {};
      if ('role' in req.user) {
        manager = {
          Employee: {
            connect: {
              id: req.user.id,
            },
          },
        };
      } else {
        manager = {
          Owner: {
            connect: {
              id: req.user.id,
            },
          },
        };
      }

      const transaction = await prisma.refundTransaction.create({
        data: {
          ...manager,
          amount: totalAmount,
          status: refundData.status,
          bepaid_uid: refundData.uid,
          Booking: {
            connect: {
              id: input.bookingId,
            },
          },
          DepositPayment: deposit?.id
            ? {
                connect: {
                  id: deposit.id,
                },
              }
            : undefined,
          CanceledMenuItem: input.menuItems?.length
            ? {
                createMany: {
                  data: preorderItems.map((e) => {
                    const element = input.menuItems?.find((item) => item.itemId === e.id);
                    if (!element) {
                      return {
                        count: 0,
                        preorder_menu_item_id: e.id,
                      };
                    }
                    return {
                      count: element.count,
                      preorder_menu_item_id: e.id,
                    };
                  }),
                },
              }
            : undefined,
        },
        select: {
          id: true,
          amount: true,
          deposit_payment_id: true,
          CanceledMenuItem: {
            select: {
              preorder_menu_item_id: true,
              count: true,
              id: true,
            },
          },
          Booking: {
            select: {
              id: true,
              booking_number: true,
              Client: {
                select: {
                  expo_token: true,
                  push_notifications: true,
                  language: true,
                },
              },
            },
          },
        },
      });

      const booking = transaction.Booking;
      const client = booking?.Client;
      if (place && booking && client && client.push_notifications && client.expo_token) {
        const lng = client.language || 'ru';
        const message = req.t(`refund`, { ns: 'notifications', name: place.name, lng });
        await expoPushService.sendNotification({
          pushToken: client.expo_token,
          data: {
            bookingId: booking.id,
            orderNumber: booking.booking_number,
            placeId: place.id,
          },
          title: 'Mesto',
          message,
        });
      }

      return {
        canceledMenuItems: transaction.CanceledMenuItem,
        isDepositReturned: !!transaction.deposit_payment_id,
        depositAmount: deposit,
        preorderAmount: preorderItems.reduce((sum, prev) => sum + (prev.count + prev.PlaceMenuItem.price), 0),
      };
    }),
  refundTransaction: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(refundTransactionsDto)
    .query(async ({ ctx: { prisma }, input }) => {
      const list = await prisma.refundTransaction.findMany({
        where: {
          booking_id: input.bookingId,
        },
        select: {
          id: true,
          amount: true,
          deposit_payment_id: true,
          DepositPayment: {
            select: {
              amount: true,
            },
          },
          CanceledMenuItem: {
            select: {
              preorder_menu_item_id: true,
              count: true,
              id: true,
            },
          },
        },
      });

      const isDepositReturned = list.some((e) => !!e.deposit_payment_id);
      const depositAmount = list.find((e) => !!e.deposit_payment_id)?.amount;

      return {
        canceledMenuItems: list.map((e) => e.CanceledMenuItem).flat(),
        isDepositReturned,
        totalAmount: (depositAmount || 0) + list.reduce((sum, prev) => sum + prev.amount, 0),
      };
    }),
});
