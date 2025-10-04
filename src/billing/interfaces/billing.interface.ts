import type { Request } from 'express';
import { IGlobalRes } from "src/types";

export interface IBillingService {
    // Plans & Products
    findAllPlans(): Promise<IGlobalRes<any>>;
    getPlanById(planId: string): Promise<IGlobalRes<any>>;

    // Checkout & Subscriptions
    createCheckoutSession(productId: string, userId: string): Promise<IGlobalRes<any>>;
    userCurrentSubscription(userId: string): Promise<IGlobalRes<any>>;

    // Customer Management
    findAllCustomers(): Promise<IGlobalRes<any>>;
    getCustomerById(customerId: string): Promise<IGlobalRes<any>>;
    getCustomerByExternalId(externalId: string): Promise<IGlobalRes<any>>;

    // Subscriptions Admin
    findAllSubscriptions(): Promise<IGlobalRes<any>>;
    getSubscriptionById(subscriptionId: string): Promise<IGlobalRes<any>>;

    // Usage & Billing
    getUserUsage(userId: string): Promise<IGlobalRes<any>>;
    getInvoices(customerId?: string): Promise<IGlobalRes<any>>;
    getInvoiceById(invoiceId: string): Promise<IGlobalRes<any>>;

    // Webhooks & Events
    handleWebhookEvent(req: Request): Promise<IGlobalRes<any>>;

    // Analytics
    getRevenueAnalytics(startDate?: Date, endDate?: Date): Promise<IGlobalRes<any>>;
    getSubscriptionAnalytics(): Promise<IGlobalRes<any>>;
}