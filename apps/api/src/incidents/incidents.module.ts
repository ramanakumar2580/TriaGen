// src/incidents/incidents.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IncidentsService } from './incidents.service';
import { IncidentsController } from './incidents.controller';
import { IncidentsProcessor } from './incidents.processor'; // <--- IMPORT THIS
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { FilesModule } from '../files/files.module';
import { EscalationModule } from '../escalation/escalation.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'incidents',
    }),
    PrismaModule,
    EventsModule,
    FilesModule,
    EscalationModule,
  ],
  controllers: [IncidentsController],
  providers: [
    IncidentsService,
    IncidentsProcessor, // <--- REGISTER THIS
  ],
  exports: [BullModule],
})
export class IncidentsModule {}
