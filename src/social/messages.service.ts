import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  // 1. Send a Message
  async sendMessage(senderId: string, recipientId: string, content: string) {
    // Get internal Profile IDs
    const sender = await this.prisma.profile.findUnique({ where: { userId: senderId } });
    const recipient = await this.prisma.profile.findUnique({ where: { id: recipientId } }); // Expecting Profile ID from UI

    if (!sender || !recipient) throw new Error("User not found");

    return this.prisma.chatMessage.create({
      data: {
        senderId: sender.id,
        recipientId: recipient.id,
        content,
      },
    });
  }

  // 2. Get Chat History with a specific user
  async getMessages(currentUserId: string, otherProfileId: string) {
    const me = await this.prisma.profile.findUnique({ where: { userId: currentUserId } });
    if (!me) return [];

    return this.prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: me.id, recipientId: otherProfileId },
          { senderId: otherProfileId, recipientId: me.id },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // 3. Get Inbox (List of conversations)
  // This is complex in SQL, so we do a simpler approach: 
  // Get all messages involving me, then group by partner in JS.
  async getConversations(currentUserId: string) {
    const me = await this.prisma.profile.findUnique({ where: { userId: currentUserId } });
    if (!me) return [];

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        OR: [{ senderId: me.id }, { recipientId: me.id }],
      },
      include: {
        sender: { select: { id: true, username: true, fullName: true, avatarUrl: true } },
        recipient: { select: { id: true, username: true, fullName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by conversation partner
    const conversationMap = new Map();

    for (const msg of messages) {
      // Determine who the "other" person is
      const isMeSender = msg.senderId === me.id;
      const partner = isMeSender ? msg.recipient : msg.sender;
      
      if (!conversationMap.has(partner.id)) {
        conversationMap.set(partner.id, {
          user: partner,
          lastMessage: msg,
          unreadCount: (!isMeSender && !msg.isRead) ? 1 : 0
        });
      } else {
        // We already have the latest message (because of sort desc), just increment unread
        if (!isMeSender && !msg.isRead) {
            const conv = conversationMap.get(partner.id);
            conv.unreadCount += 1;
        }
      }
    }

    return Array.from(conversationMap.values());
  }
}
