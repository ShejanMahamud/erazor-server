import { Logger } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { NotificationService } from "./notification.service";

@WebSocketGateway({ namespace: 'notifications', cors: true })
export class NotificationGateway implements OnGatewayInit {
    private readonly logger = new Logger('NotificationGateway');
    constructor(private readonly notificationService: NotificationService) { }

    @WebSocketServer() server: Server;

    afterInit(server: Server) {
        this.logger.log('Notification WebSocket server initialized');
    }

    @SubscribeMessage('join')
    handleJoin(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
        client.join(userId);
    }

    async sendNotification(notificationData: CreateNotificationDto) {
        await this.notificationService.createNotification(notificationData);
        this.server.to(notificationData.userId).emit(`new-notification`, notificationData);
    }

    async markAsRead(notificationId: string, userId: string) {
        const notification = await this.notificationService.markAsRead(notificationId);
        if (notification.success) {
            this.server.to(userId).emit(`notification-read`, notification.data);
        }
    }

}