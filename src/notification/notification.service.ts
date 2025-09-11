import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IGlobalMeta, IGlobalRes } from 'src/types';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { INotification, INotificationService } from './interfaces/notification.interface';

@Injectable()
export class NotificationService implements INotificationService {
  constructor(private readonly prisma: PrismaService) { }

  async createNotification(data: CreateNotificationDto): Promise<IGlobalRes<INotification | null>> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        message: data.message,
      },
    });
    console.log('Saved Notification:', notification);
    return {
      success: true,
      message: "Notification saved successfully",
      data: notification,
    };
  }

  async markAsRead(notificationId: string): Promise<IGlobalRes<INotification | null>> {
    const notification = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return {
      success: true,
      message: "Notification marked as read",
      data: notification,
    };
  }

  async getUserNotifications(userId: string, limit: number, cursor?: string, isRead?: boolean): Promise<IGlobalRes<INotification[], IGlobalMeta>> {
    const notifications = await this.prisma.notification.findMany({
      take: limit,
      cursor: cursor ? { id: cursor } : undefined,
      where: {
        userId,
        ...(isRead !== undefined && { isRead }),
      },
      orderBy: { createdAt: 'desc' },
    });

    const nextCursor = notifications.length === limit ? notifications[limit - 1].id : null;

    return {
      success: true,
      message: "User notifications fetched successfully",
      data: notifications,
      meta: { nextCursor, limit, count: notifications.length, hasNextPage: !!nextCursor },
    };
  }
}
