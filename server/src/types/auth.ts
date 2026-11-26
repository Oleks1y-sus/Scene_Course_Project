import type { User } from '../db/schema.js';
import { avatarPresetUrl } from '../lib/presets.js';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  bio: string | null;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SHADOW_BANNED' | 'BANNED' | 'DELETED';
  emailVerifiedAt: string | null;
  pendingEmail: string | null;
  mustChangePassword: boolean;
  avatarPreset: string;
  avatarUrl: string;
  createdAt: string;
}

export const toAuthUser = (user: User): AuthUser => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  bio: user.bio,
  role: user.role,
  status: user.status,
  emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
  pendingEmail: user.pendingEmail,
  mustChangePassword: user.mustChangePassword,
  avatarPreset: user.avatarPreset,
  avatarUrl: user.avatarUrl ?? avatarPresetUrl(user.avatarPreset),
  createdAt: user.createdAt.toISOString(),
});
