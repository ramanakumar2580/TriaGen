import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  // 🔥 Senior Feature: Audit Logging
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    this.logger.log(`New user registration attempt: ${dto.email}`);
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    this.logger.log(`User login attempt: ${dto.email}`);
    // Note: We never log passwords!
    return this.authService.login(dto);
  }
}
