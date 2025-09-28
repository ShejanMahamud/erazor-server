
import { Controller, Get, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { HealthCheckService, HttpHealthIndicator, PrismaHealthIndicator } from '@nestjs/terminus';
import type { FastifyRequest } from 'fastify';
import { PrismaService } from './prisma/prisma.service';
import { getSystemInfoJson } from './utils/system-info';

@Controller()
@ApiExcludeController()
export class AppController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
    private http: HttpHealthIndicator,
    private prisma: PrismaService,
  ) { }

  @Get()
  getHello(@Req() req: FastifyRequest) {
    const protocol = req.protocol;
    const host = req.headers.host;
    return {
      success: true,
      message: 'Server is running',
      data: {
        api_docs: protocol + '://' + host + '/v1/api/docs',
        health: protocol + '://' + host + '/v1/api/health',
      },
    };
  }

  @Get('health')
  async getHealth(@Req() req: FastifyRequest) {
    const system = getSystemInfoJson();
    const health = await this.health.check([
      () => this.db.pingCheck('database', this.prisma),
      () => this.http.pingCheck('api', `${req.protocol}://${req.headers.host}/v1/api`),
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
