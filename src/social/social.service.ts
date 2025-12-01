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

    if (!follower || !target) throw new NotFoundException("User not found");
    if (follower.id === target.id) throw new BadRequestException("Cannot follow self");

    try {
      return await this.prisma.userFollow.create({
        data: { followerId: follower.id, followingId: target.id },
      });
    } catch (error: any) {
      if (error.code === 'P2002') throw new BadRequestException('Already following');
      throw error;
    }
  }

  // UPDATED FEED LOGIC: Include 'isLiked' status
  async getFeed(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) return [];

    const reviews = await this.prisma.review.findMany({
      where: {
        profile: {
          followedBy: { some: { followerId: profile.id } }
        }
      },
      include: {
        book: true,
        profile: { select: { id: true, username: true, avatarUrl: true, fullName: true } },
        // Check if current user liked this review
        likedBy: { 
            where: { profileId: profile.id },
            select: { id: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform result to add boolean flag
    return reviews.map(r => ({
        ...r,
        isLiked: r.likedBy.length > 0
    }));
  }

  async getPopular(currentUserId: string) {
     const viewer = await this.prisma.profile.findUnique({ where: { userId: currentUserId } });

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

     // Mock topics for now as grouping is heavy
     const topics = [
         { type: 'genre', label: '#SciFi', value: 'Science Fiction' },
         { type: 'genre', label: '#Fantasy', value: 'Fantasy' },
         { type: 'genre', label: '#ClassicLit', value: 'Classics' },
     ];

     return { users: mappedUsers, topics };
  }

  // --- NEW FEATURES ---

  async toggleLike(userId: string, reviewId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException("Profile not found");

    // Check if already liked
    const existingLike = await this.prisma.reviewLike.findUnique({
      where: {
        profileId_reviewId: {
          profileId: profile.id,
          reviewId: reviewId
        }
      }
    });

    if (existingLike) {
      // UNLIKE
      await this.prisma.$transaction([
        this.prisma.reviewLike.delete({ where: { id: existingLike.id } }),
        this.prisma.review.update({ 
          where: { id: reviewId }, 
          data: { likesCount: { decrement: 1 } } 
        })
      ]);
      return { liked: false };
    } else {
      // LIKE
      await this.prisma.$transaction([
        this.prisma.reviewLike.create({
           data: { profileId: profile.id, reviewId }
        }),
        this.prisma.review.update({ 
          where: { id: reviewId }, 
          data: { likesCount: { increment: 1 } } 
        })
      ]);
      return { liked: true };
    }
  }

  async addComment(userId: string, reviewId: string, content: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException("Profile not found");

    const comment = await this.prisma.comment.create({
      data: {
        content,
        profileId: profile.id,
        reviewId: reviewId
      },
      include: {
        profile: { select: { username: true, avatarUrl: true, fullName: true } }
      }
    });

    // Update counter
    await this.prisma.review.update({
        where: { id: reviewId },
        data: { commentsCount: { increment: 1 } }
    });

    return comment;
  }

  async getComments(reviewId: string) {
    return this.prisma.comment.findMany({
      where: { reviewId },
      include: {
        profile: { select: { username: true, avatarUrl: true, fullName: true } }
      },
      orderBy: { createdAt: 'asc' } // Oldest first
    });
  }
}
