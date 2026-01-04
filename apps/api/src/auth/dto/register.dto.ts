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

  @IsOptional() // Optional so it defaults to MEMBER if missing
  @IsEnum(Role, { message: 'Role must be one of: MEMBER, RESPONDER, ADMIN' })
  role?: Role;

  @IsOptional()
  @IsString()
  teamName?: string;
}
