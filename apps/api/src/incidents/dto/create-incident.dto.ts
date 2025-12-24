import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { Severity } from '@prisma/client';

export class CreateIncidentDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEnum(Severity)
  severity: Severity;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  // 🔥 ADD THIS to fix the "DevOps" assignment bug
  @IsOptional()
  @IsString()
  teamName?: string;
}
