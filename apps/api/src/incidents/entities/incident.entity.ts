import {
  Incident as PrismaIncident,
  Severity,
  Status,
  Prisma,
} from '@prisma/client';

export class Incident implements PrismaIncident {
  slaDeadline: Date | null;
  resolvedAt: Date | null;
  id: string;
  title: string;
  description: string | null;

  // 🔥 Senior Feature: Strict Enums for Type Safety
  severity: Severity;
  status: Status;

  // 🔥 Senior Feature: Optimistic Concurrency Control
  version: number;

  // 🛡️ FIX: Use strict Prisma.JsonValue instead of 'any'
  // This satisfies the "implements PrismaIncident" contract
  tags: Prisma.JsonValue;

  reporterId: string;
  assigneeId: string | null;

  // 🔥 Senior Feature: Team Ownership
  teamId: string | null;

  createdAt: Date;
  updatedAt: Date;
}
