import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Permissions, Roles } from 'generated/prisma';
import { PermissionsRequired } from 'src/decorators/permissions.decorator';
import { RolesRequired } from 'src/decorators/roles.decorator';
import { ClerkGuard } from 'src/guards/clerk.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { BillingService } from './billing.service';


@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) { }

  // Plans & Products
  @Get('plans')
  findAllPlans() {
    return this.billingService.findAllPlans();
  }

  @Get('plans/:id')
  getPlanById(@Param('id') id: string) {
    return this.billingService.getPlanById(id);
  }

  // Checkout & Subscriptions
  @UseGuards(ClerkGuard)
  @Post('checkout/create')
  createCheckoutSession(@Body() body: { productId: string, userId: string }) {
    return this.billingService.createCheckoutSession(body.productId, body.userId);
  }

  @UseGuards(ClerkGuard)
  @Get('subscription/:userId')
  userCurrentSubscription(@Param('userId') userId: string) {
    return this.billingService.userCurrentSubscription(userId);
  }

  @UseGuards(ClerkGuard)
  @Get('usage/:userId')
  getUserUsage(@Param('userId') userId: string) {
    return this.billingService.getUserUsage(userId);
  }

  @UseGuards(ClerkGuard)
  @Get('invoices')
  getInvoices(@Query('userId') userId?: string) {
    return this.billingService.getInvoices(userId);
  }

  @UseGuards(ClerkGuard)
  @Get('invoices/:id')
  getInvoiceById(@Param('id') id: string) {
    return this.billingService.getInvoiceById(id);
  }

  // Admin only endpoints
  @RolesRequired(Roles.ADMIN)
  @PermissionsRequired(Permissions.MANAGE_SUBSCRIPTIONS)
  @UseGuards(ClerkGuard, RolesGuard, PermissionsGuard)
  @Get('admin/customers')
  findAllCustomers() {
    return this.billingService.findAllCustomers();
  }

  @RolesRequired(Roles.ADMIN)
  @PermissionsRequired(Permissions.MANAGE_SUBSCRIPTIONS)
  @UseGuards(ClerkGuard, RolesGuard, PermissionsGuard)
  @Get('admin/customers/:userId')
  getCustomerById(@Param('userId') userId: string) {
    return this.billingService.getCustomerById(userId);
  }

  @RolesRequired(Roles.ADMIN)
  @PermissionsRequired(Permissions.MANAGE_SUBSCRIPTIONS)
  @UseGuards(ClerkGuard, RolesGuard, PermissionsGuard)
  @Get('admin/customers/external/:userId')
  getCustomerByExternalId(@Param('userId') userId: string) {
    return this.billingService.getCustomerByExternalId(userId);
  }

  @RolesRequired(Roles.ADMIN)
  @PermissionsRequired(Permissions.MANAGE_SUBSCRIPTIONS)
  @UseGuards(ClerkGuard, RolesGuard, PermissionsGuard)
  @Get('admin/subscriptions')
  findAllSubscriptions() {
    return this.billingService.findAllSubscriptions();
  }

  @RolesRequired(Roles.ADMIN)
  @PermissionsRequired(Permissions.MANAGE_SUBSCRIPTIONS)
  @UseGuards(ClerkGuard, RolesGuard, PermissionsGuard)
  @Get('admin/subscriptions/:id')
  getSubscriptionById(@Param('id') id: string) {
    return this.billingService.getSubscriptionById(id);
  }

  // Analytics - Admin only
  @RolesRequired(Roles.ADMIN)
  @PermissionsRequired(Permissions.VIEW_ANALYTICS)
  @UseGuards(ClerkGuard, RolesGuard, PermissionsGuard)
  @Get('admin/analytics/revenue')
  getRevenueAnalytics(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.billingService.getRevenueAnalytics(start, end);
  }

  @RolesRequired(Roles.ADMIN)
  @PermissionsRequired(Permissions.VIEW_ANALYTICS)
  @UseGuards(ClerkGuard, RolesGuard, PermissionsGuard)
  @Get('admin/analytics/subscriptions')
  getSubscriptionAnalytics() {
    return this.billingService.getSubscriptionAnalytics();
  }

  // Webhook endpoint (no auth needed for webhooks)
  @Post('webhook')
  handleWebhook(@Body() webhookData: any, req: Request) {
    const eventType = webhookData.type || webhookData.event_type;
    return this.billingService.handleWebhookEvent(req);
  }
}