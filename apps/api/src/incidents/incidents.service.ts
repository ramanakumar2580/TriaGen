import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { EscalationService } from '../escalation/escalation.service';
import { EventsService } from '../events/events.service';
import { FilesService } from '../files/files.service';
import { EventsGateway } from '../events/events.gateway';
import {
  Severity,
  Status,
  EventType,
  Role,
  User,
  Prisma,
} from '@prisma/client';
import { addHours } from 'date-fns';

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    private prisma: PrismaService,
    private escalationService: EscalationService,
    private eventsService: EventsService,
    private filesService: FilesService,
    private eventsGateway: EventsGateway,
    @InjectQueue('incidents') private incidentsQueue: Queue,
  ) {}

  async create(user: User, dto: CreateIncidentDto) {
    let teamId: string | null | undefined = dto.teamId;

    if (!teamId && dto.teamName) {
      const team = await this.prisma.team.findUnique({
        where: { name: dto.teamName },
      });
      if (team) teamId = team.id;
    }

    if (!teamId) {
      teamId = user.teamId;
    }

    let slaHours = 48;
    if (dto.severity === Severity.CRITICAL) slaHours = 1;
    else if (dto.severity === Severity.HIGH) slaHours = 4;
    else if (dto.severity === Severity.MEDIUM) slaHours = 24;

    const slaDate = addHours(new Date(), slaHours);

    const incident = await this.prisma.incident.create({
      data: {
        title: dto.title,
        description: dto.description,
        severity: dto.severity,
        status: Status.OPEN,
        reporterId: user.id,
        teamId: teamId,
        slaDeadline: slaDate,
        tags: [],
        version: 0,
      },
      include: {
        team: true,
        reporter: { select: { name: true, email: true } },
        assignee: { select: { name: true, email: true } },
      },
    });

    const delay = slaHours * 60 * 60 * 1000;

    await this.incidentsQueue.add(
      'check-sla',
      { incidentId: incident.id },
      {
        delay: delay,
        jobId: `sla-${incident.id}`,
        removeOnComplete: true,
      },
    );
    this.logger.log(
      `Scheduled SLA check for Incident #${incident.id} in ${slaHours} hours`,
    );

    await this.escalationService.scheduleEscalation(incident.id);

    // 🔥 FIX: Broadcast to "general" room so all Dashboards update instantly
    this.eventsGateway.broadcastIncident(incident);

    if (incident.teamId) {
      this.eventsService.sendTeamAlert(incident.teamId, incident as any);
    }

    return incident;
  }

  async findAll(
    user: User,
    filters: {
      status?: Status;
      severity?: Severity;
      tab?: 'mine' | 'team' | 'all';
    },
  ) {
    const whereClause: Prisma.IncidentWhereInput = {};

    if (filters.status) whereClause.status = filters.status;
    if (filters.severity) whereClause.severity = filters.severity;

    if (filters.tab === 'mine') {
      whereClause.assigneeId = user.id;
    } else if (filters.tab === 'team' && user.teamId) {
      whereClause.teamId = user.teamId;
    }

    return this.prisma.incident.findMany({
      where: whereClause,
      include: {
        reporter: { select: { name: true, email: true } },
        assignee: { select: { name: true, email: true } },
        team: { select: { name: true } },
        _count: { select: { events: true, attachments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: {
        reporter: { select: { id: true, name: true, email: true, role: true } },
        assignee: { select: { id: true, name: true, email: true } },
        team: true,
        attachments: {
          include: {
            uploadedBy: { select: { id: true, name: true } },
          },
        },
        events: {
          include: { user: { select: { name: true, id: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!incident) throw new NotFoundException(`Incident #${id} not found`);
    return incident;
  }

  async update(
    id: string,
    user: User,
    dto: UpdateIncidentDto & { version?: number },
  ) {
    const oldIncident = await this.prisma.incident.findUnique({
      where: { id },
    });
    if (!oldIncident) throw new NotFoundException('Incident not found');

    if (dto.version !== undefined && oldIncident.version !== dto.version) {
      throw new ConflictException(
        'The incident has been modified by another process. Please refresh.',
      );
    }

    const incident = await this.prisma.incident.update({
      where: {
        id,
        version: oldIncident.version,
      },
      data: {
        ...dto,
        version: { increment: 1 },
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        reporter: { select: { id: true, name: true } },
      },
    });

    this.eventsGateway.server
      .to(`incident:${id}`)
      .emit('incident:updated', incident);

    if (dto.status && dto.status !== oldIncident.status) {
      await this.eventsService.createEvent(
        id,
        user.id,
        EventType.STATUS_CHANGE,
        `changed status to ${dto.status}`,
      );

      if (dto.status === Status.RESOLVED || dto.status === Status.CLOSED) {
        await this.escalationService.cancelEscalation(id);
      }
    }

    if (dto.assigneeId && dto.assigneeId !== oldIncident.assigneeId) {
      const assigneeName = incident.assignee?.name || 'someone';
      await this.eventsService.createEvent(
        id,
        user.id,
        EventType.ASSIGNMENT,
        `assigned to ${assigneeName}`,
      );
    }

    return incident;
  }

  async remove(id: string, user: User) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');

    const isOwner = incident.reporterId === user.id;
    const isAdmin = user.role === Role.ADMIN;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'You do not have permission to delete this incident',
      );
    }

    const attachments = await this.prisma.attachment.findMany({
      where: { incidentId: id },
    });
    await Promise.all(
      attachments.map((file) => this.filesService.deleteFile(file.fileKey)),
    );

    return this.prisma.incident.delete({ where: { id } });
  }

  async addEvent(
    incidentId: string,
    user: User,
    type: string,
    message: string,
  ) {
    const event = await this.prisma.incidentEvent.create({
      data: {
        incidentId,
        userId: user.id,
        type: type as EventType,
        message,
      },
      include: { user: { select: { name: true, id: true } } },
    });

    this.eventsGateway.server
      .to(`incident:${incidentId}`)
      .emit('newComment', event);
    return event;
  }

  async updateEvent(eventId: string, userId: string, newMessage: string) {
    const event = await this.prisma.incidentEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) throw new NotFoundException('Event not found');
    if (event.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updated = await this.prisma.incidentEvent.update({
      where: { id: eventId },
      data: { message: newMessage },
      include: { user: { select: { name: true, id: true } } },
    });

    this.eventsGateway.server
      .to(`incident:${event.incidentId}`)
      .emit('newComment', {
        ...updated,
        type: 'EDITED',
      });

    return updated;
  }

  async removeEvent(eventId: string, userId: string) {
    const event = await this.prisma.incidentEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) throw new NotFoundException('Event not found');
    if (event.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.incidentEvent.delete({ where: { id: eventId } });

    this.eventsGateway.server
      .to(`incident:${event.incidentId}`)
      .emit('newComment', {
        type: 'DELETED',
        id: eventId,
      });

    return { success: true };
  }

  async removeAttachment(
    incidentId: string,
    attachmentId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userId: string,
  ) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) throw new NotFoundException('Attachment not found');

    await this.filesService.deleteFile(attachment.fileKey);

    await this.prisma.attachment.delete({
      where: { id: attachmentId },
    });

    this.eventsGateway.server
      .to(`incident:${incidentId}`)
      .emit('incident:attachment_removed', { id: attachmentId });

    return { success: true };
  }
}
