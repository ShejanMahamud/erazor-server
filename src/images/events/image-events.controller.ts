import {
    Controller,
    Logger,
    MessageEvent,
    Param,
    Req,
    Res,
    Sse
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { ImageEventsService } from './image-events.service';

@Controller('images')
export class ImageEventsController {
    private readonly logger = new Logger(ImageEventsController.name);

    constructor(private readonly imageEventsService: ImageEventsService) { }

    @Sse('events/:userId')
    events(
        @Req() req: Request,
        @Res() res: Response,
        @Param('userId') userId: string
    ): Observable<MessageEvent> {
        this.logger.log(`SSE: New connection request for user ${userId} from ${req.ip}`);

        // Set proper SSE headers
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

        return this.imageEventsService.subscribeToUser(userId);
    }
}
