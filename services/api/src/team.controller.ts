import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  BadRequestException,
  UseGuards,
} from "@nestjs/common";
import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from "class-validator";
import { MembershipRole, Role } from "@prisma/client";
import { AuthenticatedUser, CurrentUser, JwtAuthGuard } from "./auth";
import { PrismaService } from "./prisma.service";
import { notificationAllowed } from "./notification-preferences";

class CreateTeamDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  description = "";
}

class MembershipDto {
  @IsUUID("4")
  userId!: string;

  @IsEnum(MembershipRole)
  membershipRole: MembershipRole = MembershipRole.MEMBER;
}

class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

@UseGuards(JwtAuthGuard)
@Controller("teams")
export class TeamController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const where =
      user.role === Role.ADMINISTRATOR
        ? { isActive: true }
        : { isActive: true, memberships: { some: { userId: user.id } } };
    return this.prisma.team.findMany({
      where,
      include: { _count: { select: { memberships: true, messages: true } } },
      orderBy: { name: "asc" },
    });
  }

  @Get(":id")
  async get(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const team = await this.prisma.team.findUniqueOrThrow({
      where: { id },
      include: { memberships: { include: { user: { select: { id: true, fullName: true, role: true } } } } },
    });
    await this.requireMemberOrAdmin(user, id);
    return team;
  }

  @Post()
  async create(@Body() body: CreateTeamDto, @CurrentUser() user: AuthenticatedUser) {
    this.requireManager(user);
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: { name: body.name.trim(), description: body.description, createdById: user.id },
      });
      if (user.role === Role.MANAGER) {
        await tx.teamMembership.create({
          data: { userId: user.id, teamId: team.id, membershipRole: MembershipRole.MANAGER },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "team.created",
          entityType: "team",
          entityId: team.id,
          newValues: { name: team.name, description: team.description },
        },
      });
      return team;
    });
  }

  @Patch(":id")
  async update(
    @Param("id") teamId: string,
    @Body() body: UpdateTeamDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.requireTeamManager(user, teamId);
    const previous = await this.prisma.team.findUniqueOrThrow({ where: { id: teamId } });
    const updated = await this.prisma.$transaction(async (tx) => {
      const team = await tx.team.update({
        where: { id: teamId },
        data: { ...body, name: body.name?.trim() },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "team.updated",
          entityType: "team",
          entityId: teamId,
          previousValues: { name: previous.name, description: previous.description },
          newValues: { name: team.name, description: team.description },
        },
      });
      return team;
    });
    return updated;
  }

  @Post(":id/members")
  async addMember(
    @Param("id") teamId: string,
    @Body() body: MembershipDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.requireTeamManager(user, teamId);
    const membership = await this.prisma.$transaction(async (tx) => {
      const target = await tx.user.findUniqueOrThrow({ where: { id: body.userId } });
      if (target.accountStatus !== "ACTIVE") throw new BadRequestException("Only active users can be assigned");
      const result = await tx.teamMembership.upsert({
        where: { userId_teamId: { userId: body.userId, teamId } },
        update: { membershipRole: body.membershipRole },
        create: { userId: body.userId, teamId, membershipRole: body.membershipRole },
      });
      if (notificationAllowed(target.preferences, "teamMembership")) {
        await tx.notification.create({
          data: {
            userId: body.userId,
            teamId,
            notificationType: "TEAM_MEMBERSHIP",
            title: "Team assignment updated",
            body: "You have been added to a team.",
          },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "team.member_added",
          entityType: "team",
          entityId: teamId,
          newValues: { userId: body.userId, membershipRole: body.membershipRole },
        },
      });
      return result;
    });
    return membership;
  }

  @Delete(":id/members/:userId")
  async removeMember(
    @Param("id") teamId: string,
    @Param("userId") userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.requireTeamManager(user, teamId);
    await this.prisma.$transaction(async (tx) => {
      await tx.teamMembership.delete({
        where: { userId_teamId: { userId, teamId } },
      });
      const target = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { preferences: true } });
      if (notificationAllowed(target.preferences, "teamMembership")) {
        await tx.notification.create({
          data: {
            userId,
            teamId,
            notificationType: "TEAM_MEMBERSHIP",
            title: "Team assignment updated",
            body: "You have been removed from a team.",
          },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "team.member_removed",
          entityType: "team",
          entityId: teamId,
          previousValues: { userId },
        },
      });
    });
    return { success: true };
  }

  @Delete(":id")
  async archive(@Param("id") teamId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.requireTeamManager(user, teamId);
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.update({ where: { id: teamId }, data: { isActive: false } });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "team.archived",
          entityType: "team",
          entityId: teamId,
          previousValues: { isActive: true },
          newValues: { isActive: false },
        },
      });
      return team;
    });
  }

  private requireManager(user: AuthenticatedUser): void {
    if (user.role !== Role.MANAGER && user.role !== Role.ADMINISTRATOR) {
      throw new ForbiddenException("Manager access required");
    }
  }

  private async requireTeamManager(user: AuthenticatedUser, teamId: string): Promise<void> {
    if (user.role === Role.ADMINISTRATOR) {
      const team = await this.prisma.team.findUnique({ where: { id: teamId }, select: { isActive: true } });
      if (!team?.isActive) throw new ForbiddenException("Team is not active");
      return;
    }
    if (user.role !== Role.MANAGER) {
      throw new ForbiddenException("Manager access required");
    }
    const membership = await this.prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId: user.id, teamId } },
    });
    const team = await this.prisma.team.findUnique({ where: { id: teamId }, select: { isActive: true } });
    if (!team?.isActive || !membership || membership.membershipRole !== MembershipRole.MANAGER) {
      throw new ForbiddenException("You do not manage this team");
    }
  }

  private async requireMemberOrAdmin(user: AuthenticatedUser, teamId: string): Promise<void> {
    const team = await this.prisma.team.findUnique({ where: { id: teamId }, select: { isActive: true } });
    if (!team?.isActive) throw new ForbiddenException("Team is not active");
    if (user.role === Role.ADMINISTRATOR) return;
    const membership = await this.prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId: user.id, teamId } },
    });
    if (!membership) throw new ForbiddenException("Team membership required");
  }
}
