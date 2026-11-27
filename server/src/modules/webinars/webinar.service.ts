import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  favorites,
  media,
  registrations,
  reports,
  users,
  webinars,
  type ModerationStatus,
  type User,
  type Webinar,
} from '../../db/schema.js';
import { AppError, badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { buildMeta, type PageMeta } from '../../lib/http.js';
import { logger } from '../../lib/logger.js';
import { coverPresetUrl } from '../../lib/presets.js';
import { uniqueSlug } from '../../lib/slug.js';
import { isFuture } from '../../lib/time.js';
import { scanWebinarContent } from '../../services/moderation.js';
import type { AuthUser } from '../../types/auth.js';
import type {
  CreateWebinarInput,
  ListWebinarsInput,
  UpdateWebinarInput,
} from './webinar.schemas.js';

const NO_USER = '00000000-0000-0000-0000-000000000000';

interface WebinarRow {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  description: string;
  category: Webinar['category'];
  tags: string[];
  coverPreset: string;
  coverUrl: string | null;
  status: Webinar['status'];
  moderationStatus: ModerationStatus;
  startsAt: Date;
  durationMinutes: number;
  capacity: number;
  liveStartedAt: Date | null;
  endedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  ownerUsername: string;
  ownerAvatar: string;
  ownerBio: string | null;
  ownerStatus: User['status'];
  favoriteCount: number;
  registrationCount: number;
  isFavorite: boolean;
  isRegistered: boolean;
}

export interface WebinarOwner {
  id: string;
  username: string;
  avatarUrl: string;
  bio?: string | null;
}

export interface WebinarCard {
  id: string;
  slug: string;
  title: string;
  descriptionExcerpt: string;
  category: Webinar['category'];
  tags: string[];
  coverUrl: string;
  status: Webinar['status'];
  moderationStatus: ModerationStatus;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  favoriteCount: number;
  registrationCount: number;
  spotsLeft: number;
  isFavorite: boolean;
  isRegistered: boolean;
  isOwner: boolean;
  canManage: boolean;
  canFavorite: boolean;
  canRegister: boolean;
  canReport: boolean;
  canStart: boolean;
  canEnd: boolean;
  canCancel: boolean;
  owner: WebinarOwner;
  createdAt: string;
}

export interface WebinarDetail extends WebinarCard {
  description: string;
  liveStartedAt: string | null;
  endedAt: string | null;
  cancelledAt: string | null;
  canStart: boolean;
  canEnd: boolean;
  canCancel: boolean;
}

export interface WebinarListResult {
  items: WebinarCard[];
  meta: PageMeta;
}

const selection = (viewerId: string) => ({
  id: webinars.id,
  ownerId: webinars.ownerId,
  title: webinars.title,
  slug: webinars.slug,
  description: webinars.description,
  category: webinars.category,
  tags: webinars.tags,
  coverPreset: webinars.coverPreset,
  coverUrl: webinars.coverUrl,
  status: webinars.status,
  moderationStatus: webinars.moderationStatus,
  startsAt: webinars.startsAt,
  durationMinutes: webinars.durationMinutes,
  capacity: webinars.capacity,
  liveStartedAt: webinars.liveStartedAt,
  endedAt: webinars.endedAt,
  cancelledAt: webinars.cancelledAt,
  createdAt: webinars.createdAt,
  updatedAt: webinars.updatedAt,
  ownerUsername: users.username,
  ownerAvatar: sql<string>`coalesce(${users.avatarUrl}, '/img/avatars/' || ${users.avatarPreset} || '.svg')`,
  ownerBio: users.bio,
  ownerStatus: users.status,
  favoriteCount: sql<number>`(select count(*)::int from favorites f where f.webinar_id = ${webinars.id})`,
  registrationCount: sql<number>`(select count(*)::int from registrations r where r.webinar_id = ${webinars.id} and r.status in ('REGISTERED', 'ATTENDED'))`,
  isFavorite: sql<boolean>`exists (select 1 from favorites f where f.webinar_id = ${webinars.id} and f.user_id = ${viewerId})`,
  isRegistered: sql<boolean>`exists (select 1 from registrations r where r.webinar_id = ${webinars.id} and r.user_id = ${viewerId} and r.status in ('REGISTERED', 'ATTENDED'))`,
});

const excerpt = (value: string, maxLength = 170): string => {
  if (value.length <= maxLength) return value;
  const cut = value.slice(0, maxLength).replace(/\s+\S*$/, '');
  return `${cut}…`;
};

const canSeeHidden = (row: WebinarRow, viewer: AuthUser | null): boolean => {
  if (viewer?.role === 'ADMIN') return true;
  return Boolean(viewer && viewer.id === row.ownerId);
};

const toCard = (row: WebinarRow, viewer: AuthUser | null): WebinarCard => {
  const isOwner = viewer?.id === row.ownerId;
  const canManage = isOwner || viewer?.role === 'ADMIN';
  const active = row.status === 'UPCOMING' || row.status === 'LIVE';
  const visible = row.moderationStatus === 'VISIBLE';

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    descriptionExcerpt: excerpt(row.description),
    category: row.category,
    tags: row.tags,
    coverUrl: row.coverUrl ?? coverPresetUrl(row.coverPreset),
    status: row.status,
    moderationStatus: row.moderationStatus,
    startsAt: row.startsAt.toISOString(),
    durationMinutes: row.durationMinutes,
    capacity: row.capacity,
    favoriteCount: Number(row.favoriteCount),
    registrationCount: Number(row.registrationCount),
    spotsLeft: Math.max(0, row.capacity - Number(row.registrationCount)),
    isFavorite: Boolean(row.isFavorite),
    isRegistered: Boolean(row.isRegistered),
    isOwner,
    canManage,
    canFavorite: Boolean(viewer) && !isOwner && active && visible,
    canRegister:
      Boolean(viewer) &&
      !isOwner &&
      active &&
      visible &&
      !row.isRegistered &&
      row.registrationCount < row.capacity,
    canReport: Boolean(viewer) && !isOwner,
    canStart: canManage && row.status === 'UPCOMING' && visible,
    canEnd: canManage && row.status === 'LIVE',
    canCancel: canManage && (row.status === 'UPCOMING' || row.status === 'LIVE'),
    owner: {
      id: row.ownerId,
      username: row.ownerUsername,
      avatarUrl: row.ownerAvatar,
    },
    createdAt: row.createdAt.toISOString(),
  };
};

const toDetail = (row: WebinarRow, viewer: AuthUser | null): WebinarDetail => {
  const card = toCard(row, viewer);
  return {
    ...card,
    description: row.description,
    liveStartedAt: row.liveStartedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    canStart: card.canStart,
    canEnd: card.canEnd,
    canCancel: card.canCancel,
    owner: { ...card.owner, bio: row.ownerBio },
  };
};

const buildConditions = (options: {
  viewer: AuthUser | null;
  scope: ListWebinarsInput['scope'];
  q?: string;
  category?: Webinar['category'];
  ownerId?: string;
  admin?: boolean;
  includeDeleted?: boolean;
  moderation?: ModerationStatus;
  favoritesOnly?: boolean;
  attendedOnly?: boolean;
}): SQL[] => {
  const { viewer } = options;
  const viewerId = viewer?.id ?? NO_USER;
  const conditions: SQL[] = [];

  if (!options.includeDeleted) conditions.push(isNull(webinars.deletedAt));

  if (options.scope === 'active') {
    conditions.push(inArray(webinars.status, ['UPCOMING', 'LIVE']));
  } else if (options.scope === 'completed') {
    conditions.push(eq(webinars.status, 'COMPLETED'));
  } else if (options.scope === 'cancelled') {
    conditions.push(eq(webinars.status, 'CANCELLED'));
  }

  if (options.ownerId) conditions.push(eq(webinars.ownerId, options.ownerId));
  if (options.category) conditions.push(eq(webinars.category, options.category));
  if (options.moderation && options.admin) {
    conditions.push(eq(webinars.moderationStatus, options.moderation));
  }

  if (options.q) {
    const escaped = options.q.replace(/[\\%_]/g, '\\$&');
    const query = `%${escaped}%`;
    const search = or(
      ilike(webinars.title, query),
      ilike(webinars.description, query),
      ilike(users.username, query),
    );
    if (search) conditions.push(search);
  }

  if (!options.admin) {
    if (viewer) {
      const moderation = or(
        eq(webinars.moderationStatus, 'VISIBLE'),
        eq(webinars.ownerId, viewer.id),
      );
      if (moderation) conditions.push(moderation);

      const ownerActive = or(eq(users.status, 'ACTIVE'), eq(webinars.ownerId, viewer.id));
      if (ownerActive) conditions.push(ownerActive);
    } else {
      conditions.push(eq(webinars.moderationStatus, 'VISIBLE'));
      conditions.push(eq(users.status, 'ACTIVE'));
    }
  }

  if (options.favoritesOnly) {
    conditions.push(
      sql`exists (select 1 from favorites f where f.webinar_id = ${webinars.id} and f.user_id = ${viewerId})`,
    );
  }

  if (options.attendedOnly) {
    conditions.push(
      sql`exists (select 1 from registrations r where r.webinar_id = ${webinars.id} and r.user_id = ${viewerId} and r.status in ('REGISTERED', 'ATTENDED'))`,
    );
  }

  return conditions;
};

const orderBy = (sort: ListWebinarsInput['sort']) => {
  switch (sort) {
    case 'newest':
      return [desc(webinars.createdAt)];
    case 'popular':
      return [
        desc(sql`(select count(*) from favorites f where f.webinar_id = ${webinars.id})`),
        desc(webinars.createdAt),
      ];
    case 'title':
      return [asc(webinars.title)];
    case 'soonest':
    default:
      return [
        asc(sql`case when ${webinars.status} = 'LIVE' then 0 else 1 end`),
        asc(webinars.startsAt),
      ];
  }
};

export interface ListWebinarsOptions {
  viewer: AuthUser | null;
  q?: string;
  category?: Webinar['category'];
  scope: ListWebinarsInput['scope'];
  sort: ListWebinarsInput['sort'];
  page: number;
  limit: number;
  admin?: boolean;
  moderation?: ModerationStatus;
  includeDeleted?: boolean;
  ownerId?: string;
  favoritesOnly?: boolean;
  attendedOnly?: boolean;
}

export const listWebinars = async (options: ListWebinarsOptions): Promise<WebinarListResult> => {
  const viewerId = options.viewer?.id ?? NO_USER;
  const conditions = buildConditions(options);
  const where = and(...conditions);

  const rows = await db
    .select(selection(viewerId))
    .from(webinars)
    .innerJoin(users, eq(webinars.ownerId, users.id))
    .where(where)
    .orderBy(...orderBy(options.sort))
    .limit(options.limit)
    .offset((options.page - 1) * options.limit);

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(webinars)
    .innerJoin(users, eq(webinars.ownerId, users.id))
    .where(where);

  const total = Number(countRow?.total ?? 0);

  return {
    items: rows.map((row) => toCard(row as WebinarRow, options.viewer)),
    meta: buildMeta(
      { page: options.page, limit: options.limit, offset: (options.page - 1) * options.limit },
      total,
    ),
  };
};

const rawWebinar = async (id: string): Promise<(Webinar & { ownerStatus: User['status'] }) | null> => {
  const rows = await db
    .select({ webinar: webinars, ownerStatus: users.status })
    .from(webinars)
    .innerJoin(users, eq(webinars.ownerId, users.id))
    .where(and(eq(webinars.id, id), isNull(webinars.deletedAt)))
    .limit(1);

  const row = rows[0];
  return row ? { ...row.webinar, ownerStatus: row.ownerStatus } : null;
};

export const getWebinarForViewer = async (
  id: string,
  viewer: AuthUser | null,
): Promise<WebinarDetail> => {
  const viewerId = viewer?.id ?? NO_USER;
  const rows = await db
    .select(selection(viewerId))
    .from(webinars)
    .innerJoin(users, eq(webinars.ownerId, users.id))
    .where(and(eq(webinars.id, id), isNull(webinars.deletedAt)))
    .limit(1);

  const row = rows[0];
  if (!row) throw notFound('Захід не знайдено.');

  if (row.moderationStatus !== 'VISIBLE' && !canSeeHidden(row as WebinarRow, viewer)) {
    throw notFound('Захід не знайдено.');
  }

  if (row.ownerStatus !== 'ACTIVE' && !canSeeHidden(row as WebinarRow, viewer)) {
    throw notFound('Захід не знайдено.');
  }

  return toDetail(row as WebinarRow, viewer);
};

const assertCanManage = (webinar: Webinar, viewer: AuthUser): void => {
  if (viewer.role !== 'ADMIN' && webinar.ownerId !== viewer.id) {
    throw forbidden('Керувати заходом може лише його організатор.');
  }
};

const resolveCover = async (
  ownerId: string,
  cover: CreateWebinarInput['cover'],
): Promise<{ coverPreset: string; coverUrl: string | null }> => {
  if (!cover) return { coverPreset: 'cover-01', coverUrl: null };
  if (cover.type === 'preset') return { coverPreset: cover.preset, coverUrl: null };

  const [mediaRow] = await db
    .select()
    .from(media)
    .where(and(eq(media.id, cover.mediaId), eq(media.ownerId, ownerId), eq(media.kind, 'COVER')))
    .limit(1);

  if (!mediaRow) throw badRequest('Файл обкладинки не знайдено.', { cover: 'Завантажте обкладинку ще раз.' });
  return { coverPreset: 'cover-01', coverUrl: mediaRow.publicUrl };
};

const ensureAutomatedReport = async (webinar: Pick<Webinar, 'id' | 'ownerId'>): Promise<void> => {
  const [existing] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(and(eq(reports.webinarId, webinar.id), eq(reports.isAutomated, true), eq(reports.status, 'OPEN')))
    .limit(1);

  if (existing) return;

  await db.insert(reports).values({
    reporterId: null,
    targetType: 'WEBINAR',
    webinarId: webinar.id,
    reason: 'INAPPROPRIATE_CONTENT',
    details: 'Автоматична перевірка виявила потенційно неприпустимий вміст. Захід приховано до рішення адміністратора.',
    isAutomated: true,
  });
};

export const createWebinar = async (
  viewer: AuthUser,
  input: CreateWebinarInput,
): Promise<WebinarDetail> => {
  if (!isFuture(input.startsAt, 5)) {
    throw badRequest('Дата початку має бути щонайменше на 5 хвилин пізніше за поточний час.', {
      startsAt: 'Оберіть майбутню дату.',
    });
  }

  const cover = await resolveCover(viewer.id, input.cover);
  const moderation = scanWebinarContent([input.title, input.description, ...input.tags]);
  const now = new Date();

  const [created] = await db
    .insert(webinars)
    .values({
      ownerId: viewer.id,
      title: input.title,
      slug: uniqueSlug(input.title),
      description: input.description,
      category: input.category,
      tags: input.tags,
      coverPreset: cover.coverPreset,
      coverUrl: cover.coverUrl,
      startsAt: input.startsAt,
      durationMinutes: input.durationMinutes,
      capacity: input.capacity,
      status: 'UPCOMING',
      moderationStatus: moderation.flagged ? 'PENDING' : 'VISIBLE',
      moderationNote: moderation.flagged
        ? 'Автоматична перевірка виявила потенційно неприпустимий вміст.'
        : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!created) throw new AppError(500, 'WEBINAR_CREATE_FAILED', 'Не вдалося створити захід.');

  if (moderation.flagged) {
    await ensureAutomatedReport(created);
  }

  return getWebinarForViewer(created.id, viewer);
};

export const updateWebinar = async (
  id: string,
  viewer: AuthUser,
  input: UpdateWebinarInput,
): Promise<WebinarDetail> => {
  const current = await rawWebinar(id);
  if (!current) throw notFound('Захід не знайдено.');
  assertCanManage(current, viewer);

  if (input.startsAt && (current.status === 'COMPLETED' || current.status === 'CANCELLED')) {
    throw badRequest('Не можна змінювати дату завершеного або скасованого заходу.');
  }
  if (input.startsAt && current.status === 'UPCOMING' && !isFuture(input.startsAt)) {
    throw badRequest('Дата початку має бути в майбутньому.', { startsAt: 'Оберіть майбутню дату.' });
  }

  const title = input.title ?? current.title;
  const description = input.description ?? current.description;
  const tags = input.tags ?? current.tags;
  const moderation = scanWebinarContent([title, description, ...tags]);
  const cover = input.cover ? await resolveCover(current.ownerId, input.cover) : null;

  const [updated] = await db
    .update(webinars)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.startsAt !== undefined ? { startsAt: input.startsAt } : {}),
      ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
      ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
      ...(cover ? { coverPreset: cover.coverPreset, coverUrl: cover.coverUrl } : {}),
      ...(moderation.flagged && current.moderationStatus === 'VISIBLE'
        ? {
            moderationStatus: 'PENDING' as const,
            moderationNote: 'Автоматична перевірка виявила потенційно неприпустимий вміст.',
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(webinars.id, id))
    .returning();

  if (!updated) throw notFound('Захід не знайдено.');

  if (moderation.flagged) {
    await ensureAutomatedReport(updated);
  }

  return getWebinarForViewer(updated.id, viewer);
};

export const deleteWebinar = async (id: string, viewer: AuthUser): Promise<void> => {
  const current = await rawWebinar(id);
  if (!current) throw notFound('Захід не знайдено.');
  assertCanManage(current, viewer);

  const now = new Date();
  await db
    .update(webinars)
    .set({ deletedAt: now, status: 'CANCELLED', cancelledAt: current.cancelledAt ?? now, updatedAt: now })
    .where(eq(webinars.id, id));
};

export const startWebinar = async (id: string, viewer: AuthUser): Promise<WebinarDetail> => {
  const current = await rawWebinar(id);
  if (!current) throw notFound('Захід не знайдено.');
  assertCanManage(current, viewer);
  if (current.moderationStatus !== 'VISIBLE') {
    throw forbidden('Захід на модерації. Зачекайте на рішення адміністратора.');
  }
  if (current.status === 'LIVE') return getWebinarForViewer(id, viewer);
  if (current.status !== 'UPCOMING') throw conflict('Розпочати можна лише запланований захід.');

  if (current.startsAt.getTime() > Date.now()) {
    const startsAtLabel = new Intl.DateTimeFormat('uk-UA', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Kyiv',
    }).format(current.startsAt);
    throw conflict(`Захід ще не почався. Ефір можна розпочати ${startsAtLabel}.`);
  }

  await db
    .update(webinars)
    .set({ status: 'LIVE', liveStartedAt: new Date(), updatedAt: new Date() })
    .where(eq(webinars.id, id));

  return getWebinarForViewer(id, viewer);
};

let autoCloseRunning = false;

/**
 * Finishes demo broadcasts that outlived their duration. Runs at API startup
 * and once a minute afterwards, so an event cannot remain LIVE forever.
 */
export const closeExpiredWebinars = async (): Promise<number> => {
  if (autoCloseRunning) return 0;
  autoCloseRunning = true;

  try {
    const expired = await db
      .select({ id: webinars.id })
      .from(webinars)
      .where(
        and(
          eq(webinars.status, 'LIVE'),
          isNull(webinars.deletedAt),
          sql`coalesce(${webinars.liveStartedAt}, ${webinars.startsAt}) + (${webinars.durationMinutes} * interval '1 minute') <= now()`,
        ),
      );

    if (expired.length === 0) return 0;

    const ids = expired.map((row) => row.id);
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(webinars)
        .set({ status: 'COMPLETED', endedAt: now, updatedAt: now })
        .where(inArray(webinars.id, ids));

      await tx
        .update(registrations)
        .set({ status: 'ATTENDED', updatedAt: now })
        .where(
          and(
            inArray(registrations.webinarId, ids),
            eq(registrations.status, 'REGISTERED'),
          ),
        );
    });

    logger.info({ count: ids.length, webinarIds: ids }, 'webinars:auto-closed');
    return ids.length;
  } finally {
    autoCloseRunning = false;
  }
};

export const endWebinar = async (id: string, viewer: AuthUser): Promise<WebinarDetail> => {
  const current = await rawWebinar(id);
  if (!current) throw notFound('Захід не знайдено.');
  assertCanManage(current, viewer);
  if (current.status === 'COMPLETED') return getWebinarForViewer(id, viewer);
  if (current.status !== 'LIVE') throw conflict('Завершити можна лише захід у прямому ефірі.');

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(webinars)
      .set({ status: 'COMPLETED', endedAt: now, updatedAt: now })
      .where(eq(webinars.id, id));
    await tx
      .update(registrations)
      .set({ status: 'ATTENDED', updatedAt: now })
      .where(and(eq(registrations.webinarId, id), eq(registrations.status, 'REGISTERED')));
  });

  return getWebinarForViewer(id, viewer);
};

export const cancelWebinar = async (id: string, viewer: AuthUser): Promise<WebinarDetail> => {
  const current = await rawWebinar(id);
  if (!current) throw notFound('Захід не знайдено.');
  assertCanManage(current, viewer);
  if (current.status === 'CANCELLED') return getWebinarForViewer(id, viewer);
  if (current.status === 'COMPLETED') throw conflict('Завершений захід не можна скасувати.');

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(webinars)
      .set({ status: 'CANCELLED', cancelledAt: now, updatedAt: now })
      .where(eq(webinars.id, id));
    await tx
      .update(registrations)
      .set({ status: 'CANCELLED', updatedAt: now })
      .where(and(eq(registrations.webinarId, id), eq(registrations.status, 'REGISTERED')));
  });

  return getWebinarForViewer(id, viewer);
};

export const favoriteWebinar = async (id: string, viewer: AuthUser): Promise<{ favorited: true; favoriteCount: number }> => {
  const webinar = await getWebinarForViewer(id, viewer);
  if (webinar.isOwner) throw forbidden('Не можна додати власний захід до обраного.');
  if (!webinar.canFavorite) throw badRequest('Цей захід зараз недоступний для додавання в обране.');

  await db.insert(favorites).values({ userId: viewer.id, webinarId: id }).onConflictDoNothing();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(favorites)
    .where(eq(favorites.webinarId, id));

  return { favorited: true, favoriteCount: Number(row?.count ?? 0) };
};

export const unfavoriteWebinar = async (id: string, viewer: AuthUser): Promise<{ favorited: false; favoriteCount: number }> => {
  await db.delete(favorites).where(and(eq(favorites.userId, viewer.id), eq(favorites.webinarId, id)));
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(favorites)
    .where(eq(favorites.webinarId, id));

  return { favorited: false, favoriteCount: Number(row?.count ?? 0) };
};

export const registerForWebinar = async (id: string, viewer: AuthUser): Promise<{ registered: true; registrationCount: number }> => {
  await getWebinarForViewer(id, viewer);

  await db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ capacity: webinars.capacity, status: webinars.status, moderationStatus: webinars.moderationStatus, ownerId: webinars.ownerId })
      .from(webinars)
      .where(and(eq(webinars.id, id), isNull(webinars.deletedAt)))
      .for('update')
      .limit(1);

    if (!locked) throw notFound('Захід не знайдено.');
    if (locked.ownerId === viewer.id) throw forbidden('Ви не можете зареєструватися на власний захід.');
    if (locked.moderationStatus !== 'VISIBLE') throw notFound('Захід не знайдено.');
    if (locked.status !== 'UPCOMING' && locked.status !== 'LIVE') {
      throw conflict('Реєстрація на цей захід закрита.');
    }

    const [existing] = await tx
      .select({ id: registrations.id, status: registrations.status })
      .from(registrations)
      .where(and(eq(registrations.userId, viewer.id), eq(registrations.webinarId, id)))
      .limit(1);

    if (existing && existing.status !== 'CANCELLED') {
      throw conflict('Ви вже зареєстровані на цей захід.');
    }

    const [countRow] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(registrations)
      .where(and(eq(registrations.webinarId, id), inArray(registrations.status, ['REGISTERED', 'ATTENDED'])));

    if (Number(countRow?.count ?? 0) >= locked.capacity) {
      throw conflict('На жаль, місця закінчилися.');
    }

    if (existing) {
      await tx
        .update(registrations)
        .set({ status: 'REGISTERED', updatedAt: new Date() })
        .where(eq(registrations.id, existing.id));
    } else {
      await tx.insert(registrations).values({ userId: viewer.id, webinarId: id });
    }
  });

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(registrations)
    .where(and(eq(registrations.webinarId, id), inArray(registrations.status, ['REGISTERED', 'ATTENDED'])));

  return { registered: true, registrationCount: Number(row?.count ?? 0) };
};

export const unregisterFromWebinar = async (id: string, viewer: AuthUser): Promise<{ registered: false; registrationCount: number }> => {
  await db
    .update(registrations)
    .set({ status: 'CANCELLED', updatedAt: new Date() })
    .where(and(eq(registrations.userId, viewer.id), eq(registrations.webinarId, id), eq(registrations.status, 'REGISTERED')));

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(registrations)
    .where(and(eq(registrations.webinarId, id), inArray(registrations.status, ['REGISTERED', 'ATTENDED'])));

  return { registered: false, registrationCount: Number(row?.count ?? 0) };
};

export interface ProfileStats {
  created: {
    total: number;
    upcoming: number;
    live: number;
    completed: number;
    cancelled: number;
    pendingModeration: number;
  };
  favoriteReceived: number;
  registrationsReceived: number;
  favoriteCount: number;
  registeredCount: number;
  attendedCount: number;
}

export const getProfileStats = async (userId: string): Promise<ProfileStats> => {
  const [createdRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      upcoming: sql<number>`(count(*) filter (where ${webinars.status} = 'UPCOMING'))::int`,
      live: sql<number>`(count(*) filter (where ${webinars.status} = 'LIVE'))::int`,
      completed: sql<number>`(count(*) filter (where ${webinars.status} = 'COMPLETED'))::int`,
      cancelled: sql<number>`(count(*) filter (where ${webinars.status} = 'CANCELLED'))::int`,
      pendingModeration: sql<number>`(count(*) filter (where ${webinars.moderationStatus} = 'PENDING'))::int`,
    })
    .from(webinars)
    .where(and(eq(webinars.ownerId, userId), isNull(webinars.deletedAt)));

  const [favoriteReceived] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(favorites)
    .innerJoin(webinars, eq(favorites.webinarId, webinars.id))
    .where(and(eq(webinars.ownerId, userId), isNull(webinars.deletedAt)));

  const [registrationsReceived] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(registrations)
    .innerJoin(webinars, eq(registrations.webinarId, webinars.id))
    .where(
      and(
        eq(webinars.ownerId, userId),
        isNull(webinars.deletedAt),
        inArray(registrations.status, ['REGISTERED', 'ATTENDED']),
      ),
    );

  const [favoriteCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(favorites)
    .where(eq(favorites.userId, userId));

  const [registeredCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(registrations)
    .where(and(eq(registrations.userId, userId), eq(registrations.status, 'REGISTERED')));

  const [attendedCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(registrations)
    .where(and(eq(registrations.userId, userId), eq(registrations.status, 'ATTENDED')));

  return {
    created: {
      total: Number(createdRow?.total ?? 0),
      upcoming: Number(createdRow?.upcoming ?? 0),
      live: Number(createdRow?.live ?? 0),
      completed: Number(createdRow?.completed ?? 0),
      cancelled: Number(createdRow?.cancelled ?? 0),
      pendingModeration: Number(createdRow?.pendingModeration ?? 0),
    },
    favoriteReceived: Number(favoriteReceived?.count ?? 0),
    registrationsReceived: Number(registrationsReceived?.count ?? 0),
    favoriteCount: Number(favoriteCount?.count ?? 0),
    registeredCount: Number(registeredCount?.count ?? 0),
    attendedCount: Number(attendedCount?.count ?? 0),
  };
};
