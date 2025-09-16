import { ImageStatus } from "generated/prisma";
import { IGlobalMeta, IGlobalRes } from "src/types";

export interface IImage {
    id: string;
    ownerId: string | null;
    processId: string;
    originalFileName: string;
    originalImageUrlLQ: string | null;
    originalImageUrlHQ: string | null;
    bgRemovedFileName: string | null;
    bgRemovedImageUrlLQ: string | null;
    bgRemovedImageUrlHQ: string | null;
    status: ImageStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface IImageService {
    processImage(userId: string, file: Express.Multer.File): Promise<IGlobalRes<IImage | { anonId?: string | null } | null>>;
    deleteImage(id: string): Promise<IGlobalRes<boolean>>;
    findAllImagesByUserId(userId: string, limit: number, cursor?: string, search?: string, status?: ImageStatus): Promise<IGlobalRes<IImage[], IGlobalMeta>>;
    findAllImages(limit: number, cursor?: string, search?: string, status?: ImageStatus): Promise<IGlobalRes<IImage[], IGlobalMeta>>;
    findImageById(id: string): Promise<IGlobalRes<IImage | null>>;
}