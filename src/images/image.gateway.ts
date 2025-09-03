import { ConnectedSocket, MessageBody, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class ImageGateway implements OnGatewayInit {
    @WebSocketServer() server: Server;

    afterInit(server: Server) {
        console.log('WebSocket server initialized');
    }

    @SubscribeMessage('join')
    handleJoin(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
        client.join(userId);
    }

    sendImageUpdate(clerkId: string, updateData: any) {
        this.server.to(clerkId).emit(`image-status-update`, updateData);
    }
}