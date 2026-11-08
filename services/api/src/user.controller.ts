import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AccountStatus, Prisma, Role } from "@prisma/client";
import { IsEnum, IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { AuthenticatedUser, CurrentUser, JwtAuthGuard } from "./auth";
import { PrismaService } from "./prisma.service";

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  fullName?: string;

  @IsOptional()
  @IsString()
  profileImageUrl?: string;

  @IsOptional()
  @IsObject()
  preferences?: Prisma.InputJsonObject;
}

class UpdateStatusDto {
  @IsEnum(AccountStatus)
  accountStatus!: AccountStatus;
}

class UpdateRoleDto {
  @IsEnum(Role)
  role!: Role;
}

@UseGuards(JwtAuthGuard)
@Controller("users")
export class UserController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("me")
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        profileImageUrl: true,
        accountStatus: true,
        preferences: true,
        memberships: { include: { team: { select: { id: true, name: true } } } },
      },
    });
  }

  @Patch("me")
  async updateProfile(
    @Body() body: UpdateProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.prisma.user.update({
      where: { id: user.id },
      data: body,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        profileImageUrl: true,
        preferences: true,
      },
    });
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query("search") search?: string,
  ) {
    if (user.role === Role.EMPLOYEE) {
      throw new ForbiddenException("Employee directory access requires manager privileges");
    }
    const managedTeamScope: Prisma.UserWhereInput =
      user.role === Role.MANAGER
        ? {
            OR: [
              { memberships: { none: {} } },
              {
                memberships: {
                  some: {
                    team: {
                      memberships: {
                        some: { userId: user.id, membershipRole: "MANAGER" },
                      },
                    },
                  },
                },
              },
            ],
          }
        : {};
    return this.prisma.user.findMany({
      where: {
        ...managedTeamScope,
        ...(search ? { fullName: { contains: search, mode: "insensitive" as const } } : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        accountStatus: true,
        lastActiveAt: true,
        memberships: { include: { team: { select: { id: true, name: true } } } },
      },
      orderBy: { fullName: "asc" },
      take: 100,
    });
  }

  @Patch(":id/status")
  async status(
    @Param("id") id: string,
    @Body() body: UpdateStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.role !== Role.ADMINISTRATOR) throw new ForbiddenException("Administrator access required");
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { accountStatus: body.accountStatus, tokenVersion: { increment: 1 } },
        select: { id: true, fullName: true, email: true, accountStatus: true },
      });
      if (body.accountStatus !== AccountStatus.ACTIVE) {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "user.status_changed",
          entityType: "user",
          entityId: id,
          newValues: { accountStatus: body.accountStatus },
        },
      });
      return updated;
    });
  }

  @Patch(":id/role")
  async role(
    @Param("id") id: string,
    @Body() body: UpdateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.role !== Role.ADMINISTRATOR) throw new ForbiddenException("Administrator access required");
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { role: body.role, tokenVersion: { increment: 1 } },
        select: { id: true, fullName: true, email: true, role: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "user.role_changed",
          entityType: "user",
          entityId: id,
          newValues: { role: body.role },
        },
      });
      return updated;
    });
  }
}
