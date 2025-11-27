import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShelfStatus } from '@prisma/client';

@Injectable()
export class BookshelfService {
  constructor(private prisma: PrismaService) {}

  async getMyBookshelf(userId: string) {
    return this.prisma.bookshelfItem.findMany({
      where: { profile: { userId } },
      include: { book: true },
      // FIX: Changed 'addedAt' to 'updatedAt' to match your schema
      orderBy: { updatedAt: 'desc' }, 
    });
  }

  async addBook(userId: string, bookId: string, status: ShelfStatus) {
    // 1. Find the profile safely
    const profile = await this.prisma.profile.findUnique({ 
      where: { userId } 
    });

    // 2. Guard clause: Prevent the "profileId is missing" error
    if (!profile) {
        throw new NotFoundException('Profile not found. Please go to /onboarding to create your profile.');
    }
    
    // 3. Upsert safely
    return this.prisma.bookshelfItem.upsert({
      where: {
        profileId_bookId: {
          profileId: profile.id,
          bookId,
        },
      },
      update: { 
        status, 
        // FIX: Explicitly update the timestamp
        updatedAt: new Date(),
      },
      create: {
        profileId: profile.id,
        bookId,
        status,
        // Prisma automatically handles createdAt/updatedAt default values usually, 
        // but explicitly setting them here is safe.
      },
    });
  }
}