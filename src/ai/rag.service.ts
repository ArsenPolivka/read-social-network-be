import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OllamaService } from './ollama.service';

@Injectable()
export class RagService {
  constructor(
    private prisma: PrismaService,
    private ollamaService: OllamaService,
  ) {}

  // 1. Fetch Chat History
  async getChatHistory(userId: string, bookId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) return [];

    return this.prisma.aiMessage.findMany({
      where: {
        profileId: profile.id,
        bookId: bookId,
      },
      orderBy: { createdAt: 'asc' }, // Oldest first for chat UI
    });
  }

  // 2. Ask & Save
  async askQuestion(userId: string, bookId: string, question: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException("User profile not found");

    // A. Find Book
    const libraryBook = await this.prisma.book.findUnique({
      where: { id: bookId }
    });

    if (!libraryBook) throw new NotFoundException("Book not found");

    // B. Save USER Message
    await this.prisma.aiMessage.create({
      data: {
        profileId: profile.id,
        bookId: bookId,
        role: 'user',
        content: question,
      }
    });

    // C. Generate Answer (Using Logic from previous step)
    const context = `
      Title: ${libraryBook.title}
      Author: ${libraryBook.author}
      Description: ${libraryBook.description || "No description available."}
      Published: ${libraryBook.publishedYear}
      Genres: ${libraryBook.genres?.join(', ')}
    `;

    const systemPrompt = `
      You are an expert literary assistant. 
      The user is asking about the book "${libraryBook.title}" by ${libraryBook.author}.
      Use your internal knowledge to answer. 
      
      Book Context:
      ${context}
    `;

    const answerText = await this.ollamaService.chat(question, systemPrompt);

    // D. Save AI Message
    const aiMessage = await this.prisma.aiMessage.create({
      data: {
        profileId: profile.id,
        bookId: bookId,
        role: 'ai',
        content: answerText,
      }
    });
    
    return { answer: answerText, messageId: aiMessage.id };
  }
}