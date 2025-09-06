import { Inject, Injectable } from '@nestjs/common';
import { Polar } from '@polar-sh/sdk';
import { IGlobalRes } from 'src/types';
import { IBillingService } from './interfaces/billing.interface';

@Injectable()
export class BillingService implements IBillingService {

  constructor(@Inject('POLAR_CLIENT') private readonly polarClient: Polar) { }

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
    console.log(session);
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

}
