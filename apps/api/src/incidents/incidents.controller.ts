import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IncidentsService } from './incidents.service';
import { FilesService } from '../files/files.service';
import { EventsGateway } from '../events/events.gateway';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { AuthGuard } from '@nestjs/passport';
import { User, Status, Severity } from '@prisma/client';
import { Request as ExpressRequest } from 'express'; // 1. Import Express Request

// 2. Extend the base Request type
interface AuthenticatedRequest extends ExpressRequest {
  user: User;
}

interface IncidentFilters {
  status?: Status;
  severity?: Severity;
  tab?: 'mine' | 'team' | 'all';
}

@UseGuards(AuthGuard('jwt'))
@Controller('incidents')
export class IncidentsController {
  constructor(
    private readonly incidentsService: IncidentsService,
    private readonly filesService: FilesService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createIncidentDto: CreateIncidentDto,
  ) {
    return this.incidentsService.create(req.user, createIncidentDto);
  }

  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query() filters: IncidentFilters,
  ) {
    return this.incidentsService.findAll(req.user, filters || {});
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.incidentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() updateIncidentDto: UpdateIncidentDto,
  ) {
    return this.incidentsService.update(id, req.user, updateIncidentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.incidentsService.remove(id, req.user);
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  async uploadEvidence(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Request() req: AuthenticatedRequest,
  ) {
    const attachment = await this.filesService.uploadFile(
      file,
      id,
      req.user.id,
    );

    // 3. Added optional chaining to prevent "cannot read emit of undefined"
    // if the WebSocket server hasn't started yet.
    this.eventsGateway.server
      ?.to(`incident:${id}`)
      .emit('incident:new_attachment', attachment);

    return attachment;
  }

  @Delete(':id/attachments/:attachmentId')
  removeAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.incidentsService.removeAttachment(
      id,
      attachmentId,
      req.user.id,
    );
  }

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body('message') message: string,
  ) {
    return this.incidentsService.addEvent(id, req.user, 'COMMENT', message);
  }

  @Put(':id/events/:eventId')
  updateEvent(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Request() req: AuthenticatedRequest,
    @Body('message') message: string,
  ) {
    return this.incidentsService.updateEvent(eventId, req.user.id, message);
  }

  @Delete(':id/events/:eventId')
  removeEvent(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.incidentsService.removeEvent(eventId, req.user.id);
  }
}
