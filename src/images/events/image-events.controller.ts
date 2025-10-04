import {
    Controller,
    MessageEvent,
    Param,
    Req,
    Sse
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { ImageEventsService } from './image-events.service';

@Controller('images')
export class ImageEventsController {
    constructor(private readonly imageEventsService: ImageEventsService) { }

    @Sse('events/:userId')
    events(@Req() req: Request, @Param('userId') userId: string): Observable<MessageEvent> {
        return this.imageEventsService.subscribeToUser(userId);
    }
}
