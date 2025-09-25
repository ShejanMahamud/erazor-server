import { Logger } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: 'image-update', cors: true })
export class ImageGateway implements OnGatewayInit {
    private readonly logger = new Logger('ImageGateway');
    @WebSocketServer() server: Server;

    afterInit(server: Server) {
        this.logger.log('ImageGateway initialized');
    }

    @SubscribeMessage('join')
    handleJoin(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
        this.logger.log(`User ${userId} joined their room`);
        client.join(userId);
    }

    sendImageUpdate(userId: string, updateData: any) {
        this.server.to(userId).emit(`image-status-update`, updateData);
    }
}