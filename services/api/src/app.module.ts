import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { InventoryController } from "./inventory.controller";
import { MessageController } from "./message.controller";
import { NotificationController } from "./notification.controller";
import { OutboxService } from "./outbox.service";
import { PrismaService } from "./prisma.service";
import { RealtimeGateway } from "./realtime.gateway";
import { TeamController } from "./team.controller";
import { UserController } from "./user.controller";
import { HealthController } from "./health.controller";
import { resolve } from "node:path";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")],
    }),
    JwtModule.register({}),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
  ],
  controllers: [
    AuthController,
    UserController,
    TeamController,
    InventoryController,
    MessageController,
    NotificationController,
    HealthController,
  ],
  providers: [
    PrismaService,
    AuthService,
    RealtimeGateway,
    OutboxService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
