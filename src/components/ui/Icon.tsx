import type { CSSProperties } from 'react';

export type IconName =
  | 'i-search'
  | 'i-heart'
  | 'i-heart-filled'
  | 'i-calendar'
  | 'i-clock'
  | 'i-users'
  | 'i-plus'
  | 'i-edit'
  | 'i-trash'
  | 'i-play'
  | 'i-stop'
  | 'i-flag'
  | 'i-shield'
  | 'i-chart'
  | 'i-settings'
  | 'i-logout'
  | 'i-close'
  | 'i-check'
  | 'i-upload'
  | 'i-alert'
  | 'i-eye'
  | 'i-chevron-left'
  | 'i-chevron-right'
  | 'i-chevron-down'
  | 'i-arrow-right'
  | 'i-arrow-left'
  | 'i-user'
  | 'i-sparkles'
  | 'i-external'
  | 'i-lock'
  | 'i-mail'
  | 'i-ban'
  | 'i-star'
  | 'i-info'
  | 'i-copy'
  | 'i-link'
  | 'i-refresh'
  | 'i-filter'
  | 'i-menu'
  | 'i-home';

export function Icon({
  name,
  size = 20,
  className,
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
    >
      <use href={`/img/icons.svg#${name}`} />
    </svg>
  );
}
