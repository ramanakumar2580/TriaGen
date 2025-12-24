import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // 🔥 Senior Pattern: Write once, use everywhere
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
