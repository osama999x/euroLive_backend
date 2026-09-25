export enum AgencyStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  FROZEN = 'frozen',
}

export enum HostStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  FROZEN = 'frozen',
}

export enum RoomStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum RoomModerationAction {
  MUTE = 'mute',
  KICK = 'kick',
  BLACKLIST = 'blacklist',
  UNBLACKLIST = 'unblacklist',
}

export enum ComplaintType {
  USER_REPORT = 'user_report',
  HOST_COMPLAINT = 'host_complaint',
  AGENCY_MISCONDUCT = 'agency_misconduct',
}

export enum ComplaintStatus {
  RECEIVED = 'received',
  UNDER_REVIEW = 'under_review',
  ACTION_TAKEN = 'action_taken',
  REJECTED = 'rejected',
  CLOSED = 'closed',
}

export enum ComplaintSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum EvidenceType {
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
}

export enum SosStatus {
  OPEN = 'open',
  ACKNOWLEDGED = 'acknowledged',
  ESCALATED = 'escalated',
  HANDLING = 'handling',
  RESOLVED = 'resolved',
}

export enum SalaryLineStatus {
  DRAFT = 'draft',
  CALCULATED = 'calculated',
  HOLDING = 'holding',
  RELEASED = 'released',
  CANCELLED = 'cancelled',
}

export enum PayoutBatchStatus {
  CALCULATED = 'calculated',
  HOLD_APPROVED = 'hold_approved',
  HOLDING = 'holding',
  RELEASED = 'released',
  CANCELLED = 'cancelled',
}

export enum PayoutPartyType {
  HOST = 'host',
  AGENCY = 'agency',
}

export enum FreezeType {
  COINS = 'coins',
  ACCOUNT = 'account',
  WALLET = 'wallet',
}

export enum FreezeStatus {
  PENDING_REVIEW = 'pending_review',
  FROZEN = 'frozen',
  RESTORED = 'restored',
  CONFIRMED = 'confirmed',
}

export enum FraudCaseStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  RESTORED = 'restored',
  PENALIZED = 'penalized',
  BANNED = 'banned',
  CLOSED = 'closed',
}

export enum BackupRunStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum CountryCode {
  PK = 'PK',
  IN = 'IN',
  BD = 'BD',
}
