import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export function StatusBadge({
  status,
}: {
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
}) {
  const labels = {
    UPCOMING: 'Заплановано',
    LIVE: 'У прямому ефірі',
    COMPLETED: 'Завершено',
    CANCELLED: 'Скасовано',
  } as const;

  return (
    <span className={`status-badge status-badge--${status.toLowerCase()}`}>
      {status === 'LIVE' ? <span className="status-badge__dot" aria-hidden="true" /> : null}
      {labels[status]}
    </span>
  );
}

export function ModerationBadge({ status }: { status: 'VISIBLE' | 'PENDING' | 'HIDDEN' }) {
  if (status === 'VISIBLE') return null;
  const label = status === 'PENDING' ? 'На модерації' : 'Приховано';
  return (
    <span className={`moderation-badge moderation-badge--${status.toLowerCase()}`}>
      <Icon name="i-shield" size={13} />
      {label}
    </span>
  );
}

export function EmptyState({
  icon = 'i-sparkles',
  title,
  text,
  action,
}: {
  icon?: IconName;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon" aria-hidden="true">
        <Icon name={icon} size={28} />
      </span>
      <h2 className="empty-state__title">{title}</h2>
      {text ? <p className="empty-state__text">{text}</p> : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="loading-block" aria-busy="true" aria-label="Завантаження">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="loading-block__row" />
      ))}
    </div>
  );
}
