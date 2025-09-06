import type { ClerkClient } from '@clerk/backend';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Roles, VerificationStatus } from 'generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { IGlobalMeta, IGlobalRes } from 'src/types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { IUser, IUserService } from './interfaces/users.interface';

@Injectable()
export class UsersService implements IUserService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService, @Inject('CLERK_CLIENT') private readonly clerkClient: ClerkClient) { }

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

}
