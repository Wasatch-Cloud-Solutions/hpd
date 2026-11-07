import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { MessageType, Role } from "@prisma/client";
import { AuthenticatedUser, CurrentUser, JwtAuthGuard } from "./auth";
import { PrismaService } from "./prisma.service";
import { notificationAllowed } from "./notification-preferences";

class CreateMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;

  @IsOptional()
  @IsString()
  parentMessageId?: string;
}

class UpdateMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;
}

class ReactionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  reaction!: string;
}

@UseGuards(JwtAuthGuard)
@Controller()
export class MessageController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("teams/:id/messages")
  async list(
    @Param("id") teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query("cursor") cursor?: string,
  ) {
    await this.requireMember(user, teamId);
    return this.prisma.message.findMany({
      where: { teamId, deletedAt: null, parentMessageId: null },
      include: {
        sender: { select: { id: true, fullName: true, profileImageUrl: true } },
        _count: { select: { replies: true, reads: true, reactions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
  }

  @Post("teams/:id/messages")
  async create(
    @Param("id") teamId: string,
    @Body() body: CreateMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.requireMember(user, teamId);
    if (body.messageType && body.messageType !== MessageType.GENERAL && user.role === Role.EMPLOYEE) {
      throw new ForbiddenException("Only managers can create announcements or special message types");
    }
    if (body.parentMessageId) {
      const parent = await this.prisma.message.findUniqueOrThrow({ where: { id: body.parentMessageId } });
      if (parent.teamId !== teamId) throw new ForbiddenException("Reply must belong to this team");
    }
    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          teamId,
          senderId: user.id,
          content: body.content.trim(),
          messageType: body.messageType ?? MessageType.GENERAL,
          parentMessageId: body.parentMessageId,
        },
        include: { sender: { select: { id: true, fullName: true, profileImageUrl: true } } },
      });
      const recipients = await tx.teamMembership.findMany({
        where: { teamId, userId: { not: user.id } },
        select: { userId: true, user: { select: { preferences: true } } },
      });
      const category = created.messageType === MessageType.ANNOUNCEMENT || created.messageType === MessageType.URGENT
        ? "announcements"
        : "messages";
      const eligibleRecipients = recipients.filter((recipient) =>
        notificationAllowed(recipient.user.preferences, category),
      );
      await tx.outboxEvent.create({
        data: {
          eventType: "MessageCreated",
          aggregateId: created.id,
          payload: {
            teamId,
            message: created,
            userIds: eligibleRecipients.map(({ userId }) => userId),
          },
        },
      });
      if (eligibleRecipients.length) {
        await tx.notification.createMany({
          data: eligibleRecipients.map(({ userId }) => ({
            userId,
            teamId,
            notificationType:
              created.messageType === MessageType.ANNOUNCEMENT || created.messageType === MessageType.URGENT
                ? "ANNOUNCEMENT" as const
                : "MESSAGE" as const,
            title: created.messageType === MessageType.URGENT ? "Urgent team update" : "New team message",
            body: created.content.slice(0, 240),
            relatedEntityId: created.id,
          })),
        });
      }
      return created;
    });
    return message;
  }

  @Get("messages/:id/replies")
  async replies(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const message = await this.prisma.message.findUniqueOrThrow({ where: { id } });
    await this.requireMember(user, message.teamId);
    return this.prisma.message.findMany({
      where: { parentMessageId: id, deletedAt: null },
      include: { sender: { select: { id: true, fullName: true, profileImageUrl: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  @Patch("messages/:id")
  async update(
    @Param("id") id: string,
    @Body() body: UpdateMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const message = await this.prisma.message.findUniqueOrThrow({ where: { id } });
    await this.requireMember(user, message.teamId);
    if (message.senderId !== user.id && user.role !== Role.MANAGER && user.role !== Role.ADMINISTRATOR) {
      throw new ForbiddenException("You can only edit your own messages");
    }
    const updated = await this.prisma.message.update({
      where: { id },
      data: { content: body.content.trim(), editedAt: new Date() },
    });
    await this.prisma.outboxEvent.create({
      data: {
        eventType: "MessageUpdated",
        aggregateId: id,
        payload: { teamId: message.teamId, messageId: id, content: updated.content },
      },
    });
    return updated;
  }

  @Post("messages/:id/pin")
  async togglePin(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const message = await this.prisma.message.findUniqueOrThrow({ where: { id } });
    await this.requireMember(user, message.teamId);
    if (user.role === Role.EMPLOYEE) throw new ForbiddenException("Manager access required");
    const updated = await this.prisma.message.update({
      where: { id },
      data: { isPinned: !message.isPinned },
    });
    await this.prisma.outboxEvent.create({
      data: {
        eventType: "MessageUpdated",
        aggregateId: id,
        payload: { teamId: message.teamId, messageId: id, isPinned: updated.isPinned },
      },
    });
    return updated;
  }

  @Post("messages/:id/read")
  async markRead(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const message = await this.prisma.message.findUniqueOrThrow({ where: { id } });
    await this.requireMember(user, message.teamId);
    await this.prisma.messageRead.upsert({
      where: { messageId_userId: { messageId: id, userId: user.id } },
      update: { readAt: new Date() },
      create: { messageId: id, userId: user.id },
    });
    return { success: true };
  }

  @Post("messages/:id/reactions")
  async toggleReaction(
    @Param("id") id: string,
    @Body() body: ReactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const message = await this.prisma.message.findUniqueOrThrow({ where: { id } });
    await this.requireMember(user, message.teamId);
    const where = {
      messageId_userId_reaction: { messageId: id, userId: user.id, reaction: body.reaction },
    };
    const existing = await this.prisma.messageReaction.findUnique({ where });
    if (existing) {
      await this.prisma.messageReaction.delete({ where: { id: existing.id } });
      return { active: false };
    }
    await this.prisma.messageReaction.create({ data: { messageId: id, userId: user.id, reaction: body.reaction } });
    return { active: true };
  }

  @Delete("messages/:id")
  async remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const message = await this.prisma.message.findUniqueOrThrow({ where: { id } });
    await this.requireMember(user, message.teamId);
    if (message.senderId !== user.id && user.role === Role.EMPLOYEE) {
      throw new ForbiddenException("You can only delete your own messages");
    }
    await this.prisma.message.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.prisma.outboxEvent.create({
      data: {
        eventType: "MessageUpdated",
        aggregateId: id,
        payload: { teamId: message.teamId, messageId: id, deleted: true },
      },
    });
    return { success: true };
  }

  private async requireMember(user: AuthenticatedUser, teamId: string): Promise<void> {
    if (user.role === Role.ADMINISTRATOR) return;
    const membership = await this.prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId: user.id, teamId } },
    });
    if (!membership) throw new ForbiddenException("Team membership required");
  }
}
