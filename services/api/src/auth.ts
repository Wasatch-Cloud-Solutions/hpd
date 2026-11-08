import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import { AccountStatus, Role } from "@prisma/client";
import { Request } from "express";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "./prisma.service";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  tokenVersion: number;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);

export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata("roles", roles);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("A bearer access token is required");
    }

    const secret = this.config.getOrThrow<string>("JWT_ACCESS_SECRET");
    let claims: AuthenticatedUser;
    try {
      claims = await this.jwt.verifyAsync<AuthenticatedUser>(
        authorization.slice(7),
        { secret },
      );
    } catch {
      throw new UnauthorizedException("Access token is invalid or expired");
    }
    const currentUser = await this.prisma.user.findUnique({
      where: { id: claims.id },
      select: { id: true, email: true, role: true, accountStatus: true, tokenVersion: true },
    });
    if (!currentUser || currentUser.accountStatus !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException("Account is inactive");
    }
    if (claims.tokenVersion !== currentUser.tokenVersion) {
      throw new UnauthorizedException("Access token has been revoked");
    }
    request.user = {
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
      tokenVersion: currentUser.tokenVersion,
    };
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>("roles", [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return roles.includes(request.user.role);
  }
}
