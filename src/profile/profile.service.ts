import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    return this.prisma.profile.findUnique({
      where: { userId },
      include: {
        readingGoal: true,
        reviews: {
            include: { book: true },
            orderBy: { createdAt: 'desc' }
        },
        _count: { select: { following: true, followedBy: true, bookshelfItems: { where: { status: 'READ' } } } },
      },
    });
  }

  async getPublicProfile(username: string, currentUserId: string) {
    const viewer = await this.prisma.profile.findUnique({ where: { userId: currentUserId } });

    const profile = await this.prisma.profile.findUnique({
      where: { username },
      include: {
        readingGoal: true,
        bookshelfItems: {
            where: { status: 'READ' },
            take: 5,
            include: { book: true }
        },
        reviews: {
            include: { book: true },
            orderBy: { createdAt: 'desc' }
        },
        _count: { select: { following: true, followedBy: true, bookshelfItems: { where: { status: 'READ' } } } },
      },
    });

    if (!profile || !viewer) return profile;

    const follow = await this.prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: viewer.id,
          followingId: profile.id,
        },
      },
    });

    return { ...profile, isFollowing: !!follow };
  }

  async updateProfile(userId: string, data: any) {
    return this.prisma.profile.upsert({
      where: { userId },
      update: {
        username: data.username,
        fullName: data.fullName,
        bio: data.bio,
        onboarded: true,
        // --- NEW: Save Genres ---
        favoriteGenres: data.favoriteGenres || []
      },
      create: {
        userId,
        username: data.username,
        fullName: data.fullName,
        bio: data.bio,
        onboarded: true,
        // --- NEW: Save Genres ---
        favoriteGenres: data.favoriteGenres || []
      },
    });
  }

  // Enhanced Search with Smart Filters
  async searchUsers(currentUserId: string, query: string, filters?: { genre?: string, book?: string }) {
    const viewer = await this.prisma.profile.findUnique({ where: { userId: currentUserId } });

    // Base Query: Exclude self
    const whereInput: Prisma.ProfileWhereInput = {
      AND: [
        viewer ? { id: { not: viewer.id } } : {},
      ]
    };

    const andConditions = whereInput.AND as Prisma.ProfileWhereInput[];

    // 1. Text Search (Username/Name)
    if (query) {
      andConditions.push({
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { fullName: { contains: query, mode: 'insensitive' } },
        ],
      });
    }

    // 2. Genre Filter (Find users who have books of this genre)
    if (filters?.genre) {
       andConditions.push({
         bookshelfItems: {
           some: {
             book: {
               genres: { has: filters.genre } // Requires PostgreSQL array support
             }
           }
         }
       });
    }

    // 3. Book Filter (Find users reading/read a specific book title)
    if (filters?.book) {
       andConditions.push({
         bookshelfItems: {
           some: {
             book: {
               title: { contains: filters.book, mode: 'insensitive' }
             }
           }
         }
       });
    }

    const profiles = await this.prisma.profile.findMany({
      where: whereInput,
      select: {
        id: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
        _count: { select: { following: true, followedBy: true } }
      },
      take: 20,
    });

    if (!viewer) return profiles;

    const following = await this.prisma.userFollow.findMany({
      where: {
        followerId: viewer.id,
        followingId: { in: profiles.map(p => p.id) }
      }
    });

    const followingIds = new Set(following.map(f => f.followingId));

    return profiles.map(profile => ({
      ...profile,
      isFollowing: followingIds.has(profile.id)
    }));
  }
}