import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) { }

  @Get('plans')
  findAllPlans() {
    return this.billingService.findAllPlans()
  }

  @Post('checkout/create')
  createCheckoutSession(@Body() body: { productId: string, userId: string }) {
    return this.billingService.createCheckoutSession(body.productId, body.userId)
  }

  @Get('subscription/:userId')
  userCurrentSubscription(@Param('userId') userId: string) {
    return this.billingService.userCurrentSubscription(userId)
  }
}