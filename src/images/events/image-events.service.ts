import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Observable, Subject, interval } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ImageEventsService {
    private readonly logger = new Logger(ImageEventsService.name);

    // Each user gets their own stream and connection count
    private userStreams = new Map<string, Subject<MessageEvent>>();
    private userConnections = new Map<string, number>();

    // Called by processor when an image is updated
    sendImageUpdate(userId: string, imageData: any) {
        const stream = this.userStreams.get(userId);
        if (stream) {
            this.logger.log(`SSE: Sending image update to user ${userId}`);
            this.logger.debug(`SSE: Image data keys: ${Object.keys(imageData || {}).join(', ')}`);
            try {
                stream.next({
                    data: JSON.stringify(imageData)
                });
                this.logger.log(`SSE: Successfully sent update to user ${userId}`);
            } catch (error) {
                this.logger.error(`SSE: Error sending update to user ${userId}:`, error);
            }
        } else {
            this.logger.warn(`SSE: No active stream found for user ${userId}`);
            this.logger.debug(`SSE: Available streams: ${Array.from(this.userStreams.keys()).join(', ')}`);
        }
    }

    // Called when client subscribes
    subscribeToUser(userId: string): Observable<MessageEvent> {
        // Create or get existing stream
        if (!this.userStreams.has(userId)) {
            this.userStreams.set(userId, new Subject<MessageEvent>());
            this.userConnections.set(userId, 0);
        }

        // Increment connection count
        const currentConnections = this.userConnections.get(userId) || 0;
        this.userConnections.set(userId, currentConnections + 1);

        const stream = this.userStreams.get(userId)!;
        this.logger.log(`SSE: User ${userId} subscribed (${currentConnections + 1} active connections)`);

        return new Observable<MessageEvent>((observer) => {
            // Send initial connection message
            observer.next({
                data: JSON.stringify("Connected to image updates")
            });

            // Set up keep-alive heartbeat every 30 seconds
            const heartbeat$ = interval(30000).pipe(
                map(() => ({
                    data: JSON.stringify("SSE is still alive")
                }))
            );

            // Subscribe to both the user stream and heartbeat
            const streamSubscription = stream.subscribe({
                next: (data) => observer.next(data),
                error: (error) => {
                    this.logger.error(`SSE: Stream error for user ${userId}:`, error);
                    observer.error(error);
                },
                complete: () => observer.complete()
            });

            const heartbeatSubscription = heartbeat$.subscribe({
                next: (heartbeat) => observer.next(heartbeat),
                error: (error) => this.logger.error(`SSE: Heartbeat error for user ${userId}:`, error)
            });

            // Cleanup on disconnect
            return () => {
                this.logger.log(`SSE: User ${userId} disconnecting`);

                streamSubscription.unsubscribe();
                heartbeatSubscription.unsubscribe();

                // Decrement connection count
                const connections = this.userConnections.get(userId) || 1;
                const newCount = connections - 1;

                if (newCount <= 0) {
                    // No more connections, clean up completely
                    this.logger.log(`SSE: No more connections for user ${userId}, cleaning up stream`);
                    this.userStreams.delete(userId);
                    this.userConnections.delete(userId);
                } else {
                    // Still have other connections, just update count
                    this.userConnections.set(userId, newCount);
                    this.logger.log(`SSE: User ${userId} disconnected (${newCount} remaining connections)`);
                }
            };
        });
    }
}
