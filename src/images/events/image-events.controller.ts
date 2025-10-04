import {
    Controller,
    MessageEvent,
    Req,
    Res,
    Sse,
    UseGuards
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { OptionalClerkGuard } from 'src/guards/optional-clerk.guard';
import { ImageEventsService } from './image-events.service';

@Controller('images')
export class ImageEventsController {
    constructor(private readonly imageEventsService: ImageEventsService) { }

    @UseGuards(OptionalClerkGuard)
    @Sse('events')
    events(@Req() req: Request, @Res({ passthrough: true }) res: Response): Observable<MessageEvent> {
        res.setHeader('Access-Control-Allow-Origin', 'https://www.erazor.app');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        return this.imageEventsService.subscribeToUser(req.user?.sub);
    }
}
