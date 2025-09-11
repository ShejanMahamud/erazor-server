import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Polar } from '@polar-sh/sdk';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';
import type { Request } from 'express';
import { NotificationGateway } from 'src/notification/notification.gateway';
import { IGlobalRes } from 'src/types';
import { IBillingService } from './interfaces/billing.interface';


@Injectable()
export class BillingService implements IBillingService {
  private readonly logger = new Logger(BillingService.name)
  constructor(@Inject('POLAR_CLIENT') private readonly polarClient: Polar, private readonly notificationGateway: NotificationGateway, private readonly config: ConfigService) { }

  async findAllPlans(): Promise<IGlobalRes<any>> {
    const plans = await this.polarClient.products.list({ limit: 100 })
    return {
      success: true,
      message: "All plans fetched successfully!",
      data: plans.result.items
    }
  }
  async createCheckoutSession(productId: string, userId: string): Promise<IGlobalRes<any>> {
    const session = await this.polarClient.checkouts.create({
      products: [productId],
      externalCustomerId: userId,
      successUrl: `${process.env.CLIENT_URL}/dashboard/overview`,
    })
    return {
      success: true,
      message: "Checkout session created successfully!",
      data: session
    }
  }

  async userCurrentSubscription(userId: string): Promise<IGlobalRes<any>> {

    const customerState = await this.polarClient.customers.getStateExternal({
      externalId: userId
    })
    return {
      success: true,
      message: "User current subscription fetched successfully!",
      data: customerState.activeSubscriptions[0] || null
    }
  }

  async findAllSubscriptions(): Promise<IGlobalRes<any>> {
    const subscriptions = await this.polarClient.subscriptions.list({ limit: 100 })
    return {
      success: true,
      message: "All subscriptions fetched successfully!",
      data: subscriptions.result.items
    }
  }

  async findAllCustomers(): Promise<IGlobalRes<any>> {
    const customers = await this.polarClient.customers.list({ limit: 100 })
    return {
      success: true,
      message: "All customers fetched successfully!",
      data: customers.result.items
    }
  }

  async getPlanById(planId: string): Promise<IGlobalRes<any>> {
    try {
      const plan = await this.polarClient.products.get({ id: planId });
      return {
        success: true,
        message: "Plan fetched successfully!",
        data: plan
      };
    } catch (error) {
      return {
        success: false,
        message: "Plan not found or error occurred",
        data: null
      };
    }
  }

  async getCustomerById(customerId: string): Promise<IGlobalRes<any>> {
    try {
      const customer = await this.polarClient.customers.get({ id: customerId });
      return {
        success: true,
        message: "Customer fetched successfully!",
        data: customer
      };
    } catch (error) {
      return {
        success: false,
        message: "Customer not found",
        data: null
      };
    }
  }

  async getCustomerByExternalId(externalId: string): Promise<IGlobalRes<any>> {
    try {
      const customer = await this.polarClient.customers.getStateExternal({
        externalId: externalId
      });
      return {
        success: true,
        message: "Customer fetched successfully!",
        data: customer
      };
    } catch (error) {
      return {
        success: false,
        message: "Customer not found",
        data: null
      };
    }
  }

  async getSubscriptionById(subscriptionId: string): Promise<IGlobalRes<any>> {
    try {
      const subscription = await this.polarClient.subscriptions.get({ id: subscriptionId });
      return {
        success: true,
        message: "Subscription fetched successfully!",
        data: subscription
      };
    } catch (error) {
      return {
        success: false,
        message: "Subscription not found",
        data: null
      };
    }
  }

  async getUserUsage(userId: string): Promise<IGlobalRes<any>> {
    try {
      // Get customer state which includes usage information
      const customerState = await this.polarClient.customers.getStateExternal({
        externalId: userId
      });

      // Extract usage data from customer state
      const usage = {
        subscriptions: customerState.activeSubscriptions || [],
        externalId: userId,
        activeMeter: customerState.activeMeters
      };

      return {
        success: true,
        message: "User usage fetched successfully!",
        data: usage
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch user usage');
    }
  }

  async getInvoices(customerId?: string): Promise<IGlobalRes<any>> {
    try {
      const orders = await this.polarClient.orders.list({
        limit: 100,
        ...(customerId && { customerId })
      });
      return {
        success: true,
        message: "Invoices fetched successfully!",
        data: orders.result.items
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch invoices",
        data: null
      };
    }
  }

  async getInvoiceById(invoiceId: string): Promise<IGlobalRes<any>> {
    try {
      const order = await this.polarClient.orders.get({ id: invoiceId });
      return {
        success: true,
        message: "Invoice fetched successfully!",
        data: order
      };
    } catch (error) {
      return {
        success: false,
        message: "Invoice not found",
        data: null
      };
    }
  }

  async handleWebhookEvent(eventType: string, eventData: any, req: Request): Promise<IGlobalRes<any>> {
    try {
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (value !== undefined) {
          headers[key] = Array.isArray(value) ? value[0] : value;
        }
      }

      const event = validateEvent(
        req.body,
        headers,
        this.config.get<string>('POLAR_WEBHOOK_SECRET') as string,
      )
      if (!event) {
        this.logger.error('Webhook signature verification failed.');
        throw new BadRequestException('Invalid webhook signature');
      }
      switch (eventType) {
        case 'subscription.created':
          await this.notificationGateway.sendNotification({
            userId: eventData.customer.externalId,
            type: 'INFO',
            message: `Your subscription has been created successfully!`,
          })
          break;
        case 'subscription.updated':
          await this.notificationGateway.sendNotification({
            userId: eventData.customer.externalId,
            type: 'INFO',
            message: `Your subscription has been updated successfully!`,
          })
          break;
        case 'subscription.active':
          await this.notificationGateway.sendNotification({
            userId: eventData.customer.externalId,
            type: 'INFO',
            message: `Your subscription has been activated.`,
          })
          break;
        case 'subscription.canceled':
          await this.notificationGateway.sendNotification({
            userId: eventData.customer.externalId,
            type: 'INFO',
            message: `Your subscription has been canceled.`,
          })
          break;
        case 'benefit_grant.cycled':
          await this.notificationGateway.sendNotification({
            userId: eventData.customer.externalId,
            type: 'INFO',
            message: `Your subscription has been renewed.`,
          })
          break;
        case 'benefit_grant.revoked':
          await this.notificationGateway.sendNotification({
            userId: eventData.customer.externalId,
            type: 'INFO',
            message: `Your subscription has been revoked.`,
          })
          break;
        case 'order.paid':
          await this.notificationGateway.sendNotification({
            userId: eventData.customer.externalId,
            type: 'INFO',
            message: `Your order has been paid successfully!`,
          })
          break;
        default:
          this.logger.error(`Unhandled webhook event type: ${eventType}`)
      }

      return {
        success: true,
        message: "Webhook event processed successfully!",
        data: { eventType, processed: true }
      };
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        this.logger.error('Webhook signature verification failed.', error);
        throw new BadRequestException('Invalid webhook signature');
      }
      return {
        success: false,
        message: "Failed to process webhook event",
        data: null
      };
    }
  }

  async getRevenueAnalytics(startDate?: Date, endDate?: Date): Promise<IGlobalRes<any>> {
    try {
      const orders = await this.polarClient.orders.list({
        limit: 1000,
        // Add date filters if supported by Polar SDK
      });

      const revenue = orders.result.items.reduce((total, order) => {
        const orderDate = new Date(order.createdAt);
        if (startDate && orderDate < startDate) return total;
        if (endDate && orderDate > endDate) return total;
        return total + (order.totalAmount || 0);
      }, 0);

      const analytics = {
        totalRevenue: revenue / 100, // Convert from cents
        orderCount: orders.result.items.length,
        averageOrderValue: orders.result.items.length > 0 ? (revenue / orders.result.items.length) / 100 : 0,
        period: {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString()
        }
      };

      return {
        success: true,
        message: "Revenue analytics fetched successfully!",
        data: analytics
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch revenue analytics",
        data: null
      };
    }
  }

  async getSubscriptionAnalytics(): Promise<IGlobalRes<any>> {
    try {
      const subscriptions = await this.polarClient.subscriptions.list({ limit: 1000 });
      const customers = await this.polarClient.customers.list({ limit: 1000 });

      const analytics = {
        totalSubscriptions: subscriptions.result.items.length,
        activeSubscriptions: subscriptions.result.items.filter(sub => sub.status === 'active').length,
        totalCustomers: customers.result.items.length,
        subscriptionsByStatus: subscriptions.result.items.reduce((acc, sub) => {
          acc[sub.status] = (acc[sub.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      return {
        success: true,
        message: "Subscription analytics fetched successfully!",
        data: analytics
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch subscription analytics",
        data: null
      };
    }
  }

}
