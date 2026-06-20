export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export enum FormStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ChecklistStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  VERIFIED = 'VERIFIED',
}

export enum AuditStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REPORTED = 'REPORTED',
}

export enum WarningType {
  VERBAL = 'VERBAL',
  WRITTEN = 'WRITTEN',
  SUSPENSION = 'SUSPENSION',
  TERMINATION = 'TERMINATION',
}

export enum WarningStatus {
  ISSUED = 'ISSUED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  APPEALED = 'APPEALED',
  RESOLVED = 'RESOLVED',
}

export enum MessageType {
  ALERT = 'ALERT',
  NOTIFICATION = 'NOTIFICATION',
  WARNING = 'WARNING',
  GENERAL = 'GENERAL',
}

export enum MessagePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}
