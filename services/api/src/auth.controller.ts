import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { IsEmail, IsString, MinLength } from "class-validator";
import { CurrentUser, JwtAuthGuard, AuthenticatedUser } from "./auth";
import { AuthService } from "./auth.service";
import { PrismaService } from "./prisma.service";

class RegisterDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10)
  password!: string;
}

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

class TokenDto {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("register")
  register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  @Post("login")
  login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password);
  }

  @Post("refresh")
  refresh(@Body() body: TokenDto) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post("logout")
  logout(@Body() body: TokenDto) {
    return this.auth.logout(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post("me")
  async me(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        profileImageUrl: true,
        accountStatus: true,
        preferences: true,
        memberships: { include: { team: true } },
      },
    });
    return profile;
  }
}
