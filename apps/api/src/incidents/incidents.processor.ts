// src/incidents/incidents.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { Severity, Status, EventType } from '@prisma/client';

@Processor('incidents')
export class IncidentsProcessor extends WorkerHost {
  private readonly logger = new Logger(IncidentsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {
    super();
  }

  async process(job: Job<{ incidentId: string }>): Promise<any> {
    const { incidentId } = job.data;
    this.logger.debug(`Checking SLA for incident ${incidentId}...`);

    // 1. Fetch current status
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
    });

    // 2. If already resolved/closed, or incident doesn't exist, do nothing
    if (
      !incident ||
      incident.status === Status.RESOLVED ||
      incident.status === Status.CLOSED
    ) {
      return;
    }

    // 3. ESCALATION LOGIC
    // Using ACKNOWLEDGED to match your Prisma Schema Status enum
    if (
      incident.status === Status.OPEN ||
      incident.status === Status.ACKNOWLEDGED
    ) {
      const updated = await this.prisma.incident.update({
        where: { id: incidentId },
        data: {
          severity: Severity.CRITICAL, // Auto-escalate on breach
          version: { increment: 1 }, // Maintain optimistic locking integrity
        },
      });

      // 4. Log the system event
      // Using SYSTEM_ALERT which we added to the EventType enum
      await this.prisma.incidentEvent.create({
        data: {
          incidentId,
          type: EventType.SYSTEM_ALERT,
          message: 'SLA BREACHED: Auto-escalated to CRITICAL severity.',
          userId: incident.reporterId, // Attributed to system process
        },
      });

      // 5. Notify everyone via WebSocket room for this incident
      this.eventsGateway.server
        .to(`incident:${incidentId}`)
        .emit('incident:updated', updated);

      this.logger.warn(
        `SLA BREACH: Incident ${incidentId} escalated to CRITICAL.`,
      );
    }
  }
}
