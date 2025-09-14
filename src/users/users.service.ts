import type { ClerkClient } from '@clerk/backend';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Roles, VerificationStatus } from 'generated/prisma';
import Redis from 'ioredis';
import { PrismaService } from 'src/prisma/prisma.service';
import { REDIS_CLIENT } from 'src/queue/queue.module';
import { IGlobalMeta, IGlobalRes } from 'src/types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { IUser, IUserService } from './interfaces/users.interface';

@Injectable()
export class UsersService implements IUserService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService, @Inject('CLERK_CLIENT') private readonly clerkClient: ClerkClient, @Inject(REDIS_CLIENT) private readonly redisClient: Redis) { }

  async createUser(createUserDto: CreateUserDto): Promise<IGlobalRes<IUser>> {
    this.logger.log(`Attempting to create user with email ${createUserDto.email} and username ${createUserDto.username}`);
    const isExisted = await this.prisma.user.findUnique({
      where: {
        email_username_id: {
          email: createUserDto.email,
          username: createUserDto.username,
          id: createUserDto.id
        }
      }
    });
    this.logger.log(`Attempting to create user with email ${createUserDto.email} and username ${createUserDto.username}`);
    if (isExisted) {
      this.logger.warn(`User with email ${createUserDto.email} and username ${createUserDto.username} already exists`);
      throw new BadRequestException("User already exists");
    }

    const user = await this.prisma.user.create({
      data: { ...createUserDto },
    });
    await this.clerkClient.users.updateUserMetadata(createUserDto.id, { publicMetadata: { role: "USER" } });
    this.logger.log(`User with email ${createUserDto.email} and username ${createUserDto.username} created in database`);
    return {
      success: true,
      message: "User created successfully",
      data: user
    };
  }

  async findAllUsers(limit: number, cursor?: string, search?: string, verificationStatus?: VerificationStatus, isBlocked?: boolean, isDeleted?: boolean): Promise<IGlobalRes<IUser[], IGlobalMeta>> {
    this.logger.log(`Finding all users with limit ${limit} and cursor ${cursor}`);
    const users = await this.prisma.user.findMany({
      take: limit,
      cursor: cursor ? { id: cursor } : undefined,
      where: {
        ...(search && {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(verificationStatus && { verified: verificationStatus }),
        ...(isBlocked && { isBlocked }),
        ...(isDeleted && { isDeleted }),
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    this.logger.log(`Found ${users.length} users`);
    return {
      success: true,
      message: "Users retrieved successfully",
      data: users,
      meta: {
        limit,
        count: users.length,
        hasNextPage: cursor ? users.length === limit : false,
        nextCursor: users.length > 0 ? users[users.length - 1].id : null,
      }
    };
  }

  async findUserById(id: string): Promise<IGlobalRes<IUser | null>> {
    this.logger.log(`Finding user with id ${id}`);
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    this.logger.log(`Finding user with id ${id}`);
    if (!user) {
      this.logger.warn(`User with id ${id} not found`);
      throw new NotFoundException("User not found");
    }
    this.logger.log(`User with id ${id} found`);
    return {
      success: true,
      message: "User found successfully",
      data: user
    };
  }

  async updateUser(id: string, updateUserDto: Partial<UpdateUserDto>): Promise<IGlobalRes<IUser | null>> {
    this.logger.log(`Attempting to update user with id ${id}`);
    // First find the user to get the actual id
    const { data } = await this.findUserById(id);

    if (!data) {
      this.logger.warn(`User with id ${id} not found`);
      throw new NotFoundException("User not found");
    }

    // Update using the actual user id
    const user = await this.prisma.user.update({
      where: {
        id: data.id
      },
      data: updateUserDto,
    });
    this.logger.log(`User with id ${data.id} updated in database`);
    if (updateUserDto.isBlocked === true) {
      await this.clerkClient.users.lockUser(data.id)
      this.logger.log(`User with id ${data.id} locked in Clerk`);
    }

    if (updateUserDto.isDeleted === true) {
      await this.clerkClient.users.banUser(data.id)
      this.logger.log(`User with id ${data.id} banned in Clerk`);
    }

    if (updateUserDto.isBlocked === false) {
      await this.clerkClient.users.unlockUser(data.id)
      this.logger.log(`User with id ${data.id} unlocked in Clerk`);
    }

    if (updateUserDto.isDeleted === false) {
      await this.clerkClient.users.unbanUser(data.id)
      this.logger.log(`User with id ${data.id} unbanned in Clerk`);
    }
    this.logger.log(`User with id ${data.id} updated in Clerk`);
    return {
      success: true,
      message: "User updated successfully",
      data: user
    };
  }

  async changeRole(id: string, role: Roles): Promise<IGlobalRes<IUser | null>> {
    this.logger.log(`Attempting to change role for user with id ${id} to ${role}`);
    const { data } = await this.findUserById(id);
    this.logger.log(`Attempting to change role for user with id ${id} to ${role}`);
    if (!data) {
      return {
        success: false,
        message: "User not found",
        data: null
      };
    }
    this.logger.log(`Changing role for user ${data.id} to ${role}`);
    const user = await this.prisma.user.update({
      where: {
        id: data.id
      },
      data: {
        role
      }
    });

    await this.clerkClient.users.updateUserMetadata(data.id, { publicMetadata: { role: role } });
    this.logger.log(`Role for user ${data.id} changed to ${role} in Clerk`);
    return {
      success: true,
      message: "User role updated successfully",
      data: user
    };
  }

  async getAUserLoginHistory(userId: string): Promise<IGlobalRes<any>> {
    this.logger.log(`Fetching login history for user with id ${userId}`);
    const { data } = await this.findUserById(userId);
    if (!data) {
      this.logger.warn(`User with id ${userId} not found`);
      throw new NotFoundException("User not found");
    }
    const logs = await this.clerkClient.sessions.getSessionList({
      userId: data.id,
      limit: 100,
    });
    this.logger.log(`Fetched ${logs.totalCount} login history records for user with id ${userId}`);
    return {
      success: true,
      message: "Login history fetched successfully",
      data: logs
    };
  }

  async getUserDashboardStats(id: string): Promise<IGlobalRes<any>> {
    this.logger.log(`Fetching dashboard stats for user with id ${id}`);

    try {
      // Check Redis cache first
      const cacheKey = `user:${id}:dashboard_stats`;
      const cachedStats = await this.redisClient.get(cacheKey);

      if (cachedStats) {
        this.logger.log(`Dashboard stats found in cache for user ${id}`);
        return {
          success: true,
          message: "Dashboard stats fetched successfully (cached)",
          data: JSON.parse(cachedStats)
        };
      }

      // Verify user exists - get from database directly to access all fields
      const user = await this.prisma.user.findUnique({
        where: { id }
      });

      if (!user) {
        this.logger.warn(`User with id ${id} not found`);
        throw new NotFoundException("User not found");
      }

      // Get current date for calculations
      const now = new Date();
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Check individual cache keys for frequently accessed data
      const totalImagesCacheKey = `user:${id}:total_images`;
      const monthlyImagesCacheKey = `user:${id}:monthly_images:${now.getFullYear()}-${now.getMonth()}`;
      const lastMonthImagesCacheKey = `user:${id}:monthly_images:${startOfLastMonth.getFullYear()}-${startOfLastMonth.getMonth()}`;

      // Try to get cached values, fallback to database queries
      let totalImagesProcessed = await this.redisClient.get(totalImagesCacheKey);
      if (!totalImagesProcessed) {
        totalImagesProcessed = String(await this.prisma.image.count({
          where: { userId: user.id, status: 'ready' }
        }));
        // Cache for 10 minutes
        await this.redisClient.set(totalImagesCacheKey, totalImagesProcessed, 'EX', 600);
      } else {
        totalImagesProcessed = String(totalImagesProcessed);
      }

      let imagesThisMonth = await this.redisClient.get(monthlyImagesCacheKey);
      if (!imagesThisMonth) {
        imagesThisMonth = String(await this.prisma.image.count({
          where: {
            userId: user.id,
            status: 'ready',
            createdAt: { gte: startOfCurrentMonth }
          }
        }));
        // Cache for 1 hour
        await this.redisClient.set(monthlyImagesCacheKey, imagesThisMonth, 'EX', 3600);
      } else {
        imagesThisMonth = String(imagesThisMonth);
      }

      let lastMonthImagesProcessed = await this.redisClient.get(lastMonthImagesCacheKey);
      if (!lastMonthImagesProcessed) {
        lastMonthImagesProcessed = String(await this.prisma.image.count({
          where: {
            userId: user.id,
            status: 'ready',
            createdAt: {
              gte: startOfLastMonth,
              lte: endOfLastMonth
            }
          }
        }));
        // Cache for 24 hours (last month data rarely changes)
        await this.redisClient.set(lastMonthImagesCacheKey, lastMonthImagesProcessed, 'EX', 86400);
      } else {
        lastMonthImagesProcessed = String(lastMonthImagesProcessed);
      }

      // Current Subscription Status (cache for 30 minutes)
      const subscriptionCacheKey = `user:${id}:subscription`;
      let currentSubscription = await this.redisClient.get(subscriptionCacheKey);
      if (!currentSubscription) {
        const subscription = await this.prisma.subscription.findUnique({
          where: { userId: user.id }
        });
        currentSubscription = JSON.stringify(subscription);
        await this.redisClient.set(subscriptionCacheKey, currentSubscription, 'EX', 1800);
      }
      const parsedSubscription = JSON.parse(currentSubscription);

      // Cards Data
      const cards = {
        totalImagesProcessed: parseInt(totalImagesProcessed),
        imagesThisMonth: parseInt(imagesThisMonth),
        subscriptionStatus: parsedSubscription ? {
          status: parsedSubscription.status,
          isActive: parsedSubscription.status === 'active',
          currentPeriodEnd: parsedSubscription.currentPeriodEnd
        } : {
          status: 'none',
          isActive: false,
          currentPeriodEnd: null
        },
        lastMonthImagesProcessed: parseInt(lastMonthImagesProcessed)
      };

      // Report 1: Image Processing Activity (Last 30 days) - cache for 2 hours
      const activityCacheKey = `user:${id}:activity_30days`;
      let imageActivityData = await this.redisClient.get(activityCacheKey);

      if (!imageActivityData) {
        const rawActivityData = await this.prisma.image.groupBy({
          by: ['createdAt'],
          where: {
            userId: user.id,
            createdAt: { gte: last30Days }
          },
          _count: { id: true }
        });
        imageActivityData = JSON.stringify(rawActivityData);
        await this.redisClient.set(activityCacheKey, imageActivityData, 'EX', 7200);
      }
      const parsedActivityData = JSON.parse(imageActivityData);

      // Process data for daily chart (last 30 days)
      const dailyImageActivity: Array<{ date: string; count: number }> = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];

        const dayData = parsedActivityData.filter((item: any) => {
          const itemDate = new Date(item.createdAt).toISOString().split('T')[0];
          return itemDate === dateStr;
        });

        dailyImageActivity.push({
          date: dateStr,
          count: dayData.reduce((sum: number, item: any) => sum + item._count.id, 0)
        });
      }

      // Report 2: Image Status Distribution - cache for 1 hour
      const statusDistributionCacheKey = `user:${id}:status_distribution`;
      let imageStatusDistribution = await this.redisClient.get(statusDistributionCacheKey);

      if (!imageStatusDistribution) {
        const rawStatusData = await this.prisma.image.groupBy({
          by: ['status'],
          where: { userId: user.id },
          _count: { id: true }
        });
        imageStatusDistribution = JSON.stringify(rawStatusData);
        await this.redisClient.set(statusDistributionCacheKey, imageStatusDistribution, 'EX', 3600);
      }
      const parsedStatusData = JSON.parse(imageStatusDistribution);

      const statusDistribution = parsedStatusData.map((item: any) => ({
        status: item.status,
        count: item._count.id
      }));

      // Additional monthly comparison data
      const monthlyGrowth = parseInt(lastMonthImagesProcessed) === 0 ? 100 :
        ((parseInt(imagesThisMonth) - parseInt(lastMonthImagesProcessed)) / parseInt(lastMonthImagesProcessed)) * 100;

      // Recent activity - cache for 5 minutes (most dynamic data)
      const recentActivityCacheKey = `user:${id}:recent_activity`;
      let recentImages = await this.redisClient.get(recentActivityCacheKey);

      if (!recentImages) {
        const rawRecentImages = await this.prisma.image.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            originalFileName: true,
            status: true,
            createdAt: true
          }
        });
        recentImages = JSON.stringify(rawRecentImages);
        await this.redisClient.set(recentActivityCacheKey, recentImages, 'EX', 300);
      }
      const parsedRecentImages = JSON.parse(recentImages);

      const dashboardStats = {
        cards,
        reports: {
          imageActivity: {
            title: "Image Processing Activity (Last 30 Days)",
            data: dailyImageActivity,
            totalCount: dailyImageActivity.reduce((sum, item) => sum + item.count, 0)
          },
          statusDistribution: {
            title: "Image Status Distribution",
            data: statusDistribution,
            totalImages: statusDistribution.reduce((sum, item) => sum + item.count, 0)
          }
        },
        insights: {
          monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
          mostActiveDay: dailyImageActivity.reduce((max, day) =>
            day.count > max.count ? day : max, { date: '', count: 0 }
          ),
          averageDailyProcessing: Math.round(
            (dailyImageActivity.reduce((sum, day) => sum + day.count, 0) / 30) * 100
          ) / 100
        },
        recentActivity: parsedRecentImages,
        userInfo: {
          joinedDate: user.createdAt,
          accountStatus: {
            verified: user.verified,
            isBlocked: user.isBlocked,
            isDeleted: user.isDeleted
          }
        }
      };

      // Cache the complete dashboard stats for 5 minutes
      await this.redisClient.set(cacheKey, JSON.stringify(dashboardStats), 'EX', 300);

      this.logger.log(`Dashboard stats fetched successfully for user ${user.id} and cached`);
      return {
        success: true,
        message: "Dashboard stats fetched successfully",
        data: dashboardStats
      };

    } catch (error) {
      this.logger.error(`Error fetching dashboard stats for user ${id}: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException("Failed to fetch dashboard statistics");
    }
  }

}
