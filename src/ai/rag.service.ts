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
  async askQuestion(
    userId: string,
    bookId: string,
    question: string,
    language: string = 'uk',
  ) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    const libraryBook = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!libraryBook) {
      throw new NotFoundException('Book not found');
    }

    // 1) Спочатку зберігаємо репліку юзера
    await this.prisma.aiMessage.create({
      data: {
        profileId: profile.id,
        bookId,
        role: 'user',
        content: question,
      },
    });

    // 2) Тягнемо недавню історію (включно з поточним питанням)
    const history = await this.prisma.aiMessage.findMany({
      where: { profileId: profile.id, bookId },
      orderBy: { createdAt: 'asc' },
      take: 20, // останні 20 повідомлень, щоб не забити контекст
    });

    const bookContext = `
  Title: ${libraryBook.title}
  Author: ${libraryBook.author}
  Description: ${libraryBook.description || 'No description available.'}
  Published: ${libraryBook.publishedYear}
  Genres: ${libraryBook.genres?.join(', ')}
  `.trim();

    const systemPrompt = `
  You are a specialized assistant for the book "${libraryBook.title}".

  LANGUAGE (CRITICAL):
  - You MUST answer ONLY in this language: "${language}".
  - Ignore the language of the question.
  - Do NOT mix in any other language.

  SCOPE:
  - You may answer any question about this book: сюжет, теми, стиль, персонажі,
    чи варто читати, для кого підійде, сильні/слабкі сторони тощо.
  - You MUST NOT discuss topics clearly unrelated to this book.

  If the user clearly asks about something completely unrelated to this book,
  answer with EXACTLY this single sentence and nothing else:
  "Я можу обговорювати лише контекст книги. Пробачте."

  Book context:
  ${bookContext}
  `.trim();

    // 3) Конструюємо messages для Ollama
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.map((m) => ({
        role: m.role === 'ai' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      })),
    ];

    // 4) Виклик моделі
    const answerText = await this.ollamaService.chat(messages);

    // 5) Зберігаємо відповідь AI
    const aiMessage = await this.prisma.aiMessage.create({
      data: {
        profileId: profile.id,
        bookId,
        role: 'ai',
        content: answerText,
      },
    });

    return { answer: answerText, messageId: aiMessage.id };
  }
}