import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @Get(':userId')
  getUserNotifications(@Param('userId') userId: string, @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number, @Query('cursor') cursor?: string, @Query('isRead') isRead?: boolean) {
    return this.notificationService.getUserNotifications(userId, limit, cursor, isRead);
  }

  @Post('mark-as-read/:id')
  markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Post('')
  sendNotification(@Body() data: CreateNotificationDto) {
    return this.notificationService.createNotification(data);
  }
}
