import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Patch, Post, Query, SetMetadata, UseGuards } from '@nestjs/common';
import { Permissions, Roles, VerificationStatus } from 'generated/prisma';
import { PermissionsRequired } from 'src/decorators/permissions.decorator';
import { RolesRequired } from 'src/decorators/roles.decorator';
import { ClerkGuard } from 'src/guards/clerk.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')

export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @SetMetadata('skipArcjet', true)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }


  @Get()
  @RolesRequired(Roles.ADMIN)
  @PermissionsRequired(Permissions.MANAGE_USERS)
  @UseGuards(ClerkGuard, RolesGuard, PermissionsGuard)
  findAll(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number, @Query('cursor') cursor?: string, @Query('search') search?: string, @Query('verificationStatus') verificationStatus?: VerificationStatus, @Query('isBlocked') isBlocked?: boolean, @Query('isDeleted') isDeleted?: boolean) {
    return this.usersService.findAllUsers(limit, cursor, search, verificationStatus, isBlocked, isDeleted);
  }

  @UseGuards(ClerkGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findUserById(id);
  }


  @RolesRequired(Roles.ADMIN)
  @PermissionsRequired(Permissions.MANAGE_USERS)
  @UseGuards(ClerkGuard, RolesGuard, PermissionsGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateUser(id, updateUserDto);
  }

  @RolesRequired(Roles.ADMIN)
  @PermissionsRequired(Permissions.MANAGE_ROLES)
  @UseGuards(ClerkGuard, RolesGuard, PermissionsGuard)
  @Patch('role/:id')
  changeRole(@Param('id') id: string, @Body('role') role: Roles) {
    return this.usersService.changeRole(id, role);
  }

  @UseGuards(ClerkGuard)
  @Patch('delete/:id')
  remove(@Param('id') id: string) {
    return this.usersService.updateUser(id, { isDeleted: true });
  }

  @UseGuards(ClerkGuard)
  @Get('login-history/:userId')
  getAUserLoginHistory(@Param('userId') userId: string) {
    return this.usersService.getAUserLoginHistory(userId);
  }

  @UseGuards(ClerkGuard)
  @Get('dashboard-stats/:id')
  getUserDashboardStats(@Param('id') id: string) {
    return this.usersService.getUserDashboardStats(id);
  }
}