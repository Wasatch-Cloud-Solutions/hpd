import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { RealtimeGateway } from "./realtime.gateway";

@Injectable()
export class OutboxService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.publishPending(), 1000);
    void this.publishPending();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async publishPending(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const events = await this.prisma.outboxEvent.findMany({
        where: { publishedAt: null },
        orderBy: { createdAt: "asc" },
        take: 100,
      });
      for (const event of events) {
        const payload = event.payload as { teamId?: string; userIds?: string[] };
        if (payload.teamId) {
          const eventName =
            event.eventType === "MessageCreated"
              ? "message.created"
              : event.eventType.startsWith("Message")
                ? "message.updated"
              : event.eventType === "InventoryItemCreated"
                ? "inventory.created"
                : event.eventType === "InventoryItemArchived"
                  ? "inventory.archived"
                : event.eventType === "InventoryItemUpdated"
                  ? "inventory.updated"
              : event.eventType === "InventoryQuantityAdjusted"
                ? "inventory.updated"
                : "event";
          this.realtime.emitTeamEvent(payload.teamId, eventName, event.payload);
        }
        for (const userId of payload.userIds ?? []) {
          this.realtime.emitUserEvent(userId, "notification.created", event.payload);
        }
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { publishedAt: new Date() },
        });
      }
    } catch (error) {
      console.error("Outbox publication failed; pending events will be retried.", error);
    } finally {
      this.running = false;
    }
  }
}
