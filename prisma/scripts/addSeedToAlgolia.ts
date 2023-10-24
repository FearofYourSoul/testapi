import { PrismaClient } from '@prisma/client';

import { algoliaSearchService } from '../../src/services/algolia.service';

const prisma = new PrismaClient();

export const addSeedsToAlgolia = async () => {
  const places = await prisma.place.findMany({
    where: { id: { contains: '-' } },
    include: {
      Address: true,
      PlaceKitchen: {
        include: {
          Kitchen: true,
        },
      },
      CategoryPlace: {
        include: {
          Category: true,
        },
      },
      PlaceSection: true,
      PlaceMenuCategory: {
        select: {
          name: true,
        }
      },
      PlaceMenuItems: {
        select: {
          name: true,
        }
      },
    },
  });

  await algoliaSearchService.addPlaces(places);
  prisma.$disconnect();
};

addSeedsToAlgolia().then(() => {
  console.log('seeds added');
}).catch((err) => {
  console.log(err);
});
