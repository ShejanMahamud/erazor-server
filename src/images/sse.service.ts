import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class SseService {
    private readonly logger = new Logger(SseService.name);
    private readonly userStreams: Record<string, Subject<MessageEvent>> = {};

    getOrCreateStream(userId: string): Subject<MessageEvent> {
        if (!this.userStreams[userId]) {
            this.userStreams[userId] = new Subject<MessageEvent>();
            this.logger.debug(`Created new SSE stream for user: ${userId}`);
        }
        return this.userStreams[userId];
    }

    pushUpdate(userId: string, data: any): void {
        try {
            if (!this.userStreams[userId]) {
                this.userStreams[userId] = new Subject<MessageEvent>();
            }

            this.userStreams[userId].next({
                data: JSON.stringify(data),
                type: 'image-update'
            } as MessageEvent);

            this.logger.debug(`Sent SSE update to user: ${userId}`);
        } catch (error) {
            this.logger.error(`Failed to send SSE update to user ${userId}:`, error);
        }
    }

    closeStream(userId: string): void {
        if (this.userStreams[userId]) {
            try {
                this.userStreams[userId].complete();
                delete this.userStreams[userId];
                this.logger.debug(`Closed SSE stream for user: ${userId}`);
            } catch (error) {
                this.logger.error(`Failed to close SSE stream for user ${userId}:`, error);
            }
        }
    }

    hasActiveStream(userId: string): boolean {
        return !!this.userStreams[userId] && !this.userStreams[userId].closed;
    }
}
