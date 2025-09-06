import { IGlobalRes } from "src/types";

export interface IBillingService {

    findAllPlans(): Promise<IGlobalRes<any>>
    createCheckoutSession(priceId: string, successUrl: string, cancelUrl: string, customerId?: string): Promise<IGlobalRes<any>>

}