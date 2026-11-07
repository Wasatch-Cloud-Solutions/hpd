import { Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, CurrentUser, JwtAuthGuard } from "./auth";
import { PrismaService } from "./prisma.service";

@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  @Patch(":id/read")
  async markRead(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { isRead: true },
    });
    return { success: true };
  }

  @Post("read-all")
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return { updated: result.count };
  }
}
