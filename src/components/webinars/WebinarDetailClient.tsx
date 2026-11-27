'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, LoadingBlock, ModerationBadge, StatusBadge } from '@/components/ui/Badges';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Countdown } from '@/components/webinars/Countdown';
import { ReportDialog } from '@/components/webinars/ReportDialog';
import { useNow } from '@/lib/useNow';
import { apiDelete, apiGet, apiPost, ApiError, errorMessage } from '@/lib/api';
import { CATEGORY_LABELS } from '@/lib/constants';
import {
  formatDateTime,
  formatDuration,
  formatRelative,
  formatTime,
  participantsLabel,
} from '@/lib/format';
import type { WebinarDetail } from '@/lib/types';

type ConfirmAction = 'end' | 'delete';

interface FavoriteResult {
  favorited: boolean;
  favoriteCount: number;
}

interface RegisterResult {
  registered: boolean;
  registrationCount: number;
}

const CONFIRM_COPY: Record<ConfirmAction, { title: string; text: string; label: string }> = {
  end: {
    title: 'Завершити захід?',
    text: 'Ефір буде завершено, а всі зареєстровані учасники отримають статус «відвідали». Дію не можна скасувати.',
    label: 'Завершити',
  },
  delete: {
    title: 'Видалити захід?',
    text: 'Захід буде приховано та позначено як скасований. Цю дію не можна скасувати через інтерфейс.',
    label: 'Видалити',
  },
};

export function WebinarDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [webinar, setWebinar] = useState<WebinarDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [flash, setFlash] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [ownerReportOpen, setOwnerReportOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [copied, setCopied] = useState(false);
  const [manualLink, setManualLink] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const now = useNow();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await apiGet<WebinarDetail>(`/webinars/${id}`);
      setWebinar(data);
    } catch (error) {
      setLoadError(error instanceof ApiError && error.status === 404 ? 'Захід не знайдено.' : errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(''), 5000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const runAction = async (key: string, action: () => Promise<WebinarDetail | void>, successMessage: string) => {
    setBusy(key);
    setActionError('');
    try {
      const result = await action();
      if (result) setWebinar(result);
      setFlash(successMessage);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const toggleFavorite = async () => {
    if (!webinar) return;
    setBusy('favorite');
    setActionError('');
    try {
      const result = webinar.isFavorite
        ? await apiDelete<FavoriteResult>(`/webinars/${webinar.id}/favorite`)
        : await apiPost<FavoriteResult>(`/webinars/${webinar.id}/favorite`);
      setWebinar({
        ...webinar,
        isFavorite: result.favorited,
        favoriteCount: result.favoriteCount,
      });
      setFlash(result.favorited ? 'Захід додано в обране.' : 'Захід прибрано з обраного.');
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const toggleRegistration = async () => {
    if (!webinar) return;
    setBusy('register');
    setActionError('');
    try {
      if (webinar.isRegistered) {
        const result = await apiDelete<RegisterResult>(`/webinars/${webinar.id}/register`);
        setWebinar({
          ...webinar,
          isRegistered: false,
          registrationCount: result.registrationCount,
          spotsLeft: Math.max(0, webinar.capacity - result.registrationCount),
          canRegister: true,
        });
        setFlash('Реєстрацію скасовано.');
      } else {
        const result = await apiPost<RegisterResult>(`/webinars/${webinar.id}/register`);
        setWebinar({
          ...webinar,
          isRegistered: true,
          registrationCount: result.registrationCount,
          spotsLeft: Math.max(0, webinar.capacity - result.registrationCount),
        });
        setFlash('Ви зареєстровані на захід. До зустрічі!');
      }
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const executeConfirmed = async () => {
    if (!webinar || !confirmAction) return;
    const action = confirmAction;
    setConfirmAction(null);
    if (action === 'delete') {
      setBusy('delete');
      try {
        await apiDelete(`/webinars/${webinar.id}`);
        router.push('/events');
        router.refresh();
      } catch (error) {
        setActionError(errorMessage(error));
        setBusy(null);
      }
      return;
    }
    if (action !== 'end') return;
    await runAction(
      'end',
      () => apiPost<WebinarDetail>(`/webinars/${webinar.id}/end`),
      'Захід завершено.',
    );
  };

  const share = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setManualLink(false);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setManualLink(true);
    }
  };

  if (loading) {
    return (
      <div className="app-page">
        <div className="container">
          <LoadingBlock rows={5} />
        </div>
      </div>
    );
  }

  if (loadError || !webinar) {
    return (
      <div className="app-page">
        <div className="container">
          <EmptyState
            icon="i-search"
            title="Не вдалося відкрити захід"
            text={loadError || 'Можливо, його видалено або приховано модератором.'}
            action={
              <div className="empty-state__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setReloadKey((value) => value + 1)}>
                  Спробувати ще раз
                </button>
                <Link href="/events" className="btn btn--primary">До каталогу</Link>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  const isUpcoming = webinar.status === 'UPCOMING';
  const isLive = webinar.status === 'LIVE';
  const isFinished = webinar.status === 'COMPLETED' || webinar.status === 'CANCELLED';
  const showFavorite = webinar.canFavorite || webinar.isFavorite;
  const registrationClosed = isFinished || webinar.spotsLeft <= 0;
  const startAvailable = now > 0 && new Date(webinar.startsAt).getTime() <= now;

  return (
    <div className="app-page detail-page">
      <div className="container">
        <nav className="breadcrumbs" aria-label="Навігаційний ланцюжок">
          <Link href="/events">Заходи</Link>
          <Icon name="i-chevron-right" size={14} />
          <span aria-current="page">{webinar.title}</span>
        </nav>

        {flash ? <p className="flash-message" role="status"><Icon name="i-check" size={17} />{flash}</p> : null}
        {actionError ? <p className="form__alert" role="alert">{actionError}</p> : null}

        {webinar.isOwner && webinar.moderationStatus !== 'VISIBLE' ? (
          <div className={`moderation-alert moderation-alert--${webinar.moderationStatus.toLowerCase()}`} role="status">
            <Icon name="i-shield" size={22} />
            <div>
              <strong>Захід {webinar.moderationStatus === 'PENDING' ? 'очікує модерації' : 'приховано модератором'}.</strong>
              <p>
                Він не показується в публічному каталозі. {webinar.moderationStatus === 'PENDING'
                  ? 'Адміністратор перегляне скаргу та ухвалить рішення.'
                  : 'Зверніться до підтримки, якщо вважаєте рішення помилковим.'}
              </p>
            </div>
          </div>
        ) : null}

        <div className={`detail-hero ${isLive ? 'detail-hero--live' : ''}`}>
          <img
            src={webinar.coverUrl}
            alt={`Обкладинка заходу «${webinar.title}»`}
            width="1200"
            height="675"
            decoding="async"
          />
          <div className="detail-hero__overlay" />
          <div className="detail-hero__badges">
            <StatusBadge status={webinar.status} />
            <span className="category-badge">{CATEGORY_LABELS[webinar.category]}</span>
            <ModerationBadge status={webinar.moderationStatus} />
            {webinar.isOwner ? <span className="owner-flag"><Icon name="i-star" size={14} /> Ваш захід</span> : null}
          </div>
          {isLive ? (
            <div className="live-banner" role="status">
              <span className="live-banner__dot" />
              <div>
                <strong>Ефір триває</strong>
                <span>Розпочато о {webinar.liveStartedAt ? formatTime(webinar.liveStartedAt) : '—'} · {formatRelative(webinar.startsAt)}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="detail-grid">
          <article className="detail-main">
            <header className="detail-head">
              <h1 className="detail-title">{webinar.title}</h1>
              <div className="detail-meta">
                <span><Icon name="i-calendar" size={17} /> {formatDateTime(webinar.startsAt)}</span>
                <span><Icon name="i-clock" size={17} /> {formatDuration(webinar.durationMinutes)}</span>
                <span><Icon name="i-users" size={17} /> {participantsLabel(webinar.registrationCount)}</span>
              </div>
            </header>

            {isUpcoming ? <Countdown targetIso={webinar.startsAt} /> : null}

            <section className="detail-section" aria-labelledby="about-title">
              <h2 className="detail-section__title" id="about-title">Про захід</h2>
              <p className="detail-description">{webinar.description}</p>
            </section>

            {webinar.tags.length > 0 ? (
              <section className="detail-section" aria-labelledby="tags-title">
                <h2 className="detail-section__title" id="tags-title">Теги</h2>
                <div className="tag-list">
                  {webinar.tags.map((tag) => <span key={tag} className="tag">#{tag}</span>)}
                </div>
              </section>
            ) : null}

            <section className="detail-section" aria-labelledby="safety-title">
              <h2 className="detail-section__title" id="safety-title">Безпека та правила</h2>
              <p className="detail-text">
                Поважайте інших учасників. Заборонено спам, образи, оманливий контент і розповсюдження
                шкідливих посилань. Підозрілий захід можна позначити скаргою — її перегляне адміністратор.
              </p>
            </section>
          </article>

          <aside className="detail-aside" aria-label="Дії та організатор">
            <div className="action-card">
              <div className="action-card__head">
                <div>
                  <p className="action-card__eyebrow">Участь</p>
                  <p className="action-card__price">{registrationClosed && !webinar.isRegistered ? 'Реєстрація закрита' : 'Безкоштовно'}</p>
                </div>
                <span className="action-card__spots">{webinar.spotsLeft > 0 ? `${webinar.spotsLeft} місць` : 'Місць немає'}</span>
              </div>

              <div className="capacity-bar" aria-hidden="true">
                <span style={{ width: `${Math.min(100, Math.round((webinar.registrationCount / webinar.capacity) * 100))}%` }} />
              </div>

              {webinar.isOwner ? (
                <div className="action-card__owner-actions">
                  <Link href={`/events/${webinar.id}/edit`} className="btn btn--primary btn--block">
                    <Icon name="i-edit" size={17} /> Налаштувати захід
                  </Link>
                  {webinar.canStart ? (
                    startAvailable ? (
                      <button
                        type="button"
                        className="btn btn--live btn--block"
                        disabled={busy !== null}
                        onClick={() => void runAction('start', () => apiPost<WebinarDetail>(`/webinars/${webinar.id}/start`), 'Ефір розпочато!')}
                      >
                        <Icon name="i-play" size={17} /> Розпочати ефір
                      </button>
                    ) : (
                      <button type="button" className="btn btn--ghost btn--block" disabled>
                        <Icon name="i-clock" size={17} /> Розпочати о {formatTime(webinar.startsAt)}
                      </button>
                    )
                  ) : null}
                  {webinar.canEnd ? (
                    <button type="button" className="btn btn--ghost btn--block" disabled={busy !== null} onClick={() => setConfirmAction('end')}>
                      <Icon name="i-stop" size={17} /> Завершити ефір
                    </button>
                  ) : null}
                  <button type="button" className="btn btn--danger-ghost btn--block" disabled={busy !== null} onClick={() => setConfirmAction('delete')}>
                    <Icon name="i-trash" size={17} /> Видалити
                  </button>
                </div>
              ) : (
                <div className="action-card__actions">
                  {webinar.isRegistered ? (
                    isFinished ? (
                      <button type="button" className="btn btn--ghost btn--block" disabled>
                        <Icon name="i-check" size={17} />
                        {webinar.status === 'COMPLETED' ? 'Ви відвідали захід' : 'Захід скасовано'}
                      </button>
                    ) : (
                      <button type="button" className="btn btn--ghost btn--block" onClick={() => void toggleRegistration()} disabled={busy !== null}>
                        <Icon name="i-check" size={17} /> Ви зареєстровані — скасувати
                      </button>
                    )
                  ) : registrationClosed ? (
                    <button type="button" className="btn btn--ghost btn--block" disabled>
                      {isFinished ? 'Захід завершено' : 'Місць немає'}
                    </button>
                  ) : (
                    <button type="button" className="btn btn--primary btn--block" onClick={() => void toggleRegistration()} disabled={busy !== null}>
                      <Icon name="i-check" size={17} /> Зареєструватися
                    </button>
                  )}
                </div>
              )}

              <div className="action-card__secondary">
                {showFavorite ? (
                  <button type="button" className={`btn btn--ghost ${webinar.isFavorite ? 'is-active' : ''}`} onClick={() => void toggleFavorite()} disabled={busy !== null}>
                    <Icon name={webinar.isFavorite ? 'i-heart-filled' : 'i-heart'} size={17} />
                    {webinar.isFavorite ? 'В обраному' : 'В обране'}
                  </button>
                ) : null}
                <button type="button" className="btn btn--ghost" onClick={() => void share()}>
                  <Icon name="i-link" size={17} /> {copied ? 'Скопійовано' : 'Поділитися'}
                </button>
              </div>

              {manualLink ? (
                <label className="share-fallback">
                  <span>Скопіюйте посилання вручну:</span>
                  <input className="form__control" readOnly value={typeof window !== 'undefined' ? window.location.href : ''} onFocus={(event) => event.currentTarget.select()} />
                </label>
              ) : null}

              {!webinar.isOwner ? (
                <button type="button" className="report-link" onClick={() => setReportOpen(true)}>
                  <Icon name="i-flag" size={15} /> Поскаржитися на захід
                </button>
              ) : null}
            </div>

            <div className="owner-card">
              <p className="owner-card__eyebrow">Організатор</p>
              <div className="owner-card__profile">
                <Avatar src={webinar.owner.avatarUrl} name={webinar.owner.username} size="md" />
                <div>
                  <p className="owner-card__name">@{webinar.owner.username}</p>
                  <p className="owner-card__bio">{webinar.owner.bio || 'Організатор онлайн-заходів на «Сцені».'}</p>
                </div>
              </div>
              {!webinar.isOwner ? (
                <button type="button" className="text-button" onClick={() => setOwnerReportOpen(true)}>
                  <Icon name="i-flag" size={15} /> Поскаржитися на організатора
                </button>
              ) : null}
            </div>

            <div className="stats-card">
              <p className="owner-card__eyebrow">Статистика заходу</p>
              <dl className="stats-list">
                <div><dt>В обраному</dt><dd>{webinar.favoriteCount}</dd></div>
                <div><dt>Зареєстровано</dt><dd>{webinar.registrationCount}</dd></div>
                <div><dt>Місткість</dt><dd>{webinar.capacity}</dd></div>
                <div><dt>Створено</dt><dd>{formatDateTime(webinar.createdAt)}</dd></div>
              </dl>
            </div>
          </aside>
        </div>
      </div>

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSuccess={(message) => setFlash(message)}
        targetType="WEBINAR"
        targetId={webinar.id}
        targetName={webinar.title}
      />
      <ReportDialog
        open={ownerReportOpen}
        onClose={() => setOwnerReportOpen(false)}
        onSuccess={(message) => setFlash(message)}
        targetType="USER"
        targetId={webinar.owner.id}
        targetName={`@${webinar.owner.username}`}
      />

      <Modal
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        title={confirmAction ? CONFIRM_COPY[confirmAction].title : ''}
        description={confirmAction ? CONFIRM_COPY[confirmAction].text : ''}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmAction(null)}>Назад</button>
            <button type="button" className="btn btn--danger" onClick={() => void executeConfirmed()} disabled={busy !== null}>
              {confirmAction ? CONFIRM_COPY[confirmAction].label : 'Підтвердити'}
            </button>
          </>
        }
      >
        <p className="detail-text">Переконайтеся, що хочете продовжити. Дію буде зафіксовано в історії заходу.</p>
      </Modal>
    </div>
  );
}
