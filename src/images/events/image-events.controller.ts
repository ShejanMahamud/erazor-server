import {
    Controller,
    MessageEvent,
    Param,
    Sse,
    UseGuards
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ClerkGuard } from 'src/guards/clerk.guard';
import { ImageEventsService } from './image-events.service';

@Controller('images')
export class ImageEventsController {
    constructor(private readonly imageEventsService: ImageEventsService) { }

    @UseGuards(ClerkGuard)
    @Sse('events/:userId')
    events(@Param('userId') userId: string): Observable<MessageEvent> {
        return this.imageEventsService.subscribeToUser(userId);
    }
}
