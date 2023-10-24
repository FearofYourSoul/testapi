import { Prisma, PrismaClient } from '@prisma/client';

interface IGeneralCheckManagerArguments {
  userId: string;
}

interface ITableCheckManagerArguments extends IGeneralCheckManagerArguments {
  tableId: string;
  placeId?: never;
  sectionId?: never;
}
interface IPlaceCheckManagerArguments extends IGeneralCheckManagerArguments {
  tableId?: never;
  placeId: string;
  sectionId?: never;
}

interface IPlaceSectionCheckManagerArguments extends IGeneralCheckManagerArguments {
  tableId?: never;
  placeId?: never;
  sectionId: string;
}
interface IAllCheckManagerArguments extends IGeneralCheckManagerArguments {
  tableId?: string;
  placeId: string;
  sectionId: string;
}

interface IGeneralCheckManagerOutput {
  place_id: string;
}

interface IPlaceCheckManagerOutput extends IGeneralCheckManagerOutput {
  section_id: string;
  table_id?: never;
}
interface ITableCheckManagerOutput extends IGeneralCheckManagerOutput {
  section_id?: never;
  table_id: string;
}

type ICheckManagerArguments =
  | IPlaceCheckManagerArguments
  | ITableCheckManagerArguments
  | IAllCheckManagerArguments
  | IPlaceSectionCheckManagerArguments;

// TODO: transform to middleWare ?
export const checkManager = async <T extends ICheckManagerArguments = ICheckManagerArguments>(
  prisma: PrismaClient,
  input: T
): Promise<false | (T extends IPlaceCheckManagerArguments ? IPlaceCheckManagerOutput : ITableCheckManagerOutput)> => {
  const { userId, tableId, placeId, sectionId } = input;
  let result;

  if (tableId) {
    result = await prisma.placeTable.findFirst({
      where: {
        id: tableId,
        PlaceSection: {
          id: sectionId,
          place_id: placeId,
          Place: {
            OR: [
              { owner_id: userId },
              {
                Employee: {
                  some: {
                    Employee: {
                      id: userId,
                    },
                  },
                },
              },
            ],
          },
        },
      },
      select: { id: true, PlaceSection: { select: { id: true, place_id: true } } },
    });
  } else {
    result = {
      PlaceSection: await prisma.placeSection.findFirst({
        where: {
          id: sectionId,
          place_id: placeId,
          Place: {
            OR: [
              { owner_id: userId },
              {
                Employee: {
                  some: {
                    Employee: {
                      id: userId,
                    },
                  },
                },
              },
            ],
          },
        },
        select: { id: true, place_id: true },
      }),
    };
  }

  if (!result?.PlaceSection) {
    return false;
  }

  return {
    place_id: result.PlaceSection.place_id,
    section_id: result.PlaceSection.id,
    table_id: input.tableId !== undefined ? result.id : undefined,
  } as T extends IPlaceCheckManagerArguments ? IPlaceCheckManagerOutput : ITableCheckManagerOutput;
};
