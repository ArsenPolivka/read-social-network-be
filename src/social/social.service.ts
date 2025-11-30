import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  async createReview(userId: string, data: any) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });

    return this.prisma.review.create({
      data: {
        profileId: profile?.id!,
        bookId: data.bookId,
        rating: data.rating,
        content: data.content,
      },
    });
  }

  async followUser(followerUserId: string, targetUsername: string) {
    const follower = await this.prisma.profile.findUnique({ where: { userId: followerUserId } });
    const target = await this.prisma.profile.findUnique({ where: { username: targetUsername } });

    if (!follower) throw new NotFoundException('Follower profile not found');
    if (!target) throw new NotFoundException('Target user not found');
    if (follower.id === target.id) throw new BadRequestException("Cannot follow self");

    try {
      return await this.prisma.userFollow.create({
        data: {
          followerId: follower.id,
          followingId: target.id,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') throw new BadRequestException('Already following');
      throw error;
    }
  }

  async getFeed(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) return [];

    return this.prisma.review.findMany({
      where: {
        profile: {
          followedBy: { some: { followerId: profile.id } }
        }
      },
      include: {
        book: true,
        profile: { select: { username: true, avatarUrl: true, fullName: true, id: true } }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // SMART POPULAR DATA
  async getPopular(currentUserId: string) {
     const viewer = await this.prisma.profile.findUnique({ where: { userId: currentUserId } });

     // 1. Top Users (by followers)
     const users = await this.prisma.profile.findMany({
        take: 6,
        orderBy: { followedBy: { _count: 'desc' } },
        include: {
            _count: { select: { followedBy: true, bookshelfItems: true } }
        }
     });

     let followingIds = new Set<string>();
     if (viewer) {
         const follows = await this.prisma.userFollow.findMany({
             where: { followerId: viewer.id, followingId: { in: users.map(u => u.id) } }
         });
         followingIds = new Set(follows.map(f => f.followingId));
     }

     const mappedUsers = users.map(u => ({
         id: u.id,
         username: u.username,
         fullName: u.fullName,
         bio: u.bio,
         avatarUrl: u.avatarUrl,
         followersCount: u._count.followedBy,
         booksReadCount: u._count.bookshelfItems,
         isFollowing: followingIds.has(u.id)
     }));

     // 2. Dynamic Topics Generation
     // A. Get most popular books currently being read
     const popularBooks = await this.prisma.bookshelfItem.groupBy({
        by: ['bookId'],
        where: { status: 'READING' },
        _count: { bookId: true },
        orderBy: { _count: { bookId: 'desc' } },
        take: 3
     });

     // We need to fetch the titles for these book IDs
     const bookTopics = await Promise.all(popularBooks.map(async (p) => {
         const book = await this.prisma.book.findUnique({ where: { id: p.bookId } });
         return book ? { type: 'book', label: `Reading: ${book.title}`, value: book.title } : null;
     }));

     // B. Get most popular genres (Using raw query for array aggregation if needed, but for simplicity we mock based on logic or use static popular ones if data low)
     // Since grouping by array elements is hard in Prisma, we'll use a curated list mixed with data if available, 
     // or just use the ones we know are in the DB.
     // For this prototype, let's return a mix of static genres and the dynamic books.

     const staticGenres = [
        { type: 'genre', label: '#SciFi', value: 'Science Fiction' },
        { type: 'genre', label: '#FantasyReaders', value: 'Fantasy' },
        { type: 'genre', label: '#NonFictionClub', value: 'Non-Fiction' },
     ];

     const topics = [
         ...bookTopics.filter(t => t !== null),
         ...staticGenres
     ];

     return { users: mappedUsers, topics };
  }
}
