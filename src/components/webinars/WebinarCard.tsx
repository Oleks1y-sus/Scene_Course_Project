'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ModerationBadge, StatusBadge } from '@/components/ui/Badges';
import { apiDelete, apiPost, errorMessage } from '@/lib/api';
import { CATEGORY_LABELS } from '@/lib/constants';
import {
  formatDateTime,
  formatDuration,
  participantsLabel,
} from '@/lib/format';
import type { WebinarCard as WebinarCardType } from '@/lib/types';

interface FavoriteResult {
  favorited: boolean;
  favoriteCount: number;
}

export function WebinarCard({
  webinar,
  onChanged,
}: {
  webinar: WebinarCardType;
  onChanged?: (webinar: WebinarCardType) => void;
}) {
  const [favorited, setFavorited] = useState(webinar.isFavorite);
  const [favoriteCount, setFavoriteCount] = useState(webinar.favoriteCount);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const toggleFavorite = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      const result = favorited
        ? await apiDelete<FavoriteResult>(`/webinars/${webinar.id}/favorite`)
        : await apiPost<FavoriteResult>(`/webinars/${webinar.id}/favorite`);
      setFavorited(result.favorited);
      setFavoriteCount(result.favoriteCount);
      onChanged?.({ ...webinar, isFavorite: result.favorited, favoriteCount: result.favoriteCount });
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const showFavorite = (webinar.canFavorite || favorited) && !webinar.isOwner;

  return (
    <article className={`webinar-card ${webinar.status === 'LIVE' ? 'webinar-card--live' : ''}`}>
      <div className="webinar-card__media">
        <Link href={`/events/${webinar.id}`} aria-label={`Відкрити захід «${webinar.title}»`}>
          <img
            src={webinar.coverUrl}
            alt={`Обкладинка заходу «${webinar.title}»`}
            width="800"
            height="450"
            loading="lazy"
            decoding="async"
          />
        </Link>
        <div className="webinar-card__badges">
          <StatusBadge status={webinar.status} />
          <span className="category-badge">{CATEGORY_LABELS[webinar.category]}</span>
          <ModerationBadge status={webinar.moderationStatus} />
        </div>
        {showFavorite ? (
          <button
            type="button"
            className={`favorite-button ${favorited ? 'is-active' : ''}`}
            onClick={toggleFavorite}
            disabled={busy || (!webinar.canFavorite && !favorited)}
            aria-label={favorited ? 'Прибрати з обраного' : 'Додати в обране'}
            aria-pressed={favorited}
            title={favorited ? 'Прибрати з обраного' : 'Додати в обране'}
          >
            <Icon name={favorited ? 'i-heart-filled' : 'i-heart'} size={18} />
            <span>{favoriteCount}</span>
          </button>
        ) : null}
        {webinar.isOwner ? (
          <span className="owner-flag">
            <Icon name="i-star" size={14} /> Ваш захід
          </span>
        ) : null}
      </div>

      <div className="webinar-card__body">
        <h3 className="webinar-card__title">
          <Link href={`/events/${webinar.id}`}>{webinar.title}</Link>
        </h3>
        <p className="webinar-card__excerpt">{webinar.descriptionExcerpt}</p>

        <dl className="webinar-card__meta">
          <div>
            <dt><Icon name="i-calendar" size={15} /><span className="sr-only">Дата</span></dt>
            <dd>{formatDateTime(webinar.startsAt)}</dd>
          </div>
          <div>
            <dt><Icon name="i-clock" size={15} /><span className="sr-only">Тривалість</span></dt>
            <dd>{formatDuration(webinar.durationMinutes)}</dd>
          </div>
          <div>
            <dt><Icon name="i-users" size={15} /><span className="sr-only">Учасники</span></dt>
            <dd>{participantsLabel(webinar.registrationCount)}</dd>
          </div>
        </dl>

        <div className="webinar-card__footer">
          <div className="webinar-card__owner">
            <Avatar src={webinar.owner.avatarUrl} name={webinar.owner.username} size="xs" />
            <span>@{webinar.owner.username}</span>
          </div>
          {webinar.isOwner ? (
            <Link href={`/events/${webinar.id}/edit`} className="webinar-card__link">
              Налаштувати <Icon name="i-settings" size={15} />
            </Link>
          ) : (
            <Link href={`/events/${webinar.id}`} className="webinar-card__link">
              Детальніше <Icon name="i-arrow-right" size={15} />
            </Link>
          )}
        </div>
        {notice ? <p className="webinar-card__notice" role="status">{notice}</p> : null}
      </div>
    </article>
  );
}
