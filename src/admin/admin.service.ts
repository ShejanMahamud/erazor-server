import { Inject, Injectable } from '@nestjs/common';
import { Polar } from '@polar-sh/sdk';
import { PrismaService } from 'src/prisma/prisma.service';
import { IAdminService } from './interfaces/admin.interface';

@Injectable()
export class AdminService implements IAdminService {
  constructor(@Inject('POLAR_CLIENT') private readonly polarClient: Polar, private readonly prisma: PrismaService) { }

  async getDashboardStats(): Promise<any> {
    const customers = await this.polarClient.customers.list({ limit: 1000 })
    const totalUsers = await this.prisma.user.count();
    const totalImages = await this.prisma.image.count();
    const subscriptions = await this.polarClient.subscriptions.list({ limit: 1000 })
    const revenue = await this.polarClient.orders.list({
      limit: 1000,
    })

    return {
      totalUsers, totalImages,
      totalCustomers: customers.result.items.length,
      totalSubscriptions: subscriptions.result.items.length,
      totalRevenue: revenue.result.items.reduce((acc, order) => acc + (order.totalAmount || 0), 0) / 100,
      currentMonthRevenue: revenue.result.items.filter(order => {
        const orderDate = new Date(order.createdAt);
        const now = new Date();
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      }).reduce((acc, order) => acc + (order.totalAmount || 0), 0) / 100,
      lastMonthRevenue: revenue.result.items.filter(order => {
        const orderDate = new Date(order.createdAt);
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return orderDate.getMonth() === lastMonth.getMonth() && orderDate.getFullYear() === lastMonth.getFullYear();
      }).reduce((acc, order) => acc + (order.totalAmount || 0), 0) / 100,
    }
  }
}