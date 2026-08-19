import { Controller, Get, Header } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { collectDefaultMetrics, register } from 'prom-client';

collectDefaultMetrics();

@SkipThrottle()
@Controller()
export class MetricsController {
  @Get('metrics')
  @Header('Content-Type', register.contentType)
  async getMetrics() {
    return register.metrics();
  }
}
