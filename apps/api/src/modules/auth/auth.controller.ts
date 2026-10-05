import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TenantContextGuard } from './guards/tenant-context.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser } from './jwt.strategy';
import { Request } from 'express';

interface RequestWithTenant extends Request {
  tenantId?: string | null;
  isImpersonating?: boolean;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and get a new access token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke active refresh tokens and sign out' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LogoutDto,
  ) {
    return this.authService.logout(user.id, dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile and multi-tenant context' })
  async getMe(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithTenant,
  ) {
    const profile = await this.authService.getCurrentUser(user.id);
    return {
      ...profile,
      resolvedTenantId: req.tenantId ?? profile.tenantId,
      isImpersonating: req.isImpersonating ?? false,
    };
  }
}
