import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TrackerService } from './tracker.service';

@Controller('tracker')
@UseGuards(AuthGuard('jwt'))
export class TrackerController {
  constructor(private readonly trackerService: TrackerService) {}

  @Post('log')
  logSession(@Request() req, @Body() body: any) {
    return this.trackerService.logSession(req.user.userId, body);
  }

  @Get('stats')
  getStats(@Request() req) {
    return this.trackerService.getStats(req.user.userId);
  }
}
