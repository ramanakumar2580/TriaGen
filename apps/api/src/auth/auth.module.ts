import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PassportModule } from '@nestjs/passport'; // 🔥 Standard NestJS Security
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    // 🛡️ Register Passport to handle the "jwt" strategy automatically
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  // 💡 Exporting these allows other modules (like IncidentsModule) to use @UseGuards()
  exports: [PassportModule, JwtModule],
})
export class AuthModule {}
