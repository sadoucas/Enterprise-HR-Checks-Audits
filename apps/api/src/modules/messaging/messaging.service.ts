import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SendMessageDto, MarkAsReadDto, MarkAsDeliveredDto, ReplyToMessageDto } from './dto';

@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Send a message to one or multiple recipients
   */
  async sendMessage(dto: SendMessageDto) {
    // Validate sender exists
    const sender = await this.prisma.user.findUnique({
      where: { id: dto.senderId },
    });

    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    // Validate all recipients exist
    const recipients = await this.prisma.user.findMany({
      where: { id: { in: dto.recipientIds } },
    });

    if (recipients.length !== dto.recipientIds.length) {
      throw new NotFoundException('One or more recipients not found');
    }

    // Remove duplicates from recipientIds
    const uniqueRecipientIds = Array.from(new Set(dto.recipientIds));

    // Create message
    const message = await this.prisma.message.create({
      data: {
        content: dto.content,
        subject: dto.subject,
        senderId: dto.senderId,
        messageType: dto.messageType || 'GENERAL',
        priority: dto.priority || 'MEDIUM',
        attachments: dto.attachments ? JSON.stringify(dto.attachments) : null,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create message recipients
    const messageRecipients = await Promise.all(
      uniqueRecipientIds.map(recipientId =>
        this.prisma.messageRecipient.create({
          data: {
            messageId: message.id,
            recipientId,
            deliveredAt: new Date(), // Instant delivery
            deliveryStatus: 'DELIVERED',
          },
        })
      )
    );

    return {
      ...message,
      recipients: messageRecipients.length,
      status: 'DELIVERED',
    };
  }

  /**
   * Get inbox for a user
   */
  async getInbox(userId: string, limit = 50, offset = 0) {
    // Verify user exists
    await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const messages = await this.prisma.messageRecipient.findMany({
      where: { recipientId: userId },
      include: {
        message: {
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            replies: {
              include: {
                sender: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.messageRecipient.count({
      where: { recipientId: userId },
    });

    return {
      messages: messages.map(mr => ({
        ...mr.message,
        recipientStatus: {
          isRead: mr.isRead,
          readAt: mr.readAt,
          deliveryStatus: mr.deliveryStatus,
          deliveredAt: mr.deliveredAt,
        },
      })),
      total,
      limit,
      offset,
    };
  }

  /**
   * Get sent messages for a user
   */
  async getSentMessages(userId: string, limit = 50, offset = 0) {
    // Verify user exists
    await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const messages = await this.prisma.message.findMany({
      where: { senderId: userId },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        recipients: {
          include: {
            recipient: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        replies: {
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.message.count({
      where: { senderId: userId },
    });

    return {
      messages: messages.map(m => ({
        ...m,
        recipientCount: m.recipients.length,
        deliveryStats: this.calculateDeliveryStats(m.recipients),
      })),
      total,
      limit,
      offset,
    };
  }

  /**
   * Get a single message
   */
  async getMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        recipients: {
          include: {
            recipient: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        replies: {
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if user has access (sender or recipient)
    const isAuthorized =
      message.senderId === userId ||
      message.recipients.some(r => r.recipientId === userId);

    if (!isAuthorized) {
      throw new BadRequestException('Unauthorized to view this message');
    }

    return message;
  }

  /**
   * Mark messages as read
   */
  async markAsRead(userId: string, dto: MarkAsReadDto) {
    const now = new Date();

    // Update all message recipients
    const updated = await this.prisma.messageRecipient.updateMany(
      {
        where: {
          messageId: { in: dto.messageIds },
          recipientId: userId,
        },
        data: {
          isRead: true,
          readAt: now,
        },
      }
    );

    return {
      markedAsRead: updated.count,
      timestamp: now,
    };
  }

  /**
   * Mark messages as delivered
   */
  async markAsDelivered(userId: string, dto: MarkAsDeliveredDto) {
    const now = new Date();

    const updated = await this.prisma.messageRecipient.updateMany(
      {
        where: {
          messageId: { in: dto.messageIds },
          recipientId: userId,
        },
        data: {
          deliveredAt: now,
          deliveryStatus: 'DELIVERED',
        },
      }
    );

    return {
      markedAsDelivered: updated.count,
      timestamp: now,
    };
  }

  /**
   * Reply to a message
   */
  async replyToMessage(
    messageId: string,
    dto: ReplyToMessageDto
  ) {
    // Get original message
    const originalMessage = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!originalMessage) {
      throw new NotFoundException('Original message not found');
    }

    // Validate sender exists
    const sender = await this.prisma.user.findUnique({
      where: { id: dto.senderId },
    });

    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    // Create reply
    const reply = await this.prisma.messageReply.create({
      data: {
        content: dto.content,
        senderId: dto.senderId,
        messageId,
        attachments: dto.attachments ? JSON.stringify(dto.attachments) : null,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return reply;
  }

  /**
   * Get message statistics
   */
  async getMessageStats(userId?: string) {
    const where = userId ? { senderId: userId } : {};

    const total = await this.prisma.message.count({ where });
    const byType = {
      ALERT: await this.prisma.message.count({
        where: { ...where, messageType: 'ALERT' },
      }),
      NOTIFICATION: await this.prisma.message.count({
        where: { ...where, messageType: 'NOTIFICATION' },
      }),
      WARNING: await this.prisma.message.count({
        where: { ...where, messageType: 'WARNING' },
      }),
      GENERAL: await this.prisma.message.count({
        where: { ...where, messageType: 'GENERAL' },
      }),
    };

    const byPriority = {
      LOW: await this.prisma.message.count({
        where: { ...where, priority: 'LOW' },
      }),
      MEDIUM: await this.prisma.message.count({
        where: { ...where, priority: 'MEDIUM' },
      }),
      HIGH: await this.prisma.message.count({
        where: { ...where, priority: 'HIGH' },
      }),
      URGENT: await this.prisma.message.count({
        where: { ...where, priority: 'URGENT' },
      }),
    };

    return {
      total,
      byType,
      byPriority,
    };
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(userId: string) {
    const unreadCount = await this.prisma.messageRecipient.count({
      where: {
        recipientId: userId,
        isRead: false,
      },
    });

    return {
      userId,
      unreadCount,
    };
  }

  /**
   * Search messages
   */
  async searchMessages(userId: string, query: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          {
            senderId: userId,
            content: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            recipients: {
              some: {
                recipientId: userId,
              },
            },
            content: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            subject: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        recipients: true,
        replies: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return messages;
  }

  /**
   * Get delivery statistics
   */
  private calculateDeliveryStats(recipients: any[]) {
    const delivered = recipients.filter(r => r.deliveryStatus === 'DELIVERED').length;
    const read = recipients.filter(r => r.isRead).length;
    const pending = recipients.filter(r => r.deliveryStatus === 'PENDING').length;

    return {
      total: recipients.length,
      delivered,
      read,
      pending,
      deliveryRate: recipients.length > 0 ? Math.round((delivered / recipients.length) * 100) : 0,
      readRate: recipients.length > 0 ? Math.round((read / recipients.length) * 100) : 0,
    };
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only sender can delete
    if (message.senderId !== userId) {
      throw new BadRequestException('Only sender can delete message');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }
}
