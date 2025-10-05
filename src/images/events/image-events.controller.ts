import {
    Controller,
    MessageEvent,
    Param,
    Sse
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Public } from 'src/decorators/public.decorator';
import { ImageEventsService } from './image-events.service';

@Controller('images')
export class ImageEventsController {
    constructor(private readonly imageEventsService: ImageEventsService) { }

    @Public()
    @Sse('events/:userId')
    events(@Param('userId') userId: string): Observable<MessageEvent> {
        return this.imageEventsService.subscribeToUser(userId);
    }
}