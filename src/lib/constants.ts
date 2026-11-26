import type {
  ModerationStatus,
  ReportReason,
  ReportTarget,
  UserRole,
  UserStatus,
  WebinarCategory,
  WebinarStatus,
} from './types';

export const SITE_NAME = 'Сцена';
export const SITE_DESCRIPTION =
  'Сцена — платформа для інтерактивних онлайн-заходів: створюйте вебінари, збирайте аудиторію та керуйте подіями в одному місці.';

export const CATEGORY_LABELS: Record<WebinarCategory, string> = {
  TECHNOLOGY: 'Технології',
  MARKETING: 'Маркетинг',
  DESIGN: 'Дизайн',
  BUSINESS: 'Бізнес',
  EDUCATION: 'Освіта',
  HEALTH: 'Здоров’я',
  CREATIVE: 'Креатив',
  OTHER: 'Інше',
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as WebinarCategory[];

export const STATUS_LABELS: Record<WebinarStatus, string> = {
  UPCOMING: 'Заплановано',
  LIVE: 'У прямому ефірі',
  COMPLETED: 'Завершено',
  CANCELLED: 'Скасовано',
};

export const MODERATION_LABELS: Record<ModerationStatus, string> = {
  VISIBLE: 'Опубліковано',
  PENDING: 'На модерації',
  HIDDEN: 'Приховано',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  USER: 'Учасник',
  ADMIN: 'Адміністратор',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Активний',
  SHADOW_BANNED: 'Тіньовий бан',
  BANNED: 'Заблокований',
  DELETED: 'Видалений',
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  SPAM: 'Спам або нав’язлива реклама',
  INAPPROPRIATE_CONTENT: 'Непристойний вміст',
  INAPPROPRIATE_NAME: 'Непристойне ім’я',
  INAPPROPRIATE_AVATAR: 'Непристойний аватар',
  MISLEADING: 'Оманлива інформація',
  HARASSMENT: 'Цькування або образи',
  COPYRIGHT: 'Порушення авторських прав',
  IMPERSONATION: 'Видавання себе за іншу особу',
  OTHER: 'Інша причина',
};

export const WEBINAR_REPORT_REASONS: ReportReason[] = [
  'SPAM',
  'INAPPROPRIATE_CONTENT',
  'MISLEADING',
  'HARASSMENT',
  'COPYRIGHT',
  'OTHER',
];

export const USER_REPORT_REASONS: ReportReason[] = [
  'INAPPROPRIATE_NAME',
  'INAPPROPRIATE_AVATAR',
  'HARASSMENT',
  'SPAM',
  'IMPERSONATION',
  'OTHER',
];

export const reportReasonsFor = (target: ReportTarget): ReportReason[] =>
  target === 'WEBINAR' ? WEBINAR_REPORT_REASONS : USER_REPORT_REASONS;

export interface CoverPresetOption {
  key: string;
  label: string;
  url: string;
}

export const COVER_PRESETS: CoverPresetOption[] = [
  { key: 'cover-01', label: 'Індиго', url: '/img/covers/cover-01.svg' },
  { key: 'cover-02', label: 'Пурпур', url: '/img/covers/cover-02.svg' },
  { key: 'cover-03', label: 'Океан', url: '/img/covers/cover-03.svg' },
  { key: 'cover-04', label: 'Бурштин', url: '/img/covers/cover-04.svg' },
  { key: 'cover-05', label: 'Лайм', url: '/img/covers/cover-05.svg' },
  { key: 'cover-06', label: 'Рубін', url: '/img/covers/cover-06.svg' },
];

export const AVATAR_PRESETS: { key: string; url: string }[] = Array.from({ length: 8 }, (_, index) => {
  const key = `avatar-0${index + 1}`;
  return { key, url: `/img/avatars/${key}.svg` };
});

export const DATE_FILTER_SCOPES = [
  { key: 'active', label: 'Актуальні' },
  { key: 'completed', label: 'Завершені' },
  { key: 'cancelled', label: 'Скасовані' },
  { key: 'all', label: 'Усі' },
] as const;

export const SORT_OPTIONS = [
  { value: 'soonest', label: 'Спочатку найближчі' },
  { value: 'newest', label: 'Спочатку нові' },
  { value: 'popular', label: 'Популярні' },
  { value: 'title', label: 'За назвою' },
] as const;

export const PAGE_SIZE = 12;

export const PROTECTED_PATHS = ['/events', '/create', '/profile', '/admin'];

export const isProtectedPath = (pathname: string): boolean =>
  PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
