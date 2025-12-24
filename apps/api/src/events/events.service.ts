import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from './events.gateway';
import { EventType } from '@prisma/client';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  async addComment(incidentId: string, userId: string, message: string) {
    return this.createEvent(incidentId, userId, EventType.COMMENT, message);
  }

  async createEvent(
    incidentId: string,
    userId: string,
    type: EventType,
    message: string,
  ) {
    const newEvent = await this.prisma.incidentEvent.create({
      data: {
        incidentId,
        userId,
        type,
        message,
      },
      include: {
        user: { select: { name: true } },
      },
    });

    this.logger.log(`Broadcasting ${type} event to incident:${incidentId}`);

    this.eventsGateway.server
      .to(`incident:${incidentId}`)
      .emit('newComment', newEvent);

    return newEvent;
  }

  sendTeamAlert(teamId: string, payload: any) {
    this.logger.log(`Sending Team Alert to room: team:${teamId}`);

    this.eventsGateway.server
      .to(`team:${teamId}`)
      .emit('incident:assigned', payload);
  }
}
