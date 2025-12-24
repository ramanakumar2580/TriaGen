import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class EscalationService {
  constructor(@InjectQueue('escalation') private escalationQueue: Queue) {}

  // 🔥 1. Schedule Escalation (Called when Incident is Created)
  async scheduleEscalation(incidentId: string) {
    console.log(
      `⏳ Scheduling escalation check for ${incidentId} in 2 minutes...`,
    );

    await this.escalationQueue.add(
      'check-escalation',
      { incidentId },
      {
        delay: 2 * 60 * 1000, // 2 Minutes Delay (SLA Time)
        jobId: incidentId, // 🔥 Tip: Use IncidentID as JobID for easy removal later
        removeOnComplete: true,
      },
    );
  }

  // 🔥 2. Cancel Escalation (Called when Responder acts on the incident)
  async cancelEscalation(incidentId: string) {
    const job = await this.escalationQueue.getJob(incidentId);

    if (job) {
      console.log(`🛑 Cancellation: Removing escalation job for ${incidentId}`);
      await job.remove(); // Stop the timer!
    }
  }
}
