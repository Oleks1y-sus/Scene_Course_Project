'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
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
  buildQuery,
  errorMessage,
} from '@/lib/api';
import {
  CATEGORY_LABELS,
  MODERATION_LABELS,
  REPORT_REASON_LABELS,
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
} from '@/lib/constants';
import { formatDate, formatDateTime } from '@/lib/format';
import type {
  AdminAuditItem,
  AdminReport,
  AdminStats,
  AdminUser,
  PageMeta,
  WebinarCard,
} from '@/lib/types';

type AdminTab = 'reports' | 'webinars' | 'users' | 'audit';
type ResolveAction =
  | 'HIDE_WEBINAR'
  | 'RESTORE_WEBINAR'
  | 'SHADOW_BAN_USER'
  | 'BAN_USER'
  | 'ACTIVATE_USER'
  | 'DISMISS';

const EMPTY_META: PageMeta = { page: 1, limit: 15, total: 0, totalPages: 1 };

const TABS: { key: AdminTab; label: string; icon: Parameters<typeof Icon>[0]['name'] }[] = [
  { key: 'reports', label: 'Скарги', icon: 'i-flag' },
  { key: 'webinars', label: 'Заходи', icon: 'i-calendar' },
  { key: 'users', label: 'Користувачі', icon: 'i-users' },
  { key: 'audit', label: 'Журнал дій', icon: 'i-chart' },
];

const AUDIT_LABELS: Record<string, string> = {
  REPORT_HIDE_WEBINAR: 'Захід приховано за скаргою',
  REPORT_RESTORE_WEBINAR: 'Захід відновлено',
  REPORT_SHADOW_BAN_USER: 'Користувача в тіньовий бан',
  REPORT_BAN_USER: 'Користувача заблоковано',
  REPORT_ACTIVATE_USER: 'Користувача активовано',
  REPORT_DISMISS: 'Скаргу відхилено',
  WEBINAR_MODERATION: 'Змінено модерацію заходу',
  WEBINAR_DELETE: 'Захід видалено',
  USER_UPDATE: 'Оновлено користувача',
  USER_DELETE: 'Користувача видалено',
  ADMIN_CREATE: 'Створено адміністратора',
  AUTO_HIDE_WEBINAR: 'Автоматичне приховування за скаргами',
};

const ACTION_LABELS: Record<ResolveAction, string> = {
  HIDE_WEBINAR: 'Приховати захід',
  RESTORE_WEBINAR: 'Відновити захід',
  SHADOW_BAN_USER: 'Тіньовий бан',
  BAN_USER: 'Заблокувати користувача',
  ACTIVATE_USER: 'Активувати користувача',
  DISMISS: 'Відхилити скаргу',
};

const resolveActionsFor = (report: AdminReport | null): ResolveAction[] => {
  if (!report) return ['DISMISS'];

  if (report.targetType === 'WEBINAR') {
    return report.webinarModeration === 'VISIBLE'
      ? ['HIDE_WEBINAR', 'DISMISS']
      : ['RESTORE_WEBINAR', 'DISMISS'];
  }

  switch (report.targetUserStatus) {
    case 'ACTIVE':
      return ['SHADOW_BAN_USER', 'BAN_USER', 'DISMISS'];
    case 'SHADOW_BANNED':
      return ['ACTIVATE_USER', 'BAN_USER', 'DISMISS'];
    case 'BANNED':
      return ['ACTIVATE_USER', 'DISMISS'];
    default:
      return ['DISMISS'];
  }
};

export function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<AdminTab>('reports');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportMeta, setReportMeta] = useState<PageMeta>(EMPTY_META);
  const [reportStatus, setReportStatus] = useState<'OPEN' | 'RESOLVED' | 'DISMISSED' | 'all'>('OPEN');
  const [reportTarget, setReportTarget] = useState<'' | 'WEBINAR' | 'USER'>('');
  const [reportPage, setReportPage] = useState(1);
  const [reportsLoading, setReportsLoading] = useState(false);

  const [webinars, setWebinars] = useState<WebinarCard[]>([]);
  const [webinarMeta, setWebinarMeta] = useState<PageMeta>(EMPTY_META);
  const [webinarSearch, setWebinarSearch] = useState('');
  const [webinarQuery, setWebinarQuery] = useState('');
  const [webinarModeration, setWebinarModeration] = useState('');
  const [webinarPage, setWebinarPage] = useState(1);
  const [webinarsLoading, setWebinarsLoading] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userMeta, setUserMeta] = useState<PageMeta>(EMPTY_META);
  const [userSearch, setUserSearch] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userStatus, setUserStatus] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);

  const [auditItems, setAuditItems] = useState<AdminAuditItem[]>([]);
  const [auditMeta, setAuditMeta] = useState<PageMeta>(EMPTY_META);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);

  const [reportToResolve, setReportToResolve] = useState<AdminReport | null>(null);
  const [resolveAction, setResolveAction] = useState<ResolveAction>('DISMISS');
  const [resolveNote, setResolveNote] = useState('');
  const [resolveBusy, setResolveBusy] = useState(false);

  const [confirm, setConfirm] = useState<{
    title: string;
    text: string;
    label: string;
    danger?: boolean;
    run: () => Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminLogin, setAdminLogin] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminResult, setAdminResult] = useState<{
    temporaryPassword: string;
    username: string;
    login: string;
    email: string;
  } | null>(null);

  const refresh = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    setStatsLoading(true);
    apiGet<AdminStats>('/admin/stats')
      .then(setStats)
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setStatsLoading(false));
  }, [reloadKey]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(''), 5000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWebinarQuery(webinarSearch.trim());
      setWebinarPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [webinarSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setUserQuery(userSearch.trim());
      setUserPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [userSearch]);

  useEffect(() => {
    if (tab !== 'reports') return;
    setReportsLoading(true);
    setError('');
    const query = buildQuery({
      status: reportStatus,
      targetType: reportTarget || undefined,
      page: reportPage,
      limit: 15,
    });
    apiGetPage<AdminReport>(`/admin/reports${query}`)
      .then((result) => {
        setReports(result.data);
        setReportMeta(result.meta);
      })
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setReportsLoading(false));
  }, [tab, reportStatus, reportTarget, reportPage, reloadKey]);

  useEffect(() => {
    if (tab !== 'webinars') return;
    setWebinarsLoading(true);
    setError('');
    const query = buildQuery({
      q: webinarQuery || undefined,
      moderation: webinarModeration || undefined,
      scope: 'all',
      page: webinarPage,
      limit: 15,
      sort: 'newest',
    });
    apiGetPage<WebinarCard>(`/admin/webinars${query}`)
      .then((result) => {
        setWebinars(result.data);
        setWebinarMeta(result.meta);
      })
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setWebinarsLoading(false));
  }, [tab, webinarQuery, webinarModeration, webinarPage, reloadKey]);

  useEffect(() => {
    if (tab !== 'users') return;
    setUsersLoading(true);
    setError('');
    const query = buildQuery({
      q: userQuery || undefined,
      role: userRole || undefined,
      status: userStatus || undefined,
      page: userPage,
      limit: 15,
    });
    apiGetPage<AdminUser>(`/admin/users${query}`)
      .then((result) => {
        setUsers(result.data);
        setUserMeta(result.meta);
      })
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setUsersLoading(false));
  }, [tab, userQuery, userRole, userStatus, userPage, reloadKey]);

  useEffect(() => {
    if (tab !== 'audit') return;
    setAuditLoading(true);
    const query = buildQuery({ page: auditPage, limit: 20 });
    apiGetPage<AdminAuditItem>(`/admin/audit${query}`)
      .then((result) => {
        setAuditItems(result.data);
        setAuditMeta(result.meta);
      })
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setAuditLoading(false));
  }, [tab, auditPage, reloadKey]);

  const openResolve = (report: AdminReport) => {
    setReportToResolve(report);
    setResolveNote('');
    if (report.targetType === 'WEBINAR') {
      setResolveAction(report.webinarModeration === 'VISIBLE' ? 'HIDE_WEBINAR' : 'RESTORE_WEBINAR');
    } else if (report.targetUserStatus === 'ACTIVE') {
      setResolveAction('SHADOW_BAN_USER');
    } else if (report.targetUserStatus === 'SHADOW_BANNED' || report.targetUserStatus === 'BANNED') {
      setResolveAction('ACTIVATE_USER');
    } else {
      setResolveAction('DISMISS');
    }
  };

  const submitResolve = async () => {
    if (!reportToResolve) return;
    setResolveBusy(true);
    try {
      await apiPatch(`/admin/reports/${reportToResolve.id}`, {
        action: resolveAction,
        note: resolveNote.trim() || undefined,
      });
      setReportToResolve(null);
      setFlash('Рішення за скаргою збережено.');
      refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setResolveBusy(false);
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    try {
      await confirm.run();
      setConfirm(null);
      refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setConfirmBusy(false);
    }
  };

  const moderateWebinar = async (webinar: WebinarCard, moderationStatus: 'VISIBLE' | 'HIDDEN') => {
    try {
      await apiPatch(`/admin/webinars/${webinar.id}`, { moderationStatus, note: moderationStatus === 'HIDDEN' ? 'Приховано адміністратором.' : undefined });
      setFlash(moderationStatus === 'VISIBLE' ? 'Захід опубліковано.' : 'Захід приховано.');
      refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const changeUser = async (target: AdminUser, payload: { role?: 'USER' | 'ADMIN'; status?: 'ACTIVE' | 'SHADOW_BANNED' | 'BANNED' }) => {
    try {
      await apiPatch(`/admin/users/${target.id}`, payload);
      setFlash('Користувача оновлено.');
      refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const submitCreateAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    setAdminError('');
    setAdminBusy(true);
    try {
      const result = await apiPost<{
        user: { username: string; login: string; email: string };
        temporaryPassword: string;
      }>('/admin/admins', {
        username: adminUsername.trim().toLowerCase(),
        login: adminLogin.trim().toLowerCase(),
        email: adminEmail.trim().toLowerCase(),
        password: adminPassword || undefined,
      });
      setAdminResult({
        temporaryPassword: result.temporaryPassword,
        username: result.user.username,
        login: result.user.login,
        email: result.user.email,
      });
      setAdminUsername('');
      setAdminLogin('');
      setAdminEmail('');
      setAdminPassword('');
      refresh();
    } catch (caught) {
      setAdminError(errorMessage(caught));
    } finally {
      setAdminBusy(false);
    }
  };

  return (
    <div className="app-page admin-page">
      <div className="container">
        <header className="page-heading">
          <div>
            <p className="page-heading__eyebrow">Керування платформою</p>
            <h1 className="page-heading__title">Адмінпанель</h1>
            <p className="page-heading__text">
              Скарги, модерація заходів, користувачі та журнал дій. Усі операції перевіряються сервером.
            </p>
          </div>
          <button type="button" className="btn btn--primary" onClick={() => { setAdminResult(null); setAdminError(''); setCreateAdminOpen(true); }}>
            <Icon name="i-shield" size={17} /> Додати адміністратора
          </button>
        </header>

        {flash ? <p className="flash-message" role="status"><Icon name="i-check" size={17} />{flash}</p> : null}
        {error ? <p className="form__alert" role="alert">{error}</p> : null}

        <div className="admin-stats">
          {statsLoading || !stats ? <LoadingBlock rows={1} /> : (
            <>
              <div className="admin-stat"><span>Відкриті скарги</span><strong>{stats.reports.open}</strong></div>
              <div className="admin-stat"><span>На модерації</span><strong>{stats.webinars.pending}</strong></div>
              <div className="admin-stat"><span>Заходи в ефірі</span><strong>{stats.webinars.live}</strong></div>
              <div className="admin-stat"><span>Користувачі</span><strong>{stats.users.active}</strong></div>
              <div className="admin-stat"><span>Тіньовий бан</span><strong>{stats.users.shadowBanned}</strong></div>
              <div className="admin-stat"><span>Заблоковані</span><strong>{stats.users.banned}</strong></div>
            </>
          )}
        </div>

        <div className="admin-tabs" role="group" aria-label="Розділи адмінпанелі">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={tab === item.key}
              className={`admin-tab ${tab === item.key ? 'is-active' : ''}`}
              onClick={() => setTab(item.key)}
            >
              <Icon name={item.icon} size={17} />
              {item.label}
              {item.key === 'reports' && stats ? <span className="admin-tab__badge">{stats.reports.open}</span> : null}
            </button>
          ))}
        </div>

        {tab === 'reports' ? (
          <section className="admin-section" aria-label="Скарги">
            <div className="admin-filters">
              <div className="scope-tabs" role="group" aria-label="Статус скарги">
                {([
                  ['OPEN', 'Відкриті'],
                  ['RESOLVED', 'Вирішені'],
                  ['DISMISSED', 'Відхилені'],
                  ['all', 'Усі'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={reportStatus === value}
                    className={`scope-tabs__tab ${reportStatus === value ? 'is-active' : ''}`}
                    onClick={() => { setReportStatus(value); setReportPage(1); }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="select-field">
                <label className="sr-only" htmlFor="report-target">Тип скарги</label>
                <select id="report-target" value={reportTarget} onChange={(event) => { setReportTarget(event.target.value as typeof reportTarget); setReportPage(1); }}>
                  <option value="">Усі типи</option>
                  <option value="WEBINAR">Заходи</option>
                  <option value="USER">Користувачі</option>
                </select>
              </div>
            </div>

            {reportsLoading ? <LoadingBlock rows={4} /> : reports.length === 0 ? (
              <EmptyState icon="i-shield" title="Скарг немає" text="Усе спокійно. Нові скарги з’являться тут." />
            ) : (
              <div className="report-list">
                {reports.map((report) => (
                  <article key={report.id} className="report-card">
                    <div className="report-card__head">
                      <div className="report-card__badges">
                        <span className={`report-badge report-badge--${report.targetType.toLowerCase()}`}>
                          {report.targetType === 'WEBINAR' ? 'Захід' : 'Користувач'}
                        </span>
                        <span className="report-badge">{REPORT_REASON_LABELS[report.reason]}</span>
                        {report.isAutomated ? <span className="report-badge report-badge--auto"><Icon name="i-sparkles" size={12} /> Авто</span> : null}
                        <span className={`report-status report-status--${report.status.toLowerCase()}`}>
                          {report.status === 'OPEN' ? 'Відкрита' : report.status === 'RESOLVED' ? 'Вирішена' : 'Відхилена'}
                        </span>
                      </div>
                      <time className="report-card__date" dateTime={report.createdAt}>{formatDateTime(report.createdAt)}</time>
                    </div>

                    <h2 className="report-card__title">
                      {report.targetType === 'WEBINAR'
                        ? report.webinarTitle ?? 'Захід видалено'
                        : report.targetUsername ? `@${report.targetUsername}` : 'Користувача видалено'}
                    </h2>
                    <p className="report-card__meta">
                      {report.targetType === 'WEBINAR'
                        ? <>Організатор: @{report.webinarOwnerUsername ?? '—'}{report.webinarStatus ? ` · ${report.webinarStatus}` : ''}</>
                        : <>Статус: {report.targetUserStatus ? USER_STATUS_LABELS[report.targetUserStatus] : '—'}</>}
                    </p>
                    <p className="report-card__reporter">
                      Скаржник: {report.isAutomated
                        ? 'автоматична модерація'
                        : report.reporterUsername
                          ? `@${report.reporterUsername}`
                          : 'видалений користувач'}
                    </p>
                    {report.details ? <blockquote className="report-card__details">{report.details}</blockquote> : null}
                    {report.resolutionNote ? <p className="report-card__resolution">Рішення: {report.resolutionNote}</p> : null}

                    {report.status === 'OPEN' ? (
                      <div className="report-card__actions">
                        <button type="button" className="btn btn--primary btn--small" onClick={() => openResolve(report)}>
                          Розглянути
                        </button>
                        {report.targetType === 'WEBINAR' && report.webinarId ? (
                          <Link href={`/events/${report.webinarId}`} className="btn btn--ghost btn--small">Відкрити захід</Link>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
            <Pagination page={reportMeta.page} totalPages={reportMeta.totalPages} onChange={setReportPage} disabled={reportsLoading} />
          </section>
        ) : null}

        {tab === 'webinars' ? (
          <section className="admin-section" aria-label="Модерація заходів">
            <div className="admin-filters">
              <div className="search-field">
                <Icon name="i-search" size={18} />
                <label className="sr-only" htmlFor="admin-webinar-search">Пошук заходів</label>
                <input id="admin-webinar-search" type="search" placeholder="Пошук за назвою або спікером" value={webinarSearch} onChange={(event) => setWebinarSearch(event.target.value)} />
              </div>
              <div className="select-field">
                <label className="sr-only" htmlFor="admin-webinar-moderation">Модерація</label>
                <select id="admin-webinar-moderation" value={webinarModeration} onChange={(event) => { setWebinarModeration(event.target.value); setWebinarPage(1); }}>
                  <option value="">Усі статуси</option>
                  <option value="VISIBLE">Опубліковано</option>
                  <option value="PENDING">На модерації</option>
                  <option value="HIDDEN">Приховано</option>
                </select>
              </div>
            </div>

            {webinarsLoading ? <LoadingBlock rows={4} /> : webinars.length === 0 ? (
              <EmptyState icon="i-calendar" title="Заходів не знайдено" text="Змініть фільтри або пошуковий запит." />
            ) : (
              <div className="admin-list">
                {webinars.map((webinar) => (
                  <article key={webinar.id} className="admin-row">
                    <img src={webinar.coverUrl} alt={`Обкладинка «${webinar.title}»`} width="96" height="54" loading="lazy" />
                    <div className="admin-row__main">
                      <div className="admin-row__title-line">
                        <Link href={`/events/${webinar.id}`} className="admin-row__title">{webinar.title}</Link>
                        <StatusBadge status={webinar.status} />
                        <ModerationBadge status={webinar.moderationStatus} />
                      </div>
                      <p className="admin-row__meta">
                        @{webinar.owner.username} · {CATEGORY_LABELS[webinar.category]} · {formatDateTime(webinar.startsAt)}
                      </p>
                      <p className="admin-row__meta">
                        В обраному: {webinar.favoriteCount} · Реєстрацій: {webinar.registrationCount} · {MODERATION_LABELS[webinar.moderationStatus]}
                      </p>
                    </div>
                    <div className="admin-row__actions">
                      {webinar.moderationStatus !== 'VISIBLE' ? (
                        <button type="button" className="btn btn--primary btn--small" onClick={() => void moderateWebinar(webinar, 'VISIBLE')}>Опублікувати</button>
                      ) : null}
                      {webinar.moderationStatus !== 'HIDDEN' ? (
                        <button
                          type="button"
                          className="btn btn--ghost btn--small"
                          onClick={() => setConfirm({
                            title: 'Приховати захід?',
                            text: `«${webinar.title}» зникне з публічного каталогу до повторної публікації.`,
                            label: 'Приховати',
                            run: async () => { await moderateWebinar(webinar, 'HIDDEN'); },
                          })}
                        >
                          Приховати
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="icon-button icon-button--danger"
                        aria-label="Видалити захід"
                        onClick={() => setConfirm({
                          title: 'Видалити захід?',
                          text: `«${webinar.title}» буде позначено як видалений. Дію не можна скасувати.`,
                          label: 'Видалити',
                          danger: true,
                          run: async () => {
                            await apiDelete(`/admin/webinars/${webinar.id}`);
                            setFlash('Захід видалено.');
                          },
                        })}
                      >
                        <Icon name="i-trash" size={17} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <Pagination page={webinarMeta.page} totalPages={webinarMeta.totalPages} onChange={setWebinarPage} disabled={webinarsLoading} />
          </section>
        ) : null}

        {tab === 'users' ? (
          <section className="admin-section" aria-label="Користувачі">
            <div className="admin-filters admin-filters--wrap">
              <div className="search-field">
                <Icon name="i-search" size={18} />
                <label className="sr-only" htmlFor="admin-user-search">Пошук користувачів</label>
                <input id="admin-user-search" type="search" placeholder="Пошук за юзернеймом" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} />
              </div>
              <div className="select-field">
                <label className="sr-only" htmlFor="admin-user-role">Роль</label>
                <select id="admin-user-role" value={userRole} onChange={(event) => { setUserRole(event.target.value); setUserPage(1); }}>
                  <option value="">Усі ролі</option>
                  <option value="USER">Учасники</option>
                  <option value="ADMIN">Адміністратори</option>
                </select>
              </div>
              <div className="select-field">
                <label className="sr-only" htmlFor="admin-user-status">Статус</label>
                <select id="admin-user-status" value={userStatus} onChange={(event) => { setUserStatus(event.target.value); setUserPage(1); }}>
                  <option value="">Усі статуси</option>
                  <option value="ACTIVE">Активні</option>
                  <option value="SHADOW_BANNED">Тіньовий бан</option>
                  <option value="BANNED">Заблоковані</option>
                  <option value="DELETED">Видалені</option>
                </select>
              </div>
            </div>

            {usersLoading ? <LoadingBlock rows={4} /> : users.length === 0 ? (
              <EmptyState icon="i-users" title="Користувачів не знайдено" text="Змініть фільтри або запит." />
            ) : (
              <div className="admin-list">
                {users.map((target) => {
                  const isSelf = target.id === user?.id;
                  return (
                    <article key={target.id} className="admin-row">
                      <Avatar src={target.avatarUrl} name={target.username} size="sm" />
                      <div className="admin-row__main">
                        <div className="admin-row__title-line">
                          <span className="admin-row__title">@{target.username}</span>
                          <span className={`role-badge role-badge--${target.role.toLowerCase()}`}>{USER_ROLE_LABELS[target.role]}</span>
                          <span className={`user-status user-status--${target.status.toLowerCase()}`}>{USER_STATUS_LABELS[target.status]}</span>
                          {isSelf ? <span className="report-badge">Це ви</span> : null}
                        </div>
                        <p className="admin-row__meta">На платформі з {formatDate(target.createdAt)}</p>
                        <p className="admin-row__meta">Заходів: {target.webinarCount} · Відкритих скарг: {target.openReports}</p>
                      </div>
                      <div className="admin-row__actions">
                        {!isSelf && target.status !== 'DELETED' ? (
                          <>
                            {target.role === 'USER' ? (
                              <button type="button" className="btn btn--ghost btn--small" onClick={() => void changeUser(target, { role: 'ADMIN' })}>Зробити адміном</button>
                            ) : (
                              <button type="button" className="btn btn--ghost btn--small" onClick={() => void changeUser(target, { role: 'USER' })}>Зняти адміна</button>
                            )}
                            {target.status === 'ACTIVE' ? (
                              <button type="button" className="btn btn--ghost btn--small" onClick={() => void changeUser(target, { status: 'SHADOW_BANNED' })}>Тіньовий бан</button>
                            ) : (
                              <button type="button" className="btn btn--ghost btn--small" onClick={() => void changeUser(target, { status: 'ACTIVE' })}>Активувати</button>
                            )}
                            {target.status !== 'BANNED' ? (
                              <button
                                type="button"
                                className="btn btn--danger-ghost btn--small"
                                onClick={() => setConfirm({
                                  title: 'Заблокувати користувача?',
                                  text: `@${target.username} втратить доступ до акаунта, а сесії буде завершено.`,
                                  label: 'Заблокувати',
                                  danger: true,
                                  run: async () => { await apiPatch(`/admin/users/${target.id}`, { status: 'BANNED' }); setFlash('Користувача заблоковано.'); },
                                })}
                              >
                                Блокувати
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="icon-button icon-button--danger"
                              aria-label="Видалити користувача"
                              onClick={() => setConfirm({
                                title: 'Видалити користувача?',
                                text: `Акаунт @${target.username} буде анонімізовано, а всі створені заходи — скасовано та приховано.`,
                                label: 'Видалити',
                                danger: true,
                                run: async () => {
                                  await apiDelete(`/admin/users/${target.id}`);
                                  setFlash('Користувача видалено.');
                                },
                              })}
                            >
                              <Icon name="i-trash" size={17} />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            <Pagination page={userMeta.page} totalPages={userMeta.totalPages} onChange={setUserPage} disabled={usersLoading} />
          </section>
        ) : null}

        {tab === 'audit' ? (
          <section className="admin-section" aria-label="Журнал дій">
            {auditLoading ? <LoadingBlock rows={4} /> : auditItems.length === 0 ? (
              <EmptyState icon="i-chart" title="Журнал порожній" text="Дії адміністраторів з’являться тут." />
            ) : (
              <ol className="audit-list">
                {auditItems.map((item) => (
                  <li key={item.id} className="audit-item">
                    <span className="audit-item__icon"><Icon name="i-shield" size={16} /></span>
                    <div>
                      <p className="audit-item__title">{AUDIT_LABELS[item.action] ?? item.action}</p>
                      <p className="audit-item__meta">{item.adminUsername ? `@${item.adminUsername}` : 'Система'} · {formatDateTime(item.createdAt)}</p>
                      {item.note ? <p className="audit-item__note">{item.note}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <Pagination page={auditMeta.page} totalPages={auditMeta.totalPages} onChange={setAuditPage} disabled={auditLoading} />
          </section>
        ) : null}
      </div>

      <Modal
        open={reportToResolve !== null}
        onClose={() => setReportToResolve(null)}
        title="Рішення за скаргою"
        description={reportToResolve ? `${reportToResolve.targetType === 'WEBINAR' ? 'Захід' : 'Користувач'}: ${reportToResolve.targetType === 'WEBINAR' ? reportToResolve.webinarTitle : `@${reportToResolve.targetUsername ?? '—'}`}` : ''}
        size="md"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setReportToResolve(null)}>Скасувати</button>
            <button type="button" className="btn btn--primary" onClick={() => void submitResolve()} disabled={resolveBusy}>
              {resolveBusy ? 'Зберігаємо…' : 'Застосувати'}
            </button>
          </>
        }
      >
        <div className="form">
          <fieldset className="report-reasons">
            <legend className="form__label">Дія</legend>
            {resolveActionsFor(reportToResolve).map((action) => (
              <label key={action} className={`report-reason ${resolveAction === action ? 'is-selected' : ''}`}>
                <input type="radio" name="resolve-action" value={action} checked={resolveAction === action} onChange={() => setResolveAction(action)} />
                <span>{ACTION_LABELS[action]}</span>
                {resolveAction === action ? <Icon name="i-check" size={16} /> : null}
              </label>
            ))}
          </fieldset>
          <div className="form__group">
            <label className="form__label" htmlFor="resolve-note">Нотатка <span className="form__hint">(необов’язково)</span></label>
            <textarea
              className="form__control form__control--textarea"
              id="resolve-note"
              rows={3}
              maxLength={500}
              value={resolveNote}
              onChange={(event) => setResolveNote(event.target.value)}
              placeholder="Причина рішення або коментар для історії"
            />
            <p className="form__hint">Нотатка зберігається в журналі дій і не показується публічно.</p>
          </div>
        </div>
      </Modal>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.title ?? ''}
        description={confirm?.text}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirm(null)}>Скасувати</button>
            <button type="button" className={`btn ${confirm?.danger ? 'btn--danger' : 'btn--primary'}`} onClick={() => void runConfirm()} disabled={confirmBusy}>
              {confirmBusy ? 'Виконуємо…' : confirm?.label ?? 'Підтвердити'}
            </button>
          </>
        }
      >
        <p className="detail-text">Дію буде зафіксовано в журналі адміністратора.</p>
      </Modal>

      <Modal
        open={createAdminOpen}
        onClose={() => setCreateAdminOpen(false)}
        title="Новий адміністратор"
        description="Створіть облікові дані. Пароль не надсилається — передайте його особисто безпечним каналом."
        size="md"
      >
        {adminResult ? (
          <div className="admin-created">
            <p className="form__notice">Адміністратора створено.</p>
            <p>Юзернейм: <strong>@{adminResult.username}</strong></p>
            <p>Логін: <strong>{adminResult.login}</strong></p>
            <p>Пошта: <strong>{adminResult.email}</strong></p>
            <p>Тимчасовий пароль:</p>
            <div className="temp-password">
              <code>{adminResult.temporaryPassword}</code>
              <button
                type="button"
                className="icon-button"
                aria-label="Скопіювати пароль"
                onClick={() => { void navigator.clipboard.writeText(adminResult.temporaryPassword).catch(() => undefined); }}
              >
                <Icon name="i-copy" size={17} />
              </button>
            </div>
            <p className="form__hint">
              Пароль більше не буде показаний. Передайте логін, пошту й пароль новому
              адміністратору; після входу він змінить пароль.
            </p>
            <button type="button" className="btn btn--primary" onClick={() => { setCreateAdminOpen(false); setAdminResult(null); }}>Готово</button>
          </div>
        ) : (
          <form className="form" onSubmit={submitCreateAdmin} noValidate>
            <div className="form__group">
              <label className="form__label" htmlFor="new-admin-username">Юзернейм <span className="form__hint">(публічний)</span></label>
              <input className="form__control" id="new-admin-username" type="text" maxLength={30} value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} required />
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="new-admin-login">Логін <span className="form__hint">(для входу)</span></label>
              <input className="form__control" id="new-admin-login" type="text" maxLength={30} value={adminLogin} onChange={(event) => setAdminLogin(event.target.value)} required />
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="new-admin-email">Пошта</label>
              <input className="form__control" id="new-admin-email" type="email" maxLength={254} value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} required />
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="new-admin-password">Пароль <span className="form__hint">(необов’язково)</span></label>
              <input className="form__control" id="new-admin-password" type="password" maxLength={128} value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} autoComplete="new-password" />
              <p className="form__hint">Якщо залишити порожнім, згенеруємо надійний тимчасовий пароль.</p>
            </div>
            {adminError ? <p className="form__alert" role="alert">{adminError}</p> : null}
            <button type="submit" className="btn btn--primary" disabled={adminBusy}>{adminBusy ? 'Створюємо…' : 'Створити адміністратора'}</button>
          </form>
        )}
      </Modal>
    </div>
  );
}
