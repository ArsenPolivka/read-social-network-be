import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrackerService {
  constructor(private prisma: PrismaService) {}

  async logSession(userId: string, data: any) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });

    // 1. Create Session
    const session = await this.prisma.readingSession.create({
      data: {
        profileId: profile?.id!,
        bookId: data.bookId,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        durationMin: data.durationMin,
        pagesRead: data.pagesRead,
      },
    });

    // 2. Update Bookshelf Progress
    await this.prisma.bookshelfItem.update({
      where: {
        profileId_bookId: { profileId: profile?.id!, bookId: data.bookId },
      },
      data: {
        progress: data.endPage,
        status: 'READING',
      },
    });

    return session;
  }

  async getStats(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    
    // Aggregations
    const totalBooks = await this.prisma.bookshelfItem.count({
        where: { profileId: profile?.id!, status: 'READ' }
    });

    const totalPages = await this.prisma.readingSession.aggregate({
        where: { profileId: profile?.id! },
        _sum: { pagesRead: true, durationMin: true }
    });

    return {
        booksRead: totalBooks,
        pagesRead: totalPages._sum.pagesRead || 0,
        minutesRead: totalPages._sum.durationMin || 0,
    };
  }

  async getHistory(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });

    return this.prisma.readingSession.findMany({
      where: { profileId: profile?.id },
      include: { book: true }, // Include book info for the list
      orderBy: { startTime: 'desc' },
      take: 10 // Last 10 sessions
    });
  }
}
