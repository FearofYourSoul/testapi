import { ObjectIdentifier } from '@aws-sdk/client-s3';
import { Image, Prisma, PrismaClient } from '@prisma/client';

import { EFolders, ESize, imageMainService } from './image.service';

export type TImage = Pick<Image, 'id' | 'base' | 'large' | 'medium' | 'small'>;

interface IGeneralImageLimitProps {
  max: number;
  incoming: number;
  shouldBeDeleted?: number;
}
interface IPlaceImageLimitProps extends IGeneralImageLimitProps {
  placeId: string;
  tableId?: never;
}
interface ITableImageLimitProps extends IGeneralImageLimitProps {
  placeId?: never;
  tableId: string;
}

type TCheckImageLimitProps = IPlaceImageLimitProps | ITableImageLimitProps;

interface IGeneralUploadImagesProps {
  imagesBuffers: Array<Buffer>;
  key: EFolders;
}

interface IUploadBasePlaceImageProps extends IGeneralUploadImagesProps {
  base_place_id: string;
  place_id?: never;
  table_id?: never;
}
interface IUploadPlacesImagesProps extends IGeneralUploadImagesProps {
  base_place_id?: never;
  place_id: string;
  table_id?: never;
}
interface IUploadTablesImagesProps extends IGeneralUploadImagesProps {
  base_place_id?: never;
  place_id?: never;
  table_id: string;
}

interface IUploadPlaceMenuItemImageProps {
  imagesBuffers: Buffer;
  placeMenuItemId: string;
}

type TUploadImageProps = IUploadTablesImagesProps | IUploadPlacesImagesProps | IUploadBasePlaceImageProps;

export class ImageSupport {
  constructor(private readonly prisma: PrismaClient) {}

  async checkImageLimit({
    max,
    incoming,
    shouldBeDeleted = 0,
    placeId,
    tableId,
  }: TCheckImageLimitProps): Promise<boolean> {
    const imagesLength = await this.prisma.image.count({
      where: {
        place_id: placeId,
        place_table_id: tableId,
      },
    });

    return imagesLength + incoming - shouldBeDeleted <= max;
  }

  async removeImage(image: TImage) {
    await this.prisma.image.delete({
      where: {
        id: image.id,
      },
    });

    const objects: Array<ObjectIdentifier> = [];

    for (const [key, Key] of Object.entries(image)) {
      if (!Key || key === 'id') {
        continue;
      }

      objects.push({ Key });
    }

    await imageMainService.removeObjects(objects);
  }

  async removeManyImages(images: Array<TImage>) {
    await this.prisma.image.deleteMany({
      where: {
        id: {
          in: images.map(({ id }) => id),
        },
      },
    });

    const objects: Array<ObjectIdentifier> = [];

    for (const image of images) {
      for (const [key, Key] of Object.entries(image)) {
        if (!Key || key === 'id') {
          continue;
        }

        objects.push({ Key });
      }
    }

    await imageMainService.removeObjects(objects);
  }

  private async uploadImages({ imagesBuffers, place_id, table_id, key, base_place_id }: TUploadImageProps) {
    const imagesBuSizes = await Promise.all(
      imagesBuffers.map(async (buffer) => {
        return imageMainService.upload(buffer, { key });
      })
    );

    const result = await this.prisma.$transaction(
      imagesBuSizes.map((image) => {
        return this.prisma.image.create({
          data: {
            place_id,
            place_table_id: table_id,
            base_place_id: base_place_id,
            [ESize.SMALL]: image[ESize.SMALL].key,
            [ESize.MEDIUM]: image[ESize.MEDIUM].key,
            [ESize.LARGE]: image[ESize.LARGE].key,
            [ESize.BASE]: image[ESize.BASE].key,
          },
          select: {
            id: true,
            [ESize.SMALL]: true,
            [ESize.MEDIUM]: true,
            [ESize.LARGE]: true,
            [ESize.BASE]: true,
          },
        });
      })
    );

    return result;
  }

  async uploadPlacesImages(input: Omit<IUploadPlacesImagesProps | IUploadBasePlaceImageProps, 'key'>) {
    return await this.uploadImages({ ...input, key: EFolders.PLACES } as TUploadImageProps);
  }

  async uploadTablesImages(input: Omit<IUploadTablesImagesProps, 'key'>) {
    return await this.uploadImages({ ...input, key: EFolders.TABLES });
  }

  async uploadPlaceMenuItemImage(input: IUploadPlaceMenuItemImageProps) {
    const uploadedImage = await imageMainService.upload(input.imagesBuffers, { key: EFolders.MENU_ITEMS });

    const result = await this.prisma.image.create({
      data: {
        PlaceMenuItem: {
          connect: {
            id: input.placeMenuItemId,
          },
        },
        [ESize.SMALL]: uploadedImage[ESize.SMALL].key,
        [ESize.MEDIUM]: uploadedImage[ESize.MEDIUM].key,
        [ESize.LARGE]: uploadedImage[ESize.LARGE].key,
        [ESize.BASE]: uploadedImage[ESize.BASE].key,
      },
      select: {
        id: true,
        [ESize.SMALL]: true,
        [ESize.MEDIUM]: true,
        [ESize.LARGE]: true,
        [ESize.BASE]: true,
      },
    });

    return result;
  }
}
