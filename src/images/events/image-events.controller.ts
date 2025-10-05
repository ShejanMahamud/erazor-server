import {
    Controller,
    MessageEvent,
    Param,
    Sse
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ImageEventsService } from './image-events.service';

@Controller('images')
export class ImageEventsController {
    constructor(private readonly imageEventsService: ImageEventsService) { }

    @Sse('events/:userId')
    events(@Param('userId') userId: string): Observable<MessageEvent> {
        return this.imageEventsService.subscribeToUser(userId);
    }
}