import { Controller, Post, Body, UseGuards, Get, Headers, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, ResetPasswordDto, ConfirmPasswordResetDto } from './dto/auth.dto';
import { JwtGuard } from './guards/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('validate')
  @UseGuards(JwtGuard)
  async validate(@Headers('authorization') authHeader: string) {
    if (!authHeader) {
      throw new BadRequestException('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const user = await this.authService.validateToken(token);

    return { user };
  }

  @Post('password-reset/request')
  async requestPasswordReset(@Body() dto: ResetPasswordDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password-reset/confirm')
  async confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    return this.authService.confirmPasswordReset(dto);
  }
}
