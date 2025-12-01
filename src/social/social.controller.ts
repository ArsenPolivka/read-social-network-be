import { Controller, Post, Get, Body, Param, UseGuards, Request, Delete } from '@nestjs/common';
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
  
  @Get('popular')
  getPopular(@Request() req) {
    return this.socialService.getPopular(req.user.userId);
  }

  // --- NEW ENDPOINTS ---

  @Post('review/:id/like')
  toggleLike(@Request() req, @Param('id') reviewId: string) {
    return this.socialService.toggleLike(req.user.userId, reviewId);
  }

  @Post('review/:id/comment')
  addComment(@Request() req, @Param('id') reviewId: string, @Body() body: { content: string }) {
    return this.socialService.addComment(req.user.userId, reviewId, body.content);
  }

  @Get('review/:id/comments')
  getComments(@Param('id') reviewId: string) {
    return this.socialService.getComments(reviewId);
  }
}