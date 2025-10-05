import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class ImageEventsService {
    private readonly logger = new Logger(ImageEventsService.name);

    // Each user gets their own stream
    private userStreams = new Map<string, Subject<MessageEvent>>();

    // Called by processor when an image is updated
    sendImageUpdate(userId: string, imageData: any) {
        const stream = this.userStreams.get(userId);
        if (stream) {
            this.logger.log(`SSE: Sending image update to user ${userId}`);
            stream.next({ data: imageData });
        }
    }

    // Called when client subscribes
    subscribeToUser(userId: string): Observable<MessageEvent> {
        if (!this.userStreams.has(userId)) {
            this.userStreams.set(userId, new Subject<MessageEvent>());
        }
        this.logger.log(`SSE: User ${userId} subscribed`);
        return this.userStreams.get(userId)!.asObservable();
    }
}