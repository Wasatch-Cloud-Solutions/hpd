import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AccountStatus, Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { PrismaService } from "./prisma.service";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(input: { fullName: string; email: string; password: string }) {
    const email = input.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException("An account with this email already exists");
    }
    const user = await this.prisma.user.create({
      data: {
        fullName: input.fullName.trim(),
        email,
        passwordHash: await bcrypt.hash(input.password, 12),
        role: Role.EMPLOYEE,
      },
      select: { id: true, fullName: true, email: true, role: true },
    });
    return { user, ...(await this.issueTokens(user)) };
  }

  async login(emailInput: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: emailInput.trim().toLowerCase() },
    });
    if (
      !user ||
      user.accountStatus !== AccountStatus.ACTIVE ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      throw new UnauthorizedException("Email or password is incorrect");
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });
    return {
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
      ...(await this.issueTokens(user)),
    };
  }

  async refresh(token: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(token);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt <= new Date() ||
      stored.user.accountStatus !== AccountStatus.ACTIVE
    ) {
      throw new UnauthorizedException("Refresh token is invalid or expired");
    }
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(stored.user);
  }

  async logout(token: string): Promise<{ success: true }> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  private async issueTokens(user: { id: string; email: string; role: Role }): Promise<TokenPair> {
    const payload = { sub: user.id, id: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      expiresIn: "15m",
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      expiresIn: "30d",
    });
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
