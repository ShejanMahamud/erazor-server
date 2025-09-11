
import { Controller, Get, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckService, HttpHealthIndicator, PrismaHealthIndicator } from '@nestjs/terminus';
import type { Request } from 'express';
import { PrismaService } from './prisma/prisma.service';
import { getSystemInfoJson } from './utils/system-info';

@Controller()
export class AppController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
    private http: HttpHealthIndicator,
    private prisma: PrismaService,
    private readonly config: ConfigService
  ) {


  }

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
  async getHealth(@Req() req: Request) {
    const system = getSystemInfoJson();
    const health = await this.health.check([
      () => this.db.pingCheck('database', this.prisma),
      () => this.http.pingCheck('api', `${req.protocol}://${req.get('host')}/v1/api`),
    ]);
    return {
      success: true,
      message: 'Health check passed',
      data: {
        health,
        system
      },
    };
  }

}
