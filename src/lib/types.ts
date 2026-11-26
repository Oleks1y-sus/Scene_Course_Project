export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SHADOW_BANNED' | 'BANNED' | 'DELETED';
export type WebinarStatus = 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
export type ModerationStatus = 'VISIBLE' | 'PENDING' | 'HIDDEN';
export type WebinarCategory =
  | 'TECHNOLOGY'
  | 'MARKETING'
  | 'DESIGN'
  | 'BUSINESS'
  | 'EDUCATION'
  | 'HEALTH'
  | 'CREATIVE'
  | 'OTHER';
export type ReportTarget = 'WEBINAR' | 'USER';
export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';
export type ReportReason =
  | 'SPAM'
  | 'INAPPROPRIATE_CONTENT'
  | 'INAPPROPRIATE_NAME'
  | 'INAPPROPRIATE_AVATAR'
  | 'MISLEADING'
  | 'HARASSMENT'
  | 'COPYRIGHT'
  | 'IMPERSONATION'
  | 'OTHER';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface User {
  id: string;
  username: string;
  login: string;
  email: string;
  bio: string | null;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  avatarPreset: string;
  avatarUrl: string;
  createdAt: string;
}

export interface WebinarOwner {
  id: string;
  username: string;
  avatarUrl: string;
  bio?: string | null;
}

export interface WebinarCard {
  id: string;
  slug: string;
  title: string;
  descriptionExcerpt: string;
  category: WebinarCategory;
  tags: string[];
  coverUrl: string;
  status: WebinarStatus;
  moderationStatus: ModerationStatus;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  favoriteCount: number;
  registrationCount: number;
  spotsLeft: number;
  isFavorite: boolean;
  isRegistered: boolean;
  isOwner: boolean;
  canManage: boolean;
  canFavorite: boolean;
  canRegister: boolean;
  canReport: boolean;
  canStart: boolean;
  canEnd: boolean;
  canCancel: boolean;
  owner: WebinarOwner;
  createdAt: string;
}

export interface WebinarDetail extends WebinarCard {
  description: string;
  liveStartedAt: string | null;
  endedAt: string | null;
  cancelledAt: string | null;
  canStart: boolean;
  canEnd: boolean;
  canCancel: boolean;
}

export interface ProfileStats {
  created: {
    total: number;
    upcoming: number;
    live: number;
    completed: number;
    cancelled: number;
    pendingModeration: number;
  };
  favoriteReceived: number;
  registrationsReceived: number;
  favoriteCount: number;
  registeredCount: number;
  attendedCount: number;
}

export interface AdminReport {
  id: string;
  targetType: ReportTarget;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  isAutomated: boolean;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  reporterId: string | null;
  reporterUsername: string | null;
  webinarId: string | null;
  webinarTitle: string | null;
  webinarStatus: WebinarStatus | null;
  webinarModeration: ModerationStatus | null;
  webinarOwnerId: string | null;
  webinarOwnerUsername: string | null;
  targetUserId: string | null;
  targetUsername: string | null;
  targetUserStatus: UserStatus | null;
  resolverUsername: string | null;
}

export interface AdminUser {
  id: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  createdAt: string;
  avatarUrl: string;
  webinarCount: number;
  openReports: number;
}

export interface AdminAuditItem {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  note: string | null;
  createdAt: string;
  adminUsername: string | null;
}

export interface AdminStats {
  users: { total: number; active: number; shadowBanned: number; banned: number };
  webinars: { total: number; live: number; pending: number; hidden: number };
  reports: { open: number; resolved: number };
  favorites: number;
  registrations: number;
}

export interface AuthEnvelope {
  user: User;
  mustChangePassword?: boolean;
}

export interface UploadResult {
  id: string;
  url: string;
  width: number;
  height: number;
  kind: 'AVATAR' | 'COVER';
}
