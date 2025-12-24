import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // 🔥 Senior Feature: Add Logger for visibility
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({});
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');
    } catch (error) {
      this.logger.error('❌ Database connection failed', error);
      throw error; // Stop the app if DB is dead
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔌 Database disconnected');
  }
}
