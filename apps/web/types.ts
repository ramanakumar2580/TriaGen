// apps/web/types/index.ts (or wherever you store your types)

export enum Role {
  MEMBER = "MEMBER",
  RESPONDER = "RESPONDER",
  ADMIN = "ADMIN",
}

export enum Severity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum Status {
  OPEN = "OPEN",
  ACKNOWLEDGED = "ACKNOWLEDGED",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED",
}

export enum EventType {
  COMMENT = "COMMENT",
  STATUS_CHANGE = "STATUS_CHANGE",
  ASSIGNMENT = "ASSIGNMENT",
  EDITED = "EDITED",
  DELETED = "DELETED",
  ATTACHMENT = "ATTACHMENT",
}

// =======================
// 2. INTERFACES
// =======================

export interface Team {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;

  // 🛡️ RBAC & Teams (Features #1 & #2)
  role: Role;
  teamId?: string | null;
  team?: Team | null;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  contentType: string;
  sizeBytes?: number;

  // 🗑️ needed for hard delete logic (Feature #9)
  fileKey: string;

  uploadedBy: User;
  createdAt: string;
}

export interface IncidentEvent {
  id: string;
  type: EventType;
  message: string;
  user: User;

  createdAt: string;
  updatedAt: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string | null;
  severity: Severity;
  status: Status;

  // ⚡ Optimistic Locking
  version: number;

  // ⏱️ SLA Tracking (Feature #4)
  slaDeadline?: string | null; // ISO Date string
  resolvedAt?: string | null;

  // 👥 People & Teams
  reporter: User;
  assignee?: User | null;

  // 🏢 Owning Team (Feature #7)
  teamId?: string | null;
  team?: Team | null;

  // 🗄️ Data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tags?: any; // or string[] if strictly array
  events: IncidentEvent[];
  attachments: Attachment[];

  createdAt: string;
  updatedAt: string;
}
