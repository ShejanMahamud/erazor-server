import { ImageStatus } from "generated/prisma";
import { IGlobalRes } from "src/types";

export interface IImage {
    id: string;
    userId: string;
    processId: string;
    originalFileName: string;
    originalImageUrlLQ: string;
    originalImageUrlHQ: string;
    bgRemovedFileName: string;
    bgRemovedImageUrlLQ: string;
    bgRemovedImageUrlHQ: string;
    status: ImageStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface IImageService {
    processImage(clerkId: string, file: Express.Multer.File): Promise<IGlobalRes<IImage | null>>;
    // getImageById(id: string): Promise<IGlobalRes<IImage | null>>;
    // updateImage(id: string, image: IImage): Promise<IGlobalRes<IImage | null>>;
    // deleteImage(id: string): Promise<IGlobalRes<boolean>>;
    // getAllImages(): Promise<IGlobalRes<IImage[]>>;
}