import type { User } from '../db/schema.js';
import { avatarPresetUrl } from '../lib/presets.js';

export interface AuthUser {
  id: string;
  username: string;
  login: string;
  email: string;
  bio: string | null;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SHADOW_BANNED' | 'BANNED' | 'DELETED';
  mustChangePassword: boolean;
  avatarPreset: string;
  avatarUrl: string;
  createdAt: string;
}

export const toAuthUser = (user: User): AuthUser => ({
  id: user.id,
  username: user.username,
  login: user.login,
  email: user.email,
  bio: user.bio,
  role: user.role,
  status: user.status,
  mustChangePassword: user.mustChangePassword,
  avatarPreset: user.avatarPreset,
  avatarUrl: user.avatarUrl ?? avatarPresetUrl(user.avatarPreset),
  createdAt: user.createdAt.toISOString(),
});
