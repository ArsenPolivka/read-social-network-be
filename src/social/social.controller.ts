import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SocialService } from './social.service';

@Controller('social')
@UseGuards(AuthGuard('jwt'))
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Post('review')
  createReview(@Request() req, @Body() body: any) {
    return this.socialService.createReview(req.user.userId, body);
  }

  @Post('follow/:username')
  followUser(@Request() req, @Param('username') username: string) {
    return this.socialService.followUser(req.user.userId, username);
  }

  @Get('feed')
  getFeed(@Request() req) {
    return this.socialService.getFeed(req.user.userId);
  }
}
