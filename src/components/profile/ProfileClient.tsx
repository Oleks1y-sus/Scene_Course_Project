'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, LoadingBlock, ModerationBadge, StatusBadge } from '@/components/ui/Badges';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import {
  apiDelete,
  apiGet,
  apiGetPage,
  apiPatch,
  apiPost,
  apiRequest,
  ApiError,
  buildQuery,
  errorMessage,
} from '@/lib/api';
import { useNow } from '@/lib/useNow';
import {
  AVATAR_PRESETS,
  MODERATION_LABELS,
  PAGE_SIZE,
  USER_ROLE_LABELS,
} from '@/lib/constants';
import {
  formatDate,
  formatDateTime,
  formatTime,
  isValidEmail,
  isValidHandle,
  passwordChecks,
  passwordScore,
} from '@/lib/format';
import type {
  PageMeta,
  ProfileStats,
  UploadResult,
  User,
  WebinarCard,
} from '@/lib/types';

type Tab = 'overview' | 'favorites' | 'attended' | 'created' | 'settings' | 'security';

const TABS: { key: Tab; label: string; icon: Parameters<typeof Icon>[0]['name'] }[] = [
  { key: 'overview', label: 'Огляд', icon: 'i-chart' },
  { key: 'favorites', label: 'Обране', icon: 'i-heart' },
  { key: 'attended', label: 'Відвідані', icon: 'i-calendar' },
  { key: 'created', label: 'Створені', icon: 'i-play' },
  { key: 'settings', label: 'Налаштування', icon: 'i-settings' },
  { key: 'security', label: 'Безпека', icon: 'i-lock' },
];

const EMPTY_META: PageMeta = { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };

export function ProfileClient({ initialTab, notice }: { initialTab?: string; notice?: string }) {
  const router = useRouter();
  const { user, loading, setUser, refresh } = useAuth();
  const [tab, setTab] = useState<Tab>(
    TABS.some((item) => item.key === initialTab) ? (initialTab as Tab) : 'overview',
  );
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [items, setItems] = useState<WebinarCard[]>([]);
  const [meta, setMeta] = useState<PageMeta>(EMPTY_META);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [flash, setFlash] = useState(notice === 'moderation' ? 'Захід створено та надіслано на модерацію.' : '');
  const [recent, setRecent] = useState<WebinarCard[]>([]);
  const requestRef = useRef(0);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await apiGet<ProfileStats>('/users/me/stats');
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace('/login?next=/profile');
  }, [loading, user, router]);

  useEffect(() => {
    void loadStats();
  }, [loadStats, reloadKey]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(''), 5000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  useEffect(() => {
    if (tab === 'overview') {
      apiGetPage<WebinarCard>('/webinars?mine=true&scope=all&limit=3')
        .then((result) => setRecent(result.data))
        .catch(() => setRecent([]));
    }
  }, [tab, reloadKey]);

  useEffect(() => {
    if (tab !== 'favorites' && tab !== 'attended' && tab !== 'created') return;
    const requestId = ++requestRef.current;
    setListLoading(true);
    setListError('');
    const query = buildQuery({
      scope: 'all',
      page,
      limit: PAGE_SIZE,
      ...(tab === 'favorites' ? { favorites: 'true' } : {}),
      ...(tab === 'attended' ? { attended: 'true' } : {}),
      ...(tab === 'created' ? { mine: 'true' } : {}),
      sort: tab === 'created' ? 'newest' : 'soonest',
    });

    apiGetPage<WebinarCard>(`/webinars${query}`)
      .then((result) => {
        if (requestId !== requestRef.current) return;
        setItems(result.data);
        setMeta(result.meta);
      })
      .catch((caught) => {
        if (requestId !== requestRef.current) return;
        setListError(errorMessage(caught));
      })
      .finally(() => {
        if (requestId !== requestRef.current) return;
        setListLoading(false);
      });
  }, [tab, page, reloadKey]);

  const refreshData = () => setReloadKey((value) => value + 1);

  if (loading || !user) {
    return (
      <div className="app-page">
        <div className="container"><LoadingBlock rows={4} /></div>
      </div>
    );
  }

  return (
    <div className="app-page profile-page">
      <div className="container">
        <header className="profile-header">
          <div className="profile-header__identity">
            <Avatar src={user.avatarUrl} name={user.username} size="xl" />
            <div>
              <p className="profile-header__eyebrow">{USER_ROLE_LABELS[user.role]}</p>
              <h1 className="profile-header__name">@{user.username}</h1>
              <p className="profile-header__email"><Icon name="i-mail" size={15} /> {user.email}</p>
              <p className="profile-header__joined">На «Сцені» з {formatDate(user.createdAt)}</p>
            </div>
          </div>
          <div className="profile-header__actions">
            {user.role === 'ADMIN' ? (
              <Link href="/admin" className="btn btn--ghost"><Icon name="i-shield" size={17} /> Адмінпанель</Link>
            ) : null}
            <Link href="/create" className="btn btn--primary"><Icon name="i-plus" size={17} /> Створити захід</Link>
          </div>
        </header>

        {flash ? <p className="flash-message" role="status"><Icon name="i-check" size={17} />{flash}</p> : null}

        {user.mustChangePassword ? (
          <div className="moderation-alert" role="alert">
            <Icon name="i-lock" size={22} />
            <div>
              <strong>Змініть тимчасовий пароль</strong>
              <p>Ваш акаунт створено адміністратором. Щоб отримати доступ до керування, встановіть власний пароль у розділі «Безпека».</p>
            </div>
          </div>
        ) : null}

        <div className="profile-layout">
          <aside className="profile-tabs" aria-label="Розділи профілю">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`profile-tab ${tab === item.key ? 'is-active' : ''}`}
                onClick={() => setTab(item.key)}
                aria-current={tab === item.key ? 'page' : undefined}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
                {item.key === 'overview' && stats ? <span className="profile-tab__count">{stats.created.total}</span> : null}
              </button>
            ))}
          </aside>

          <div className="profile-content">
            {tab === 'overview' ? (
              <OverviewTab
                stats={stats}
                loading={statsLoading}
                recent={recent}
                user={user}
                onOpenTab={setTab}
              />
            ) : null}

            {tab === 'favorites' || tab === 'attended' || tab === 'created' ? (
              <section aria-labelledby="profile-list-title">
                <div className="section-heading">
                  <div>
                    <h2 className="section-heading__title" id="profile-list-title">
                      {tab === 'favorites' ? 'Обрані заходи' : tab === 'attended' ? 'Відвідані заходи' : 'Створені заходи'}
                    </h2>
                    <p className="section-heading__text">
                      {tab === 'favorites'
                        ? 'Заходи, які ви зберегли для подальшого перегляду.'
                        : tab === 'attended'
                          ? 'Історія ваших реєстрацій та відвідувань.'
                          : 'Керуйте своїми подіями та слідкуйте за статистикою.'}
                    </p>
                  </div>
                  {tab === 'created' ? <Link href="/create" className="btn btn--primary btn--small"><Icon name="i-plus" size={16} /> Новий</Link> : null}
                </div>

                {listError ? (
                  <div className="inline-error" role="alert">
                    <Icon name="i-alert" size={20} />
                    <div><p>{listError}</p><button type="button" className="text-button" onClick={refreshData}>Спробувати ще раз</button></div>
                  </div>
                ) : listLoading ? (
                  <LoadingBlock rows={4} />
                ) : items.length === 0 ? (
                  <EmptyState
                    icon={tab === 'favorites' ? 'i-heart' : tab === 'attended' ? 'i-calendar' : 'i-play'}
                    title={tab === 'favorites' ? 'Обране поки порожнє' : tab === 'attended' ? 'Ви ще не відвідували заходи' : 'У вас ще немає створених заходів'}
                    text={tab === 'favorites' ? 'Додавайте цікаві події серцем у каталозі.' : tab === 'attended' ? 'Знайдіть захід у каталозі та зареєструйтеся.' : 'Створіть перший захід і запросіть аудиторію.'}
                    action={<Link href={tab === 'created' ? '/create' : '/events'} className="btn btn--primary">{tab === 'created' ? 'Створити захід' : 'До каталогу'}</Link>}
                  />
                ) : (
                  <>
                    <div className="profile-list">
                      {items.map((webinar) => (
                        <ProfileWebinarRow
                          key={webinar.id}
                          webinar={webinar}
                          kind={tab}
                          onRemoved={() => {
                            setItems((current) => current.filter((item) => item.id !== webinar.id));
                            refreshData();
                          }}
                          onRefresh={refreshData}
                        />
                      ))}
                    </div>
                    <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} disabled={listLoading} />
                  </>
                )}
              </section>
            ) : null}

            {tab === 'settings' ? (
              <SettingsTab
                user={user}
                setUser={setUser}
                onFlash={setFlash}
              />
            ) : null}

            {tab === 'security' ? (
              <SecurityTab user={user} setUser={setUser} onFlash={setFlash} onRefresh={refresh} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  stats,
  loading,
  recent,
  user,
  onOpenTab,
}: {
  stats: ProfileStats | null;
  loading: boolean;
  recent: WebinarCard[];
  user: User;
  onOpenTab: (tab: Tab) => void;
}) {
  if (loading || !stats) return <LoadingBlock rows={3} />;

  return (
    <section aria-labelledby="overview-title">
      <div className="section-heading">
        <div>
          <h2 className="section-heading__title" id="overview-title">Ваша статистика</h2>
          <p className="section-heading__text">Короткий огляд активності на платформі.</p>
        </div>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-card__icon"><Icon name="i-play" size={20} /></span>
          <p className="stat-card__value">{stats.created.total}</p>
          <p className="stat-card__label">Створено заходів</p>
          <p className="stat-card__hint">{stats.created.upcoming} заплановано · {stats.created.live} в ефірі</p>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon"><Icon name="i-heart" size={20} /></span>
          <p className="stat-card__value">{stats.favoriteReceived}</p>
          <p className="stat-card__label">Додали ваші заходи в обране</p>
          <p className="stat-card__hint">За весь час</p>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon"><Icon name="i-users" size={20} /></span>
          <p className="stat-card__value">{stats.registrationsReceived}</p>
          <p className="stat-card__label">Реєстрацій на ваші заходи</p>
          <p className="stat-card__hint">Разом з активними</p>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon"><Icon name="i-star" size={20} /></span>
          <p className="stat-card__value">{stats.favoriteCount}</p>
          <p className="stat-card__label">Заходів в обраному</p>
          <p className="stat-card__hint">{stats.attendedCount} відвідано</p>
        </article>
      </div>

      <div className="overview-grid">
        <section className="panel" aria-labelledby="status-breakdown">
          <h3 className="panel__title" id="status-breakdown">Статуси ваших заходів</h3>
          <ul className="breakdown-list">
            <li><span>Заплановано</span><strong>{stats.created.upcoming}</strong></li>
            <li><span>У прямому ефірі</span><strong>{stats.created.live}</strong></li>
            <li><span>Завершено</span><strong>{stats.created.completed}</strong></li>
            <li><span>Скасовано</span><strong>{stats.created.cancelled}</strong></li>
            <li><span>На модерації</span><strong>{stats.created.pendingModeration}</strong></li>
          </ul>
          <button type="button" className="text-button" onClick={() => onOpenTab('created')}>
            Переглянути створені <Icon name="i-arrow-right" size={15} />
          </button>
        </section>

        <section className="panel" aria-labelledby="recent-created">
          <h3 className="panel__title" id="recent-created">Останні створені</h3>
          {recent.length === 0 ? (
            <p className="panel__empty">Ви ще не створювали заходів.</p>
          ) : (
            <ul className="mini-list">
              {recent.map((webinar) => (
                <li key={webinar.id}>
                  <Link href={`/events/${webinar.id}`} className="mini-list__item">
                    <img src={webinar.coverUrl} alt={`Обкладинка «${webinar.title}»`} width="80" height="45" loading="lazy" />
                    <span>
                      <strong>{webinar.title}</strong>
                      <small>{formatDateTime(webinar.startsAt)}</small>
                    </span>
                    <StatusBadge status={webinar.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="text-button" onClick={() => onOpenTab('created')}>
            Усі створені <Icon name="i-arrow-right" size={15} />
          </button>
        </section>
      </div>

      <div className="profile-tip">
        <Icon name="i-sparkles" size={20} />
        <p>
          {user.role === 'ADMIN'
            ? 'Ви маєте доступ до адмінпанелі. Перевіряйте скарги та модеруйте заходи.'
            : 'Додавайте цікаві заходи в обране, щоб не загубити їх, і стежте за своєю статистикою.'}
        </p>
        {user.role === 'ADMIN' ? <Link href="/admin" className="text-button">До адмінпанелі <Icon name="i-arrow-right" size={15} /></Link> : null}
      </div>
    </section>
  );
}

function ProfileWebinarRow({
  webinar,
  kind,
  onRemoved,
  onRefresh,
}: {
  webinar: WebinarCard;
  kind: 'favorites' | 'attended' | 'created';
  onRemoved: () => void;
  onRefresh: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const now = useNow();
  const startAvailable = now > 0 && new Date(webinar.startsAt).getTime() <= now;

  const run = async (key: string, action: () => Promise<unknown>, after?: () => void) => {
    setBusy(key);
    setError('');
    try {
      await action();
      after?.();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="profile-row">
      <img src={webinar.coverUrl} alt={`Обкладинка «${webinar.title}»`} width="120" height="68" loading="lazy" />
      <div className="profile-row__main">
        <div className="profile-row__top">
          <Link href={`/events/${webinar.id}`} className="profile-row__title">{webinar.title}</Link>
          <StatusBadge status={webinar.status} />
          <ModerationBadge status={webinar.moderationStatus} />
        </div>
        <p className="profile-row__meta">
          <span><Icon name="i-calendar" size={14} /> {formatDateTime(webinar.startsAt)}</span>
          <span><Icon name="i-heart" size={14} /> {webinar.favoriteCount}</span>
          <span><Icon name="i-users" size={14} /> {webinar.registrationCount}</span>
          {webinar.moderationStatus !== 'VISIBLE' ? <span>· {MODERATION_LABELS[webinar.moderationStatus]}</span> : null}
        </p>
        {error ? <p className="form__error" role="alert">{error}</p> : null}
      </div>
      <div className="profile-row__actions">
        {kind === 'favorites' ? (
          <button
            type="button"
            className="icon-button is-active"
            title="Прибрати з обраного"
            aria-label="Прибрати з обраного"
            disabled={busy !== null}
            onClick={() => void run('remove', () => apiDelete(`/webinars/${webinar.id}/favorite`), onRemoved)}
          >
            <Icon name="i-heart-filled" size={17} />
          </button>
        ) : null}

        {kind === 'attended' && webinar.isRegistered && (webinar.status === 'UPCOMING' || webinar.status === 'LIVE') ? (
          <button
            type="button"
            className="btn btn--ghost btn--small"
            disabled={busy !== null}
            onClick={() => void run('cancel', () => apiDelete(`/webinars/${webinar.id}/register`), onRefresh)}
          >
            Скасувати
          </button>
        ) : null}

        {kind === 'created' ? (
          <>
            <Link href={`/events/${webinar.id}/edit`} className="btn btn--ghost btn--small">Редагувати</Link>
            {webinar.canStart ? (
              startAvailable ? (
                <button type="button" className="btn btn--live btn--small" disabled={busy !== null} onClick={() => void run('start', () => apiPost(`/webinars/${webinar.id}/start`), onRefresh)}>
                  <Icon name="i-play" size={14} /> Почати
                </button>
              ) : (
                <button type="button" className="btn btn--ghost btn--small" disabled title="Захід ще не почався">
                  <Icon name="i-clock" size={14} /> О {formatTime(webinar.startsAt)}
                </button>
              )
            ) : null}
            {webinar.canEnd ? (
              <button type="button" className="btn btn--ghost btn--small" disabled={busy !== null} onClick={() => void run('end', () => apiPost(`/webinars/${webinar.id}/end`), onRefresh)}>
                <Icon name="i-stop" size={14} /> Завершити
              </button>
            ) : null}
          </>
        ) : null}

        <Link href={`/events/${webinar.id}`} className="icon-button" aria-label={`Відкрити «${webinar.title}»`}>
          <Icon name="i-arrow-right" size={17} />
        </Link>
      </div>
    </article>
  );
}

function SettingsTab({
  user,
  setUser,
  onFlash,
}: {
  user: User;
  setUser: (user: User) => void;
  onFlash: (message: string) => void;
}) {
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailFields, setEmailFields] = useState<Record<string, string>>({});

  useEffect(() => {
    setUsername(user.username);
    setBio(user.bio ?? '');
  }, [user]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setFields({});

    if (!isValidHandle(username)) {
      setFields({ username: 'Юзернейм: 3–30 символів, латиниця, цифри або підкреслення.' });
      return;
    }

    setSaving(true);
    try {
      const result = await apiPatch<{ user: User }>('/users/me', {
        username: username.trim().toLowerCase(),
        bio: bio.trim() || null,
      });
      setUser(result.user);
      onFlash('Профіль оновлено.');
    } catch (caught) {
      setError(errorMessage(caught));
      if (caught instanceof ApiError) setFields(caught.fields ?? {});
    } finally {
      setSaving(false);
    }
  };

  const choosePreset = async (preset: string) => {
    setAvatarBusy(true);
    setAvatarError('');
    try {
      const result = await apiPatch<{ user: User }>('/users/me', { avatarPreset: preset });
      setUser(result.user);
      onFlash('Аватар оновлено.');
    } catch (caught) {
      setAvatarError(errorMessage(caught));
    } finally {
      setAvatarBusy(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    setAvatarError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Підтримуються лише JPEG, PNG або WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Максимальний розмір — 2 МБ.');
      return;
    }
    setAvatarBusy(true);
    try {
      const body = new FormData();
      body.append('image', file);
      const upload = await apiRequest<UploadResult>('/uploads/avatar', { method: 'POST', body });
      const result = await apiPatch<{ user: User }>('/users/me', { avatarMediaId: upload.data.id });
      setUser(result.user);
      onFlash('Аватар оновлено.');
    } catch (caught) {
      setAvatarError(errorMessage(caught));
    } finally {
      setAvatarBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const changeEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setEmailError('');
    setEmailFields({});

    if (!isValidEmail(newEmail)) {
      setEmailFields({ newEmail: 'Введіть коректну пошту.' });
      return;
    }
    if (!emailPassword) {
      setEmailFields({ password: 'Введіть поточний пароль.' });
      return;
    }

    setEmailBusy(true);
    try {
      const result = await apiPatch<{ user: User }>('/users/me/email', {
        newEmail: newEmail.trim().toLowerCase(),
        password: emailPassword,
      });
      setUser(result.user);
      setNewEmail('');
      setEmailPassword('');
      onFlash('Електронну пошту змінено.');
    } catch (caught) {
      setEmailError(errorMessage(caught));
      if (caught instanceof ApiError) setEmailFields(caught.fields ?? {});
    } finally {
      setEmailBusy(false);
    }
  };

  return (
    <section aria-labelledby="settings-title">
      <div className="section-heading">
        <div>
          <h2 className="section-heading__title" id="settings-title">Налаштування профілю</h2>
          <p className="section-heading__text">
            Публічно видно лише юзернейм. Логін і пошта залишаються приватними.
          </p>
        </div>
      </div>

      <div className="settings-stack">
        <section className="panel" aria-labelledby="avatar-title">
          <h3 className="panel__title" id="avatar-title">Аватар</h3>
          <div className="avatar-editor">
            <Avatar src={user.avatarUrl} name={user.username} size="xl" />
            <div>
              <p className="panel__text">Оберіть готовий варіант або завантажте власне фото.</p>
              <div className="avatar-options">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    className={`avatar-option ${user.avatarPreset === preset.key && user.avatarUrl.includes('/img/avatars/') ? 'is-active' : ''}`}
                    onClick={() => void choosePreset(preset.key)}
                    disabled={avatarBusy}
                    aria-label={`Обрати аватар ${preset.key}`}
                    aria-pressed={user.avatarPreset === preset.key}
                  >
                    <img src={preset.url} alt="" width="48" height="48" />
                  </button>
                ))}
              </div>
              <div className="avatar-editor__actions">
                <button type="button" className="btn btn--ghost btn--small" onClick={() => fileRef.current?.click()} disabled={avatarBusy}>
                  <Icon name="i-upload" size={15} /> {avatarBusy ? 'Завантаження…' : 'Завантажити фото'}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  className="sr-only"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadAvatar(file);
                  }}
                  aria-label="Завантажити аватар"
                />
              </div>
              {avatarError ? <p className="form__error">{avatarError}</p> : null}
            </div>
          </div>
        </section>

        <section className="panel" aria-labelledby="public-profile-title">
          <h3 className="panel__title" id="public-profile-title">Публічний профіль</h3>
          <form className="form" onSubmit={saveProfile} noValidate>
            <div className="form__group">
              <label className="form__label" htmlFor="profile-username">Юзернейм</label>
              <input
                className={`form__control ${fields.username ? 'is-invalid' : ''}`}
                id="profile-username"
                type="text"
                maxLength={30}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                aria-invalid={Boolean(fields.username)}
                aria-describedby="profile-username-help"
              />
              <p className="form__hint" id="profile-username-help">
                Публічне ім’я на платформі. 3–30 символів: латиниця, цифри, підкреслення.
              </p>
              {fields.username ? <p className="form__error">{fields.username}</p> : null}
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="profile-bio">Про себе <span className="form__hint">(до 280 символів)</span></label>
              <textarea
                className={`form__control form__control--textarea ${fields.bio ? 'is-invalid' : ''}`}
                id="profile-bio"
                rows={4}
                maxLength={280}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                aria-invalid={Boolean(fields.bio)}
              />
              <div className="form__meta">
                {fields.bio ? <p className="form__error">{fields.bio}</p> : <span />}
                <span>{bio.length}/280</span>
              </div>
            </div>
            {error ? <p className="form__alert" role="alert">{error}</p> : null}
            <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Зберігаємо…' : 'Зберегти профіль'}</button>
          </form>
        </section>

        <section className="panel" aria-labelledby="credentials-title">
          <h3 className="panel__title" id="credentials-title">Дані входу</h3>
          <dl className="stats-list">
            <div><dt>Юзернейм</dt><dd>@{user.username}</dd></div>
            <div><dt>Логін</dt><dd>{user.login}</dd></div>
            <div><dt>Пошта</dt><dd>{user.email}</dd></div>
          </dl>
          <p className="form__hint">
            Логін змінити не можна. Пошту можна змінити, підтвердивши поточний пароль.
          </p>
          <form className="form form--inline" onSubmit={changeEmail} noValidate>
            <div className="form__group">
              <label className="form__label" htmlFor="new-email">Нова пошта</label>
              <input
                className={`form__control ${emailFields.newEmail ? 'is-invalid' : ''}`}
                id="new-email"
                type="email"
                maxLength={254}
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                required
                placeholder="new@example.com"
              />
              {emailFields.newEmail ? <p className="form__error">{emailFields.newEmail}</p> : null}
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="email-password">Поточний пароль</label>
              <input
                className={`form__control ${emailFields.password ? 'is-invalid' : ''}`}
                id="email-password"
                type="password"
                maxLength={128}
                value={emailPassword}
                onChange={(event) => setEmailPassword(event.target.value)}
                required
                autoComplete="current-password"
              />
              {emailFields.password ? <p className="form__error">{emailFields.password}</p> : null}
            </div>
            {emailError ? <p className="form__alert" role="alert">{emailError}</p> : null}
            <button type="submit" className="btn btn--ghost" disabled={emailBusy}>
              {emailBusy ? 'Зберігаємо…' : 'Змінити пошту'}
            </button>
          </form>
        </section>
      </div>
    </section>
  );
}

function SecurityTab({
  user,
  setUser,
  onFlash,
  onRefresh,
}: {
  user: User;
  setUser: (user: User | null) => void;
  onFlash: (message: string) => void;
  onRefresh: () => Promise<User | null>;
}) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  const checks = passwordChecks(newPassword);
  const strength = passwordScore(newPassword);

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setFields({});
    if (newPassword !== confirm) {
      setFields({ confirm: 'Паролі не збігаються.' });
      return;
    }
    if (Object.values(checks).some((value) => !value)) {
      setFields({ newPassword: 'Пароль не відповідає вимогам безпеки.' });
      return;
    }
    setBusy(true);
    try {
      await apiPatch('/users/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      onFlash('Пароль змінено. Інші сесії завершено.');
      await onRefresh();
    } catch (caught) {
      setError(errorMessage(caught));
      if (caught instanceof ApiError) setFields(caught.fields ?? {});
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setDeleteError('');
    if (deleteConfirm.trim().toUpperCase() !== 'ВИДАЛИТИ') {
      setDeleteError('Введіть слово ВИДАЛИТИ для підтвердження.');
      return;
    }
    setDeleteBusy(true);
    try {
      await apiDelete('/users/me', { password: deletePassword });
      setUser(null);
      router.push('/');
      router.refresh();
    } catch (caught) {
      setDeleteError(errorMessage(caught));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <section aria-labelledby="security-title">
      <div className="section-heading">
        <div>
          <h2 className="section-heading__title" id="security-title">Безпека акаунта</h2>
          <p className="section-heading__text">Керуйте паролем і переглядайте стан захисту.</p>
        </div>
      </div>

      {user.mustChangePassword ? (
        <div className="moderation-alert" role="alert">
          <Icon name="i-lock" size={22} />
          <div>
            <strong>Потрібно змінити тимчасовий пароль</strong>
            <p>Після зміни пароля ви отримаєте повний доступ до функцій платформи.</p>
          </div>
        </div>
      ) : null}

      <div className="settings-stack">
        <section className="panel" aria-labelledby="password-title">
          <h3 className="panel__title" id="password-title">Зміна пароля</h3>
          <form className="form" onSubmit={changePassword} noValidate>
            <div className="form__group">
              <label className="form__label" htmlFor="current-password">Поточний пароль</label>
              <input
                className={`form__control ${fields.currentPassword ? 'is-invalid' : ''}`}
                id="current-password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
              {fields.currentPassword ? <p className="form__error">{fields.currentPassword}</p> : null}
            </div>
            <div className="form__row">
              <div className="form__group">
                <label className="form__label" htmlFor="new-password">Новий пароль</label>
                <input
                  className={`form__control ${fields.newPassword ? 'is-invalid' : ''}`}
                  id="new-password"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
              </div>
              <div className="form__group">
                <label className="form__label" htmlFor="confirm-password">Повторіть новий пароль</label>
                <input
                  className={`form__control ${fields.confirm ? 'is-invalid' : ''}`}
                  id="confirm-password"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  required
                />
                {fields.confirm ? <p className="form__error">{fields.confirm}</p> : null}
              </div>
            </div>
            <div className="password-meter" aria-hidden="true">
              {[1, 2, 3, 4].map((level) => (
                <span key={level} className={strength >= level ? `is-filled strength-${strength}` : ''} />
              ))}
            </div>
            <ul className="password-hints">
              <li className={checks.length ? 'is-met' : ''}>10+ символів</li>
              <li className={checks.lower ? 'is-met' : ''}>мала літера</li>
              <li className={checks.upper ? 'is-met' : ''}>велика літера</li>
              <li className={checks.digit ? 'is-met' : ''}>цифра</li>
            </ul>
            <label className="form__check">
              <input type="checkbox" checked={show} onChange={(event) => setShow(event.target.checked)} />
              <span>Показати паролі</span>
            </label>
            {error ? <p className="form__alert" role="alert">{error}</p> : null}
            <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Зберігаємо…' : 'Змінити пароль'}</button>
          </form>
        </section>

        <section className="panel" aria-labelledby="account-info-title">
          <h3 className="panel__title" id="account-info-title">Дані акаунта</h3>
          <dl className="stats-list">
            <div><dt>Юзернейм</dt><dd>@{user.username}</dd></div>
            <div><dt>Логін</dt><dd>{user.login}</dd></div>
            <div><dt>Пошта</dt><dd>{user.email}</dd></div>
            <div><dt>Роль</dt><dd>{USER_ROLE_LABELS[user.role]}</dd></div>
            <div><dt>Захист входу</dt><dd>Логін + пароль</dd></div>
          </dl>
        </section>

        <section className="panel panel--danger" aria-labelledby="danger-title">
          <h3 className="panel__title" id="danger-title">Видалення акаунта</h3>
          <p className="panel__text">
            Акаунт буде деактивовано, а всі створені заходи — приховано та скасовано. Цю дію не можна
            скасувати самостійно.
          </p>
          <button type="button" className="btn btn--danger-ghost" onClick={() => setDeleteOpen(true)}>
            Видалити акаунт
          </button>
        </section>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Видалити акаунт назавжди?"
        description="Усі ваші заходи буде скасовано й приховано. Відновлення можливе лише через адміністратора."
        size="sm"
      >
        <form className="form" onSubmit={deleteAccount} noValidate>
          <div className="form__group">
            <label className="form__label" htmlFor="delete-password">Пароль</label>
            <input
              className="form__control"
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              required
            />
          </div>
          <div className="form__group">
            <label className="form__label" htmlFor="delete-confirm">Введіть <strong>ВИДАЛИТИ</strong></label>
            <input
              className="form__control"
              id="delete-confirm"
              type="text"
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              required
            />
          </div>
          {deleteError ? <p className="form__alert" role="alert">{deleteError}</p> : null}
          <div className="form__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setDeleteOpen(false)}>Скасувати</button>
            <button type="submit" className="btn btn--danger" disabled={deleteBusy}>
              {deleteBusy ? 'Видаляємо…' : 'Видалити акаунт'}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
