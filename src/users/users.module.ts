import { Module } from '@nestjs/common';
import { LoginHistoryService } from './services/login-history.service';
import { UserRoleService } from './services/user-role.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [],
  controllers: [UsersController],
  providers: [UsersService, UserRoleService, LoginHistoryService],
})
export class UsersModule { }
