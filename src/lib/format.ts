// A fixed time zone keeps SSR and hydration output identical: the Vercel
// server runs in UTC, while a browser in Ukraine is UTC+2/UTC+3.
const dateFormatter = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Kyiv',
});

const dateTimeFormatter = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Kyiv',
});

const shortDateFormatter = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Europe/Kyiv',
});

const timeFormatter = new Intl.DateTimeFormat('uk-UA', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Kyiv',
});

export const formatDate = (iso: string): string => dateFormatter.format(new Date(iso));

export const formatDateTime = (iso: string): string => dateTimeFormatter.format(new Date(iso));

export const formatShortDate = (iso: string): string => shortDateFormatter.format(new Date(iso));

export const formatTime = (iso: string): string => timeFormatter.format(new Date(iso));

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} хв`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} год` : `${hours} год ${rest} хв`;
};

export const pluralize = (count: number, one: string, few: string, many: string): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
};

export const participantsLabel = (count: number): string =>
  `${count} ${pluralize(count, 'учасник', 'учасники', 'учасників')}`;

export const favoritesLabel = (count: number): string =>
  `${count} ${pluralize(count, 'збереження', 'збереження', 'збережень')}`;

export const toDatetimeLocal = (iso: string): string => {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const fromDatetimeLocal = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

export const defaultStartsAt = (): string => {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return toDatetimeLocal(date.toISOString());
};

export const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export const truncate = (value: string, length: number): string =>
  value.length <= length ? value : `${value.slice(0, length).replace(/\s+\S*$/, '')}…`;

export const formatRelative = (iso: string): string => {
  const diff = new Date(iso).getTime() - Date.now();
  const minutes = Math.round(diff / 60_000);
  if (Math.abs(minutes) < 60) {
    if (minutes === 0) return 'зараз';
    return minutes > 0 ? `через ${minutes} хв` : `${Math.abs(minutes)} хв тому`;
  }
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return hours > 0 ? `через ${hours} год` : `${Math.abs(hours)} год тому`;
  const days = Math.round(hours / 24);
  return days > 0 ? `через ${days} ${pluralize(days, 'день', 'дні', 'днів')}` : `${Math.abs(days)} ${pluralize(Math.abs(days), 'день', 'дні', 'днів')} тому`;
};

export const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export const HANDLE_PATTERN = /^[a-z][a-z0-9_]{2,29}$/;

export const normalizeHandle = (value: string): string => value.trim().toLowerCase();

export const isValidHandle = (value: string): boolean => HANDLE_PATTERN.test(normalizeHandle(value));

export const passwordChecks = (password: string) => ({
  length: password.length >= 10,
  lower: /[a-zа-яіїєґ]/.test(password),
  upper: /[A-ZА-ЯІЇЄҐ]/.test(password),
  digit: /\d/.test(password),
});

export const passwordScore = (password: string): number => {
  const checks = passwordChecks(password);
  return Object.values(checks).filter(Boolean).length;
};

export const passwordIsStrong = (password: string): boolean =>
  Object.values(passwordChecks(password)).every(Boolean);
