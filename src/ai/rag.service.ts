import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OllamaService } from './ollama.service';

@Injectable()
export class RagService {
  constructor(
    private prisma: PrismaService,
    private ollamaService: OllamaService,
  ) {}

  async askQuestion(bookId: string, question: string) {
    // 1. Embed Question
    const questionEmbedding = await this.ollamaService.generateEmbedding(question);

    // 2. Vector Search (Find relevant chunks)
    // We cast the result to any[] because Prisma types for raw queries are loose
    const relevantChunks: any[] = await this.prisma.$queryRaw`
      SELECT content 
      FROM "book_chunks"
      WHERE "uploaded_book_id" = ${bookId}
      ORDER BY embedding <-> ${questionEmbedding}::vector
      LIMIT 5
    `;

    const context = relevantChunks.map(c => c.content).join("\n---\n");

    // 3. Generate Answer
    const answer = await this.ollamaService.chat(question, context);
    
    return { answer, contextUsed: relevantChunks.length };
  }
}