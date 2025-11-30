import { Controller, Get, Put, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
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

  @UseGuards(AuthGuard('jwt'))
  @Get('search')
  async search(
    @Request() req, 
    @Query('q') query: string,
    @Query('genre') genre: string, // New Param
    @Query('book') book: string    // New Param
  ) {
    return this.profileService.searchUsers(req.user.userId, query || "", { genre, book });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':username')
  async getPublicProfile(@Request() req, @Param('username') username: string) {
    return this.profileService.getPublicProfile(username, req.user.userId);
  }
}