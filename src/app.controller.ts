
import type { ClerkClient } from '@clerk/backend';
import { Controller, Get, Inject, Req } from '@nestjs/common';
import type { Request } from 'express';
import { getSystemInfoJson } from './utils/system-info';

@Controller()
export class AppController {
  constructor(@Inject('CLERK_CLIENT') private readonly clerkClient: ClerkClient) { }

  @Get()
  getHello(@Req() req: Request) {
    return {
      success: true,
      message: 'Server is running',
      data: {
        api_docs: req.protocol + '://' + req.get('host') + '/v1/api/docs',
        health: req.protocol + '://' + req.get('host') + '/v1/api/health',
      },
    };
  }

  @Get('health')
  getHealth() {
    return {
      success: true,
      message: 'Health check passed',
      data: getSystemInfoJson(),
    };
  }


}
