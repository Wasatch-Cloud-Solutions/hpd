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
          const eventNames: Record<string, string> = {
            MessageCreated: "message.created",
            MessageUpdated: "message.updated",
            InventoryItemCreated: "inventory.created",
            InventoryItemUpdated: "inventory.updated",
            InventoryQuantityAdjusted: "inventory.updated",
            InventoryItemArchived: "inventory.archived",
          };
          const eventName = eventNames[event.eventType] ?? "event";
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
      const errorType = error instanceof Error ? error.name : "UnknownError";
      console.error(`Outbox publication failed (${errorType}); pending events will be retried.`);
    } finally {
      this.running = false;
    }
  }
}
