import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RagService } from './rag.service';

@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AiController {
  constructor(private readonly ragService: RagService) {}

  @Post('ask')
  async askQuestion(@Body() body: { bookId: string; question: string }) {
    // bookId here refers to the UploadedBook.id (from the ingestion table)
    return this.ragService.askQuestion(body.bookId, body.question);
  }
}
