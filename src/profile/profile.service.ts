import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  // Get current user's profile
  async getProfile(userId: string) {
    return this.prisma.profile.findUnique({
      where: { userId },
      include: {
        readingGoal: true,
        _count: { select: { following: true, followedBy: true } },
      },
    });
  }

  // Get public profile by username
  async getPublicProfile(username: string) {
    return this.prisma.profile.findUnique({
      where: { username },
      include: {
        readingGoal: true,
        bookshelfItems: {
            where: { status: 'READ' },
            take: 5,
            include: { book: true }
        },
        _count: { select: { following: true, followedBy: true } },
      },
    });
  }

  // Onboarding / Update Profile
  async updateProfile(userId: string, data: any) {
    // Upsert ensures we create it if it doesn't exist
    return this.prisma.profile.upsert({
      where: { userId },
      update: {
        username: data.username,
        fullName: data.fullName,
        bio: data.bio,
        onboarded: true,
      },
      create: {
        userId,
        username: data.username,
        fullName: data.fullName,
        bio: data.bio,
        onboarded: true,
      },
    });
  }
}
