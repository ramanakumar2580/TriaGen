/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '@prisma/client'; // 👈 Import the Enum we defined in Schema

export class RegisterDto {
  @IsEmail()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase().trim();
    }
    return value;
  })
  email: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  })
  name: string;

  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  // 🛡️ Feature: RBAC Input Validation
  // Ensures only valid roles (MEMBER, RESPONDER, ADMIN) are accepted
  @IsOptional() // Optional so it defaults to MEMBER if missing
  @IsEnum(Role, { message: 'Role must be one of: MEMBER, RESPONDER, ADMIN' })
  role?: Role;

  // 🏢 Feature: Team Assignment
  // We accept the Team Name (e.g. "DevOps") and will look up the ID in the Service
  @IsOptional()
  @IsString()
  teamName?: string;
}
