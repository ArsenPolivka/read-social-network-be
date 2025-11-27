import { Controller, Get, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProfileService } from './profile.service';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMyProfile(@Request() req) {
    return this.profileService.getProfile(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('me')
  async updateProfile(@Request() req, @Body() body: any) {
    return this.profileService.updateProfile(req.user.userId, body);
  }

  @Get(':username')
  async getPublicProfile(@Param('username') username: string) {
    return this.profileService.getPublicProfile(username);
  }
}
