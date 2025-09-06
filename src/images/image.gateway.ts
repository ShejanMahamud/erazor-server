import { ConnectedSocket, MessageBody, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: 'images', cors: true })
export class ImageGateway implements OnGatewayInit {
    @WebSocketServer() server: Server;

    afterInit(server: Server) {
        console.log('Images WebSocket server initialized');
    }

    @SubscribeMessage('join')
    handleJoin(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
        client.join(userId);
    }

    sendImageUpdate(userId: string, updateData: any) {
        this.server.to(userId).emit(`image-status-update`, updateData);
    }
}