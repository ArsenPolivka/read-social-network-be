import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RagService } from './rag.service';

@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AiController {
  constructor(private readonly ragService: RagService) {}

  @Get('history/:bookId')
  async getHistory(@Request() req, @Param('bookId') bookId: string) {
    return this.ragService.getChatHistory(req.user.userId, bookId);
  }

  @Post('ask')
  async askQuestion(
    @Request() req,
    @Body() body: { bookId: string; question: string; language?: string },
  ) {
    return this.ragService.askQuestion(
      req.user.userId,
      body.bookId,
      body.question,
      body.language ?? 'uk',
    );
  }
}
