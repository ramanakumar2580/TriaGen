import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IncidentsService } from './incidents.service';
import { IncidentsController } from './incidents.controller';
import { IncidentsProcessor } from './incidents.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module'; // ✅ Essential for WebSocket
import { FilesModule } from '../files/files.module';
import { EscalationModule } from '../escalation/escalation.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'incidents',
    }),
    PrismaModule,
    EventsModule, // ✅ Ensures EventsGateway is available
    FilesModule,
    EscalationModule,
  ],
  controllers: [IncidentsController],
  providers: [IncidentsService, IncidentsProcessor],
  exports: [BullModule],
})
export class IncidentsModule {}
