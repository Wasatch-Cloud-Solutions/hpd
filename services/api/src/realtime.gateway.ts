import { OnModuleDestroy } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AccountStatus, MembershipRole, Role } from "@prisma/client";
import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { AuthenticatedUser } from "./auth";
import { PrismaService } from "./prisma.service";

@WebSocketGateway({ cors: { origin: true } })
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  server!: Server;

  private redisClients: Array<{ quit: () => Promise<unknown> }> = [];

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async afterInit(server: Server): Promise<void> {
    server.use((socket, next) => {
      void this.authenticate(socket).then(
        () => next(),
        () => next(new Error("Unauthorized")),
      );
    });
    const url = this.config.get<string>("REDIS_URL");
    if (!url) return;
    const publisher = createClient({ url });
    const subscriber = publisher.duplicate();
    try {
      await Promise.all([publisher.connect(), subscriber.connect()]);
      server.adapter(createAdapter(publisher, subscriber));
      this.redisClients = [publisher, subscriber];
    } catch {
      await Promise.allSettled([publisher.quit(), subscriber.quit()]);
      console.error("Redis Socket.IO adapter could not connect; using single-instance sockets. Check REDIS_URL and Redis health.");
    }
  }

  async handleConnection(socket: Socket): Promise<void> {
    const user = socket.data.user as AuthenticatedUser | undefined;
    if (user) {
      await this.prisma.user.updateMany({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      });
      await socket.join(`user:${user.id}`);
    }
  }

  private async authenticate(socket: Socket): Promise<void> {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string") throw new Error("Missing access token");
    const claims = await this.jwt.verifyAsync<AuthenticatedUser>(token, {
      secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
    const user = await this.prisma.user.findUnique({
      where: { id: claims.id },
      select: { id: true, email: true, role: true, accountStatus: true, tokenVersion: true },
    });
    if (
      !user ||
      user.accountStatus !== AccountStatus.ACTIVE ||
      claims.tokenVersion !== user.tokenVersion
    ) {
      throw new Error("Account is inactive or session was revoked");
    }
    socket.data.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    } satisfies AuthenticatedUser;
  }

  async joinTeam(socket: Socket, teamId: string): Promise<boolean> {
    const user = socket.data.user as AuthenticatedUser | undefined;
    if (!user) return false;
    const team = await this.prisma.team.findUnique({ where: { id: teamId }, select: { isActive: true } });
    if (!team?.isActive) return false;
    if (user.role !== Role.ADMINISTRATOR) {
      const membership = await this.prisma.teamMembership.findUnique({
        where: { userId_teamId: { userId: user.id, teamId } },
      });
      if (!membership) return false;
      if (user.role === Role.MANAGER && membership.membershipRole !== MembershipRole.MANAGER) {
        return false;
      }
    }
    await socket.join(`team:${teamId}`);
    return true;
  }

  @SubscribeMessage("team.join")
  async onTeamJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() teamId: string,
  ): Promise<{ joined: boolean }> {
    return { joined: await this.joinTeam(socket, teamId) };
  }

  @SubscribeMessage("team.leave")
  async onTeamLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() teamId: string,
  ): Promise<void> {
    await socket.leave(`team:${teamId}`);
  }

  emitTeamEvent(teamId: string, event: string, payload: unknown): void {
    this.server.to(`team:${teamId}`).emit(event, payload);
  }

  emitUserEvent(userId: string, event: string, payload: unknown): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    const user = socket.data.user as AuthenticatedUser | undefined;
    if (user) {
      await this.prisma.user.updateMany({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled(this.redisClients.map((client) => client.quit()));
  }
}
