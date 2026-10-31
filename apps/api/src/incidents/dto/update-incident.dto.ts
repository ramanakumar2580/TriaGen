import { PartialType } from '@nestjs/mapped-types';
import { CreateIncidentDto } from './create-incident.dto';
import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { Status } from '@prisma/client'; // 🔥 Senior Feature: Strict Enums

export class UpdateIncidentDto extends PartialType(CreateIncidentDto) {
  // 🔥 Senior Feature: Strict Enum Validation
  // Prevents typos like "RESOLVD" - only allows OPEN, ACKNOWLEDGED, RESOLVED, CLOSED
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  @IsEnum(Status)
  status?: Status;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  // Note: 'teamId', 'title', 'severity' are inherited automatically as Optional
}
