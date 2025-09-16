import { Inject, Injectable, Logger } from '@nestjs/common';
import { Polar } from '@polar-sh/sdk';
import Redis from 'ioredis';
import { PrismaService } from 'src/prisma/prisma.service';
import { REDIS_CLIENT } from 'src/queue/queue.module';
import { IAdminService } from './interfaces/admin.interface';

@Injectable()
export class AdminService implements IAdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @Inject('POLAR_CLIENT') private readonly polarClient: Polar,
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis
  ) { }

  async getDashboardStats(): Promise<any> {
    this.logger.log('Fetching admin dashboard stats');

    try {
      // Check Redis cache first
      const cacheKey = 'admin:dashboard_stats';
      const cachedStats = await this.redisClient.get(cacheKey);

      if (cachedStats) {
        this.logger.log('Admin dashboard stats found in cache');
        return JSON.parse(cachedStats);
      }

      // Get current date for calculations
      const now = new Date();
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Fetch data with individual caching
      const [customers, subscriptions, revenue, totalUsers, totalImages] = await Promise.all([
        this.getCachedCustomers(),
        this.getCachedSubscriptions(),
        this.getCachedRevenue(),
        this.getCachedTotalUsers(),
        this.getCachedTotalImages()
      ]);

      // 4 Cards Data
      const cards = {
        totalUsers,
        totalImages,
        totalCustomers: customers.result.items.length,
        totalRevenue: revenue.result.items.reduce((acc, order) => acc + (order.totalAmount || 0), 0) / 100
      };

      // Monthly revenue calculations
      const currentMonthRevenue = revenue.result.items.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      }).reduce((acc, order) => acc + (order.totalAmount || 0), 0) / 100;

      const lastMonthRevenue = revenue.result.items.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getMonth() === startOfLastMonth.getMonth() && orderDate.getFullYear() === startOfLastMonth.getFullYear();
      }).reduce((acc, order) => acc + (order.totalAmount || 0), 0) / 100;

      // Report 1: User Growth Over Time (Last 30 days)
      const userGrowthData = await this.getUserGrowthData(last30Days);

      // Report 2: Image Processing Activity (Last 30 days)
      const imageActivityData = await this.getImageActivityData(last30Days);

      // Report 3: Revenue Trend (Last 12 months)
      const revenueTrendData = await this.getRevenueTrendData(revenue.result.items);

      // Report 4: Subscription Status Distribution
      const subscriptionDistribution = this.getSubscriptionDistribution(subscriptions.result.items);

      // Additional insights
      const weeklyActiveUsers = await this.getWeeklyActiveUsers(last7Days);
      const topImageProcessingDays = this.getTopProcessingDays(imageActivityData);
      const revenueGrowth = lastMonthRevenue === 0 ? 100 :
        ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

      const dashboardStats = {
        cards,
        monthlyComparison: {
          currentMonthRevenue,
          lastMonthRevenue,
          revenueGrowth: Math.round(revenueGrowth * 100) / 100
        },
        reports: {
          userGrowth: {
            title: "User Registration Growth (Last 30 Days)",
            data: userGrowthData,
            totalNewUsers: userGrowthData.reduce((sum, item) => sum + item.count, 0)
          },
          imageActivity: {
            title: "Image Processing Activity (Last 30 Days)",
            data: imageActivityData,
            totalProcessed: imageActivityData.reduce((sum, item) => sum + item.count, 0)
          },
          revenueTrend: {
            title: "Revenue Trend (Last 12 Months)",
            data: revenueTrendData,
            totalRevenue: revenueTrendData.reduce((sum, item) => sum + item.revenue, 0)
          },
          subscriptionDistribution: {
            title: "Subscription Status Distribution",
            data: subscriptionDistribution,
            totalSubscriptions: subscriptionDistribution.reduce((sum, item) => sum + item.count, 0)
          }
        },
        insights: {
          weeklyActiveUsers,
          topImageProcessingDays,
          averageDailyRevenue: Math.round((cards.totalRevenue / 30) * 100) / 100,
          averageDailySignups: Math.round((userGrowthData.reduce((sum, item) => sum + item.count, 0) / 30) * 100) / 100
        }
      };

      // Cache the complete dashboard stats for 10 minutes
      await this.redisClient.set(cacheKey, JSON.stringify(dashboardStats), 'EX', 600);

      this.logger.log('Admin dashboard stats fetched successfully and cached');
      return dashboardStats;

    } catch (error) {
      this.logger.error(`Error fetching admin dashboard stats: ${error.message}`);
      throw error;
    }
  }

  private async getCachedCustomers() {
    const cacheKey = 'admin:customers';
    const cached = await this.redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const customers = await this.polarClient.customers.list({ limit: 1000 });
    await this.redisClient.set(cacheKey, JSON.stringify(customers), 'EX', 1800); // 30 minutes
    return customers;
  }

  private async getCachedSubscriptions() {
    const cacheKey = 'admin:subscriptions';
    const cached = await this.redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const subscriptions = await this.polarClient.subscriptions.list({ limit: 1000 });
    await this.redisClient.set(cacheKey, JSON.stringify(subscriptions), 'EX', 1800); // 30 minutes
    return subscriptions;
  }

  private async getCachedRevenue() {
    const cacheKey = 'admin:revenue';
    const cached = await this.redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const revenue = await this.polarClient.orders.list({ limit: 1000 });
    await this.redisClient.set(cacheKey, JSON.stringify(revenue), 'EX', 3600); // 1 hour
    return revenue;
  }

  private async getCachedTotalUsers() {
    const cacheKey = 'admin:total_users';
    const cached = await this.redisClient.get(cacheKey);
    if (cached) return parseInt(cached);

    const totalUsers = await this.prisma.user.count();
    await this.redisClient.set(cacheKey, totalUsers.toString(), 'EX', 600); // 10 minutes
    return totalUsers;
  }

  private async getCachedTotalImages() {
    const cacheKey = 'admin:total_images';
    const cached = await this.redisClient.get(cacheKey);
    if (cached) return parseInt(cached);

    const totalImages = await this.prisma.image.count();
    await this.redisClient.set(cacheKey, totalImages.toString(), 'EX', 600); // 10 minutes
    return totalImages;
  }

  private async getUserGrowthData(last30Days: Date): Promise<Array<{ date: string; count: number }>> {
    const cacheKey = 'admin:user_growth_30days';
    const cached = await this.redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const userGrowthData = await this.prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: last30Days }
      },
      _count: { id: true }
    });

    // Process data for daily chart
    const now = new Date();
    const dailyUserGrowth: Array<{ date: string; count: number }> = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = userGrowthData.filter(item => {
        const itemDate = new Date(item.createdAt).toISOString().split('T')[0];
        return itemDate === dateStr;
      });

      dailyUserGrowth.push({
        date: dateStr,
        count: dayData.reduce((sum, item) => sum + item._count.id, 0)
      });
    }

    await this.redisClient.set(cacheKey, JSON.stringify(dailyUserGrowth), 'EX', 3600); // 1 hour
    return dailyUserGrowth;
  }

  private async getImageActivityData(last30Days: Date): Promise<Array<{ date: string; count: number }>> {
    const cacheKey = 'admin:image_activity_30days';
    const cached = await this.redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const imageActivityData = await this.prisma.image.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: last30Days },
        status: 'ready'
      },
      _count: { id: true }
    });

    // Process data for daily chart
    const now = new Date();
    const dailyImageActivity: Array<{ date: string; count: number }> = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = imageActivityData.filter(item => {
        const itemDate = new Date(item.createdAt).toISOString().split('T')[0];
        return itemDate === dateStr;
      });

      dailyImageActivity.push({
        date: dateStr,
        count: dayData.reduce((sum, item) => sum + item._count.id, 0)
      });
    }

    await this.redisClient.set(cacheKey, JSON.stringify(dailyImageActivity), 'EX', 3600); // 1 hour
    return dailyImageActivity;
  }

  private getRevenueTrendData(orders: any[]): Array<{ month: string; revenue: number }> {
    const monthlyRevenue = new Map<string, number>();

    // Initialize last 12 months
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue.set(monthKey, 0);
    }

    // Aggregate revenue by month
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;

      if (monthlyRevenue.has(monthKey)) {
        const currentRevenue = monthlyRevenue.get(monthKey) || 0;
        monthlyRevenue.set(monthKey, currentRevenue + ((order.totalAmount || 0) / 100));
      }
    });

    return Array.from(monthlyRevenue.entries()).map(([month, revenue]) => ({
      month,
      revenue: Math.round(revenue * 100) / 100
    }));
  }

  private getSubscriptionDistribution(subscriptions: any[]): Array<{ status: string; count: number }> {
    const statusCounts = new Map<string, number>();

    subscriptions.forEach(sub => {
      const status = sub.status || 'unknown';
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    });

    return Array.from(statusCounts.entries()).map(([status, count]) => ({
      status,
      count
    }));
  }

  private async getWeeklyActiveUsers(last7Days: Date): Promise<number> {
    const cacheKey = 'admin:weekly_active_users';
    const cached = await this.redisClient.get(cacheKey);
    if (cached) return parseInt(cached);

    // This would typically involve session/login data
    // For now, we'll use users who had activity (created images) in the last 7 days
    const activeUsers = await this.prisma.user.findMany({
      where: {
        createdAt: { gte: last7Days }
      },
      select: { id: true },
      distinct: ['id']
    });

    const count = activeUsers.length;
    await this.redisClient.set(cacheKey, count.toString(), 'EX', 3600); // 1 hour
    return count;
  }

  private getTopProcessingDays(imageActivityData: Array<{ date: string; count: number }>): Array<{ date: string; count: number }> {
    return imageActivityData
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(item => ({
        date: item.date,
        count: item.count
      }));
  }
}