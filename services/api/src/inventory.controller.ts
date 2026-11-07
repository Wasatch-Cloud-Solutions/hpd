import {
  Body,
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Delete,
  ForbiddenException,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from "class-validator";
import { MembershipRole, Prisma, Role, TransactionType } from "@prisma/client";
import { AuthenticatedUser, CurrentUser, JwtAuthGuard } from "./auth";
import { PrismaService } from "./prisma.service";
import { notificationAllowed } from "./notification-preferences";

class CreateInventoryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  unit!: string;

  @IsArray()
  @IsUUID("4", { each: true })
  teamIds!: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumStock?: number;

  @IsOptional()
  @IsString()
  supplier?: string;
}

class AdjustInventoryDto {
  @IsNumber()
  amount!: number;

  @IsUUID("4")
  teamId!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  allowNegative = false;
}

class SetQuantityDto {
  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsUUID("4")
  teamId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdateInventoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  teamIds?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumStock?: number;

  @IsOptional()
  @IsString()
  supplier?: string;
}

@UseGuards(JwtAuthGuard)
@Controller("inventory")
export class InventoryController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query("teamId") teamId?: string,
    @Query("search") search?: string,
    @Query("lowStock") lowStock?: string,
    @Query("uncounted") uncounted?: string,
  ) {
    const teamFilter: Prisma.InventoryItemWhereInput = {};
    if (teamId) {
      teamFilter.teams = { some: { teamId } };
    } else if (user.role !== Role.ADMINISTRATOR) {
      teamFilter.teams = { some: { team: { memberships: { some: { userId: user.id } } } } };
    }
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        isArchived: false,
        ...teamFilter,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        ...(uncounted === "true" ? { quantity: null } : {}),
      },
      include: { teams: { include: { team: { select: { id: true, name: true } } } } },
      orderBy: { name: "asc" },
      take: 100,
    });
    const visible = lowStock === "true"
      ? items.filter((item) => item.quantity !== null && item.minimumStock !== null && item.quantity.lessThanOrEqualTo(item.minimumStock))
      : items;
    if (teamId) await this.requireTeamMember(user, teamId);
    return visible;
  }

  @Post()
  async create(@Body() body: CreateInventoryDto, @CurrentUser() user: AuthenticatedUser) {
    const teamIds = [...new Set(body.teamIds)];
    for (const id of teamIds) await this.requireTeamMember(user, id);
    if (teamIds.length === 0) throw new BadRequestException("At least one team is required");

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          name: body.name.trim(),
          description: body.description,
          category: body.category,
          sku: body.sku,
          unit: body.unit,
          quantity: body.quantity,
          minimumStock: body.minimumStock,
          supplier: body.supplier,
          createdById: user.id,
          updatedById: user.id,
          teams: { create: teamIds.map((teamId) => ({ teamId })) },
        },
        include: { teams: { include: { team: true } } },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "inventory.created",
          entityType: "inventory_item",
          entityId: item.id,
          newValues: { name: item.name, unit: item.unit, quantity: body.quantity ?? null, teamIds },
        },
      });
      await tx.outboxEvent.createMany({
        data: teamIds.map((teamId) => ({
          eventType: "InventoryItemCreated",
          aggregateId: item.id,
          payload: { itemId: item.id, teamId },
        })),
      });
      if (body.quantity !== undefined) {
        await tx.inventoryTransaction.create({
          data: {
            inventoryItemId: item.id,
            userId: user.id,
            teamId: teamIds[0],
            previousQuantity: null,
            newQuantity: body.quantity,
            transactionType: TransactionType.INITIAL_COUNT,
            idempotencyKey: crypto.randomUUID(),
          },
        });
        const minimum = item.minimumStock?.toNumber();
        if (minimum !== undefined && body.quantity <= minimum) {
          const members = await tx.teamMembership.findMany({
            where: { teamId: teamIds[0], userId: { not: user.id } },
            select: { userId: true, user: { select: { preferences: true } } },
          });
          const recipients = members.filter((member) => notificationAllowed(member.user.preferences, "lowStock"));
          if (recipients.length) {
            await tx.notification.createMany({
              data: recipients.map(({ userId }) => ({
                userId,
                teamId: teamIds[0],
                notificationType: "LOW_STOCK",
                title: `Low stock: ${item.name}`,
                body: `${body.quantity} ${item.unit} available.`,
                relatedEntityId: item.id,
              })),
            });
          }
        }
      }
      return item;
    });
  }

  @Get(":id/history")
  async history(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const item = await this.getAccessibleItem(id, user);
    return this.prisma.inventoryTransaction.findMany({
      where: { inventoryItemId: item.id },
      include: { user: { select: { id: true, fullName: true } }, team: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  @Get(":id")
  async get(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.getAccessibleItem(id, user);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() body: UpdateInventoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const item = await this.getAccessibleItem(id, user);
    if (body.teamIds) {
      if (body.teamIds.length === 0) throw new BadRequestException("Assign the item to at least one team");
      for (const teamId of body.teamIds) await this.requireTeamMember(user, teamId);
    }
    const { teamIds, ...fields } = body;
    return this.prisma.$transaction(async (tx) => {
      if (teamIds) {
        await tx.inventoryTeamAssignment.deleteMany({ where: { inventoryItemId: item.id } });
        await tx.inventoryTeamAssignment.createMany({
          data: [...new Set(teamIds)].map((teamId) => ({ inventoryItemId: item.id, teamId })),
        });
      }
      const updated = await tx.inventoryItem.update({
        where: { id: item.id },
        data: { ...fields, updatedById: user.id },
        include: { teams: { include: { team: true } } },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "inventory.updated",
          entityType: "inventory_item",
          entityId: item.id,
          previousValues: {
            name: item.name,
            unit: item.unit,
            minimumStock: item.minimumStock?.toNumber() ?? null,
          },
          newValues: {
            name: updated.name,
            unit: updated.unit,
            minimumStock: updated.minimumStock?.toNumber() ?? null,
            teamIds: teamIds ? [...new Set(teamIds)] : item.teams.map((assignment) => assignment.teamId),
          },
        },
      });
      await tx.outboxEvent.createMany({
        data: updated.teams.map(({ teamId }) => ({
          eventType: "InventoryItemUpdated",
          aggregateId: item.id,
          payload: { itemId: item.id, teamId },
        })),
      });
      return updated;
    });
  }

  @Delete(":id")
  async archive(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const item = await this.getAccessibleItem(id, user);
    if (user.role === Role.EMPLOYEE) throw new ForbiddenException("Manager access required to archive inventory");
    return this.prisma.$transaction(async (tx) => {
      const archived = await tx.inventoryItem.update({
        where: { id: item.id },
        data: { isArchived: true, updatedById: user.id },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "inventory.archived",
          entityType: "inventory_item",
          entityId: id,
          previousValues: { isArchived: false },
          newValues: { isArchived: true },
        },
      });
      await tx.outboxEvent.createMany({
        data: item.teams.map(({ teamId }) => ({
          eventType: "InventoryItemArchived",
          aggregateId: id,
          payload: { itemId: id, teamId },
        })),
      });
      await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: id,
          userId: user.id,
          transactionType: TransactionType.ITEM_ARCHIVED,
          previousQuantity: item.quantity,
          newQuantity: item.quantity,
          idempotencyKey: crypto.randomUUID(),
        },
      });
      return archived;
    });
  }

  @Post(":id/adjust")
  async adjust(
    @Param("id") id: string,
    @Body() body: AdjustInventoryDto,
    @Headers("idempotency-key") idempotencyKey: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.changeQuantity(id, body.teamId, body.notes, idempotencyKey, user, body.amount, body.allowNegative);
  }

  @Post(":id/set-quantity")
  async setQuantity(
    @Param("id") id: string,
    @Body() body: SetQuantityDto,
    @Headers("idempotency-key") idempotencyKey: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const item = await this.getAccessibleItem(id, user);
    const previous = item.quantity?.toNumber() ?? null;
    const amount = previous === null ? body.quantity : body.quantity - previous;
    return this.changeQuantity(id, body.teamId, body.notes, idempotencyKey, user, amount, false, body.quantity);
  }

  private async changeQuantity(
    id: string,
    teamId: string,
    notes: string | undefined,
    key: string,
    user: AuthenticatedUser,
    amount: number,
    allowNegative = false,
    exactQuantity?: number,
  ) {
    if (!key || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) {
      throw new BadRequestException("A UUID Idempotency-Key header is required");
    }
    await this.requireTeamMember(user, teamId);
    await this.getAccessibleItem(id, user);
    const previousTransaction = await this.prisma.inventoryTransaction.findUnique({
      where: { idempotencyKey: key },
      include: { item: true },
    });
    if (previousTransaction) {
      if (
        previousTransaction.inventoryItemId !== id ||
        previousTransaction.userId !== user.id ||
        previousTransaction.teamId !== teamId
      ) {
        throw new ConflictException("This idempotency key was already used for another operation");
      }
      return previousTransaction.item;
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM inventory_items WHERE id = ${id}::uuid FOR UPDATE`;
      const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id } });
      if (item.isArchived) throw new BadRequestException("Archived inventory cannot be adjusted");
      const existing = await tx.inventoryTransaction.findUnique({
        where: { idempotencyKey: key },
        include: { item: true },
      });
      if (existing) {
        if (existing.inventoryItemId !== id || existing.userId !== user.id || existing.teamId !== teamId) {
          throw new ConflictException("This idempotency key was already used for another operation");
        }
        return existing.item;
      }
      const assignment = await tx.inventoryTeamAssignment.findUnique({
        where: { inventoryItemId_teamId: { inventoryItemId: id, teamId } },
      });
      if (!assignment) throw new ForbiddenException("Item is not assigned to the selected team");
      const oldQuantity = item.quantity?.toNumber() ?? null;
      if (oldQuantity === null && exactQuantity === undefined) {
        throw new BadRequestException("Set an initial count before adjusting an uncounted item");
      }
      const next = exactQuantity ?? (oldQuantity as number) + amount;
      const appliedAmount = oldQuantity === null ? null : next - oldQuantity;
      const mayAllowNegative = user.role === Role.MANAGER || user.role === Role.ADMINISTRATOR;
      if (next < 0 && !(allowNegative && mayAllowNegative)) {
        throw new BadRequestException("Inventory quantity cannot be negative");
      }
      const updated = await tx.inventoryItem.update({
        where: { id },
        data: { quantity: new Prisma.Decimal(next), updatedById: user.id },
        include: { teams: { include: { team: true } } },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: exactQuantity === undefined ? "inventory.adjusted" : "inventory.quantity_set",
          entityType: "inventory_item",
          entityId: id,
          previousValues: { quantity: oldQuantity },
          newValues: { quantity: next },
        },
      });
      await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: id,
          userId: user.id,
          teamId,
          previousQuantity: oldQuantity === null ? null : new Prisma.Decimal(oldQuantity),
          newQuantity: new Prisma.Decimal(next),
          adjustmentAmount: appliedAmount,
          transactionType:
            oldQuantity === null
              ? TransactionType.INITIAL_COUNT
              : exactQuantity !== undefined
              ? TransactionType.MANUAL_CORRECTION
              : amount >= 0
                ? TransactionType.ADDITION
                : TransactionType.REMOVAL,
          notes,
          idempotencyKey: key,
        },
      });
      const minimum = item.minimumStock?.toNumber();
      const crossedLowStock = minimum !== undefined && next <= minimum && (oldQuantity === null || oldQuantity > minimum);
      const members = await tx.teamMembership.findMany({
        where: { teamId, userId: { not: user.id } },
        select: { userId: true, user: { select: { preferences: true } } },
      });
      const category = crossedLowStock ? "lowStock" : "inventory";
      const recipients = members.filter((member) => notificationAllowed(member.user.preferences, category));
      await tx.outboxEvent.create({
        data: {
          eventType: "InventoryQuantityAdjusted",
          aggregateId: id,
          payload: {
            itemId: id,
            teamId,
            quantity: next,
            unit: item.unit,
            userIds: recipients.map(({ userId }) => userId),
          },
        },
      });
      if (recipients.length) {
        await tx.notification.createMany({
          data: recipients.map(({ userId }) => ({
            userId,
            teamId,
            notificationType: crossedLowStock ? "LOW_STOCK" : "INVENTORY_CHANGE",
            title: crossedLowStock ? `Low stock: ${item.name}` : "Inventory updated",
            body: `${item.name}: ${oldQuantity ?? "Not Counted"} → ${next} ${item.unit}`,
            relatedEntityId: id,
          })),
        });
      }
      if (crossedLowStock) {
        await tx.outboxEvent.create({
          data: {
            eventType: "LowStockDetected",
            aggregateId: id,
            payload: { teamId, itemId: id, quantity: next, unit: item.unit },
          },
        });
      }
      return updated;
    });
  }

  private async getAccessibleItem(id: string, user: AuthenticatedUser) {
    const item = await this.prisma.inventoryItem.findFirstOrThrow({
      where: { id, isArchived: false },
      include: { teams: { include: { team: { select: { id: true, name: true } } } } },
    });
    if (user.role !== Role.ADMINISTRATOR) {
      const memberships = await this.prisma.teamMembership.findMany({ where: { userId: user.id } });
      if (!item.teams.some((assignment) => memberships.some((membership) => membership.teamId === assignment.teamId))) {
        throw new ForbiddenException("You cannot access this inventory item");
      }
    }
    return item;
  }

  private async requireTeamMember(user: AuthenticatedUser, teamId: string): Promise<void> {
    const team = await this.prisma.team.findUnique({ where: { id: teamId }, select: { isActive: true } });
    if (!team?.isActive) throw new ForbiddenException("Active team membership is required");
    if (user.role === Role.ADMINISTRATOR) return;
    const membership = await this.prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId: user.id, teamId } },
    });
    if (!membership) throw new ForbiddenException("Team membership required");
    if (
      user.role === Role.MANAGER &&
      membership.membershipRole !== MembershipRole.MANAGER
    ) {
      throw new ForbiddenException("Manager access to this team is required");
    }
  }
}
