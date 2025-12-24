import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EscalationService } from './escalation.service';
import { EscalationProcessor } from './escalation.processor';
import { EventsModule } from '../events/events.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    // ⚡ Registers the queue for background processing
    BullModule.registerQueue({ name: 'escalation' }),
    EventsModule, // Required to emit "Escalation Alert" sockets
    PrismaModule, // Required to check Incident status
  ],
  providers: [EscalationService, EscalationProcessor],
  // 🔥 Senior Tweak: Export the service so IncidentsController can
  // cancel escalations when an incident is Resolved.
  exports: [EscalationService, BullModule],
})
export class EscalationModule {}
