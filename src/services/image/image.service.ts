import { DeleteObjectsCommandInput, DeleteObjectsCommandOutput, ObjectIdentifier, S3 } from '@aws-sdk/client-s3';
import { TRPCError } from '@trpc/server';
import { FileExtension } from 'file-type';
import { fromBuffer } from 'file-type/core';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export enum EBucketNames {
  MAIN = 'mesto-images',
}

export enum EFolders {
  PLACES = 'places',
  TABLES = 'tables',
  MENU_ITEMS = 'menu-items',
}

export enum ESize {
  BASE = 'base',
  LARGE = 'large',
  MEDIUM = 'medium',
  SMALL = 'small',
}

const imageWidths = {
  [ESize.BASE]: null,
  [ESize.LARGE]: 600,
  [ESize.MEDIUM]: 300,
  [ESize.SMALL]: 200,
};

export interface IImageResponse {
  buffer: Buffer;
  key: string;
  size: number;
  ext: FileExtension;
}

export type TUploadResponse<T extends Array<ESize> = Array<ESize>> = Record<
  T extends undefined ? ESize : T[number],
  IImageResponse
>;

const allowedExtensions: Array<FileExtension> = ['png', 'webp', 'jpg', 'pdf'];

class ImageService {
  private s3: S3;

  constructor() {
    if (!process.env.AWS_ACCESS_KEY_ID) {
      throw new Error('AWS_ACCESS_KEY_ID is not defined');
    }
    if (!process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS_SECRET_ACCESS_KEY is not defined');
    }
    if (!process.env.AWS_REGION) {
      throw new Error('AWS_REGION is not defined');
    }

    this.s3 = new S3({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  private async resizeImage(image: Buffer, width: number) {
    return await sharp(image).resize(width).toBuffer();
  }

  private async removeImageMeta(image: Buffer) {
    return sharp(image)
      .withMetadata({
        exif: {},
      })
      .removeAlpha()
      .toBuffer();
  }

  async getFileType(imageBuffer: Buffer) {
    return await fromBuffer(imageBuffer);
  }

  async upload<T extends Array<ESize> = Array<ESize>>(
    image: Buffer,
    { key, bucket = EBucketNames.MAIN, sizes }: { key: EFolders; bucket: EBucketNames; sizes?: T }
  ): Promise<TUploadResponse<T>> {
    const imageBuffer: Buffer = await this.removeImageMeta(image);

    const fileType = await this.getFileType(imageBuffer);

    const { ext, mime } = fileType!;

    const result: TUploadResponse = {} as TUploadResponse;

    const fileName = uuidv4();

    for (const size of [...(sizes ? sizes : Object.values(ESize))]) {
      const Key = `${key}/${fileName}-${size}.${ext}`;
      const body = imageWidths[size] ? await this.resizeImage(imageBuffer, imageWidths[size]!) : imageBuffer;
      const params = {
        Bucket: bucket,
        Key,
        ContentType: mime,
        Body: body,
      };
      await this.s3.putObject(params);

      result[size] = {
        key: Key,
        ext,
        buffer: body,
        size: Buffer.byteLength(body),
      };
    }

    return result;
  }

  async removeObjects({
    objects,
    bucket,
  }: {
    objects: Array<ObjectIdentifier>;
    bucket: EBucketNames;
  }): Promise<DeleteObjectsCommandOutput> {
    const params: DeleteObjectsCommandInput = {
      Bucket: bucket,
      Delete: {
        Objects: objects,
        Quiet: true,
      },
    };

    return await this.s3.deleteObjects(params);
  }

  async validateAndTransform(base64Array: Array<string>): Promise<Array<Buffer>> {
    return await Promise.all(
      base64Array.map(async (base64Image) => {
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        const fileType = await this.getFileType(buffer);

        if (!fileType?.ext) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'invalid_image' });
        }

        if (!allowedExtensions.includes(fileType.ext)) {
          // Not allowed extension. Allowed extensions are png, jpg, jpeg, webp and pdf.
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'not_allowed_extension' });
        }

        return buffer;
      })
    );
  }
}

const imageService = new ImageService();

class ImageBucketService {
  private bucket: EBucketNames;
  private imageService: ImageService;

  constructor(bucket: EBucketNames) {
    this.imageService = imageService;
    this.bucket = bucket;
  }

  async upload<T extends Array<ESize> = Array<ESize>>(
    image: Buffer,
    props: { key: EFolders; sizes?: T }
  ): Promise<TUploadResponse<T>> {
    return await this.imageService.upload<T>(image, { ...props, bucket: this.bucket });
  }

  async removeObjects(objects: Array<ObjectIdentifier>): Promise<DeleteObjectsCommandOutput> {
    return await this.imageService.removeObjects({ objects, bucket: this.bucket });
  }

  async getFileType(buffer: Buffer) {
    return await this.imageService.getFileType(buffer);
  }

  async validateAndTransform(...args: Parameters<typeof this.imageService.validateAndTransform>) {
    return await this.imageService.validateAndTransform(...args);
  }
}

export const imageMainService = new ImageBucketService(EBucketNames.MAIN);
