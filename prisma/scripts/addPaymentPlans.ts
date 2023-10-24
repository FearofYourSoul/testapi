import { faker } from '@faker-js/faker';
import { ESubscriptionFormat, PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';


const prisma = new PrismaClient();

const discounts = {
  [ESubscriptionFormat.ANNUAL]: 12,
  [ESubscriptionFormat.SEMI_ANNUAL]: 6,
  [ESubscriptionFormat.MONTHLY]: 0,
}

const monthlyPay = {
  [ESubscriptionFormat.ANNUAL]: 12,
  [ESubscriptionFormat.SEMI_ANNUAL]: 3,
  [ESubscriptionFormat.MONTHLY]: 1,
}

export const addPaymentPlans = async () => {
  const options = await prisma.$transaction(Array.from({ length: 12 }, () => prisma.subscriptionOption.create({
    data: {
      label: faker.company.catchPhrase(),
      SubscriptionPlan: {},
    }
  })));

  await prisma.$transaction(Array.from({ length: 5 }, (_, i) => prisma.subscriptionDiscount.create({
    data: {
      label: faker.company.catchPhrase(),
      discount: i === 0 ? 100 : i * 10,
      start: dayjs().toDate(),
      end: dayjs().add(1, 'year').toDate(),
      amount: 1,
      promotion_code: i === 0 ? undefined : faker.random.alphaNumeric(12),
    }
  })));

  const plan = await prisma.subscriptionPlan.create({
    data: {
      name: 'FREE',
      format: 'MONTHLY',
      price: 0,
      discount: 0,
      SubscriptionOption: {
        connectOrCreate: options.slice(5).map(({ id, label }) => ({
          where: { id }, create: {
            label
          }
        })),
      }
    }
  });

  await prisma.$transaction(Object.values(ESubscriptionFormat).map((value) => prisma.subscriptionPlan.create({
    data: {
      name: 'PLUS',
      format: value,
      price: 12000 * monthlyPay[value] - 120 * monthlyPay[value] * discounts[value],
      month_count: monthlyPay[value],
      discount: monthlyPay[value],
      SubscriptionOption: {
        connectOrCreate: options.slice(8).map(({ id, label }) => ({
          where: { id }, create: {
            label
          }
        })),
      }
    },
  })));

  await prisma.$transaction(Object.values(ESubscriptionFormat).map((value) => prisma.subscriptionPlan.create({
    data: {
      name: 'PRO',
      format: value,
      month_count: monthlyPay[value],
      discount: monthlyPay[value],
      price: 15000 * monthlyPay[value] - 150 * monthlyPay[value] * discounts[value],
      SubscriptionOption: {
        connectOrCreate: options.map(({ id, label }) => ({
          where: { id }, create: {
            label
          }
        })),
      }
    },
  })));

  prisma.$disconnect();

  return plan;
};
