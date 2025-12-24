import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { Severity, Status, EventType } from '@prisma/client';

@Processor('escalation')
export class EscalationProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {
    super();
  }

  async process(job: Job<{ incidentId: string }>) {
    console.log(
      `🔎 Checking incident ${job.data.incidentId} for escalation...`,
    );

    const incident = await this.prisma.incident.findUnique({
      where: { id: job.data.incidentId },
    });

    // Only escalate if it is still OPEN
    if (incident && incident.status === Status.OPEN) {
      console.log(`⚠️ Escalating Incident ${incident.id}!`);

      // 1. Update Status & Severity in DB
      const updatedIncident = await this.prisma.incident.update({
        where: { id: incident.id },
        data: {
          severity: Severity.CRITICAL, // 🚨 Escalate to Critical
        },
      });

      // 2. Add System Comment
      const systemEvent = await this.prisma.incidentEvent.create({
        data: {
          incidentId: updatedIncident.id,
          userId: incident.reporterId, // Still attributing to reporter for now
          type: EventType.STATUS_CHANGE,
          message:
            '⚠️ Auto-Escalated: No response received within the SLA timeframe.',
        },
        include: { user: { select: { name: true } } },
      });

      // 3. Notify the Incident Room (Chat)
      this.eventsGateway.server
        .to(`incident:${updatedIncident.id}`)
        .emit('newComment', systemEvent);

      // 4. 🔥 Senior Feature: Real-Time Team Alert
      // FIX: Now using 'updatedIncident' so the linter is happy and data is fresh
      if (updatedIncident.teamId) {
        this.eventsGateway.server
          .to(`team:${updatedIncident.teamId}`)
          .emit('incident:escalated', {
            id: updatedIncident.id,
            title: updatedIncident.title,
            severity: updatedIncident.severity, // Sends 'CRITICAL' correctly
            message: `🔥 Incident "${updatedIncident.title}" has been Auto-Escalated!`,
          });
      }
    } else {
      console.log(`✅ Incident ${job.data.incidentId} is safe.`);
    }
  }
}
