import { NotificationTypes } from "generated/prisma";
import { IGlobalMeta, IGlobalRes } from "src/types";
import { CreateNotificationDto } from "../dto/create-notification.dto";

export interface INotification {
    id: string;
    userId: string;
    type: NotificationTypes;
    message: string;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface INotificationService {
    createNotification(data: CreateNotificationDto): Promise<IGlobalRes<INotification | null>>;
    markAsRead(notificationId: string): Promise<IGlobalRes<INotification | null>>;
    getUserNotifications(userId: string, limit: number, cursor?: string, isRead?: boolean): Promise<IGlobalRes<INotification[], IGlobalMeta>>;
}