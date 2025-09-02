import { Body, Controller, DefaultValuePipe, Get, Headers, Param, ParseIntPipe, Patch, Post, Query, Req, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import { CreateLoginHistoryDto } from './dto/create-login-history.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateLoginHistoryDto } from './dto/update-login-history.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginHistoryService } from './services/login-history.service';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService, private readonly loginHistory: LoginHistoryService) { }

  @SetMetadata('skipArcjet', true)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Get()
  findAll(@Req() req: Request, @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number, @Query('cursor') cursor?: string, @Query('search') search?: string) {

    return this.usersService.findAllUsers(limit, cursor, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findUserById(id);
  }

  @SetMetadata('skipArcjet', true)
  @Get('webhook/:id')
  webhookFindUser(@Param('id') id: string, @Headers('x-webhook-signature') secret: string) {
    console.log('Webhook secret:', secret);
    if (secret !== process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
      throw new Error('Invalid webhook signature');
    }
    return this.usersService.findUserById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateUser(id, updateUserDto);
  }

  @Patch('delete/:id')
  remove(@Param('id') id: string) {
    return this.usersService.updateUser(id, { isDeleted: true });
  }

  @Post('login-history')
  createLoginHistoryAPI(@Body() createLoginHistoryDto: CreateLoginHistoryDto, @Req() req: Request) {
    return this.loginHistory.createLoginHistory(createLoginHistoryDto, req);
  }

  @SetMetadata('skipArcjet', true)
  @Post('webhook/login-history')
  createLoginHistory(@Body() createLoginHistoryDto: CreateLoginHistoryDto, @Req() req: Request, @Headers('x-webhook-signature') secret: string) {
    console.log('Webhook secret:', secret);
    if (secret !== process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
      throw new Error('Invalid webhook signature');
    }
    return this.loginHistory.createLoginHistory(createLoginHistoryDto, req);
  }

  @Patch('login-history/:id')
  updateLoginHistory(@Param('id') id: string, @Body() updateLoginHistoryDto: UpdateLoginHistoryDto) {
    return this.loginHistory.updateLoginHistory(id, updateLoginHistoryDto);
  }

  @Get('login-history/:userId')
  findLoginHistoryByUserId(@Param('userId') userId: string) {
    return this.loginHistory.findLoginHistoryByUserId(userId);
  }

  @Get('login-history')
  findAllLoginHistory() {
    return this.loginHistory.findAllLoginHistory();
  }
}