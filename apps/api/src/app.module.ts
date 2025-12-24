// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'; // <--- Added for Rate Limiting
import { APP_GUARD } from '@nestjs/core'; // <--- Added to apply guard globally
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { IncidentsModule } from './incidents/incidents.module';
import { EventsModule } from './events/events.module';
import { EscalationModule } from './escalation/escalation.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    // 1. Load Environment Variables
    ConfigModule.forRoot({ isGlobal: true }),

    // 2. Configure Global Rate Limiting
    // This allows a maximum of 20 requests every 60 seconds per IP address
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 20,
      },
    ]),

    // 3. Configure Redis Connection for Background Jobs (BullMQ)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST') || 'localhost',
          port: Number(configService.get('REDIS_PORT')) || 6379,
        },
      }),
      inject: [ConfigService],
    }),

    // 4. Feature Modules
    PrismaModule,
    AuthModule,
    IncidentsModule,
    EventsModule,
    EscalationModule,
    FilesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 5. Apply the Rate Limit Guard to every single endpoint automatically
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
