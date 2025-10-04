import {
    Controller,
    MessageEvent,
    Req,
    Sse,
    UseGuards
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { OptionalClerkGuard } from 'src/guards/optional-clerk.guard';
import { ImageEventsService } from './image-events.service';

@Controller('images')
export class ImageEventsController {
    constructor(private readonly imageEventsService: ImageEventsService) { }

    @UseGuards(OptionalClerkGuard)
    @Sse('events')
    events(@Req() req: Request): Observable<MessageEvent> {
        return this.imageEventsService.subscribeToUser(req.user?.sub);
    }
}
