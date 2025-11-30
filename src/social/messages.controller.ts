import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(AuthGuard('jwt'))
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  async getInbox(@Request() req) {
    return this.messagesService.getConversations(req.user.userId);
  }

  @Get(':profileId')
  async getChat(@Request() req, @Param('profileId') profileId: string) {
    return this.messagesService.getMessages(req.user.userId, profileId);
  }

  @Post()
  async sendMessage(@Request() req, @Body() body: { recipientId: string; content: string }) {
    return this.messagesService.sendMessage(req.user.userId, body.recipientId, body.content);
  }
}