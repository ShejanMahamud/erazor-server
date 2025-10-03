import { Logger } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    namespace: 'images',
    cors: {
        origin: process.env.LOCAL_CORS!,
        credentials: true
    }
})
export class ImageGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger('ImageGateway');
    @WebSocketServer() server: Server;

    afterInit(server: Server) {
        this.logger.log('ImageGateway initialized');
    }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('join')
    handleJoin(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
        try {
            if (!userId) {
                this.logger.error('Received join request with null/undefined userId');
                client.emit('error', { message: 'Invalid user ID' });
                return { status: 'error', message: 'Invalid user ID' };
            }

            this.logger.log(`User ${userId} attempting to join room with socket ${client.id}`);

            // Leave any existing rooms (except the default socket.id room)
            const currentRooms = Array.from(client.rooms).filter(room => room !== client.id);
            currentRooms.forEach(room => {
                client.leave(room);
                this.logger.log(`Socket ${client.id} left previous room: ${room}`);
            });

            // Join the new room
            client.join(userId);

            const roomSize = this.server.sockets.adapter.rooms.get(userId)?.size || 0;
            this.logger.log(`User ${userId} successfully joined their room. Socket: ${client.id}, Room size: ${roomSize}`);

            // Send confirmation back to client
            client.emit('joined', { userId, socketId: client.id, roomSize });

            return { status: 'success', message: 'Joined room successfully' };

        } catch (error) {
            this.logger.error(`Error in handleJoin for user ${userId}:`, error);
            client.emit('error', { message: 'Failed to join room', error: error.message });
            return { status: 'error', message: error.message };
        }
    }

    sendImageUpdate(userId: string, updateData: any) {
        try {
            if (!userId) {
                this.logger.warn('Cannot send update: userId is null or undefined');
                return;
            }

            const room = this.server.sockets.adapter.rooms.get(userId);
            if (!room || room.size === 0) {
                this.logger.warn(`No active connections found for user ${userId}. Room size: ${room?.size || 0}`);

                // Log available rooms for debugging
                const allRooms = Array.from(this.server.sockets.adapter.rooms.keys())
                    .filter(room => !room.startsWith('/')); // Filter out socket.id rooms
                this.logger.debug(`Available user rooms: ${allRooms.join(', ')}`);
                return;
            }

            this.logger.log(`Sending image update to ${room.size} connection(s) for user ${userId}`);
            this.server.to(userId).emit('image-status-update', updateData);

            this.logger.log(`Image update sent successfully to user ${userId}`);

        } catch (error) {
            this.logger.error(`Error sending image update to user ${userId}:`, error);
        }
    }
}