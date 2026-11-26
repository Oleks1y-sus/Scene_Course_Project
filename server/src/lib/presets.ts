export const COVER_PRESETS = [
  'cover-01',
  'cover-02',
  'cover-03',
  'cover-04',
  'cover-05',
  'cover-06',
] as const;

export const AVATAR_PRESETS = [
  'avatar-01',
  'avatar-02',
  'avatar-03',
  'avatar-04',
  'avatar-05',
  'avatar-06',
  'avatar-07',
  'avatar-08',
] as const;

export type CoverPreset = (typeof COVER_PRESETS)[number];
export type AvatarPreset = (typeof AVATAR_PRESETS)[number];

export const coverPresetUrl = (preset: string): string => `/img/covers/${preset}.svg`;
export const avatarPresetUrl = (preset: string): string => `/img/avatars/${preset}.svg`;
