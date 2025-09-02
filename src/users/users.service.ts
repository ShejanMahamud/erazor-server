import type { ClerkClient } from '@clerk/backend';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IGlobalMeta, IGlobalRes } from 'src/types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { IUser, IUserService } from './interfaces/users.interface';
import { UserRoleService } from './services/user-role.service';

@Injectable()
export class UsersService implements IUserService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService, @Inject('CLERK_CLIENT') private readonly clerkClient: ClerkClient, private readonly userRole: UserRoleService) { }

  async createUser(createUserDto: CreateUserDto): Promise<IGlobalRes<IUser>> {
    const isExisted = await this.prisma.user.findUnique({
      where: {
        email_clerkId_username: {
          email: createUserDto.email,
          clerkId: createUserDto.clerkId,
          username: createUserDto.username
        }
      }
    })
    if (isExisted) {
      throw new BadRequestException("User already exists");
    }
    const user = await this.prisma.user.create({
      data: createUserDto,
    });
    await this.clerkClient.users.updateUserMetadata(user.clerkId, {
      publicMetadata: {
        role: 'USER'
      }
    });
    await this.userRole.assignRoleToUser('USER', user.id);
    return {
      success: true,
      message: "User created successfully",
      data: user
    };
  }

  async findAllUsers(limit: number, cursor?: string, search?: string): Promise<IGlobalRes<IUser[], IGlobalMeta>> {
    this.logger.log(`Finding all users with limit: ${limit}, cursor: ${cursor}, search: ${search}`);
    const users = await this.prisma.user.findMany({
      take: limit,
      cursor: cursor ? { id: cursor } : undefined,
      where: search ? {
        OR: [
          { email: { contains: search } },
          { username: { contains: search } },
          { firstName: { contains: search } },
          { lastName: { contains: search } },
        ]
      } : undefined,
    });
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
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ id }, { clerkId: id }] },
    });
    return {
      success: true,
      message: "User found successfully",
      data: user
    };
  }

  async updateUser(id: string, updateUserDto: Partial<UpdateUserDto>): Promise<IGlobalRes<IUser | null>> {
    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
    return {
      success: true,
      message: "User updated successfully",
      data: user
    };
  }

}
