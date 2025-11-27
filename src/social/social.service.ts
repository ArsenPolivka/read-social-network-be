import { Injectable } from '@nestjs/common';
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

  // Follow a user
  async followUser(followerUserId: string, targetUsername: string) {
    const follower = await this.prisma.profile.findUnique({ where: { userId: followerUserId } });
    const target = await this.prisma.profile.findUnique({ where: { username: targetUsername } });

    return this.prisma.userFollow.create({
      data: {
        followerId: follower?.id!,
        followingId: target?.id!,
      },
    });
  }

  // Get Feed (Reviews from people you follow)
  async getFeed(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });

    // 1. Safety check: If profile doesn't exist yet, return empty feed
    if (!profile) {
      return [];
    }

    return this.prisma.review.findMany({
      where: {
        profile: {
          followedBy: {
            some: { followerId: profile.id } // Remove the '!'
          }
        }
      },
      include: {
        book: true,
        profile: { select: { username: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
