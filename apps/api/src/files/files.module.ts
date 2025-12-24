import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module'; // 🔥 Required for AuthGuard
import { ConfigModule } from '@nestjs/config'; // 🔥 Good practice for Env vars

@Module({
  imports: [
    PrismaModule,
    AuthModule, // 🛡️ Enables @UseGuards(AuthGuard('jwt')) in Controller
    ConfigModule, // ⚙️ Enables access to environment variables safely
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService], // Exported so other modules can use it (if needed)
})
export class FilesModule {}
