import { eq } from 'drizzle-orm';
import { db } from './client.js';
import {
  favorites,
  registrations,
  reports,
  users,
  webinars,
  type Webinar,
} from './schema.js';
import { env, isProduction } from '../env.js';
import { hashPassword } from '../lib/security.js';
import { logger } from '../lib/logger.js';

const addDays = (days: number, hour = 19, minute = 0): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const addMinutes = (minutes: number): Date => new Date(Date.now() + minutes * 60_000);

const seedAdmin = async (): Promise<void> => {
  const [existing] = await db.select().from(users).where(eq(users.email, env.ADMIN_EMAIL)).limit(1);

  if (existing) {
    if (existing.role !== 'ADMIN') {
      await db.update(users).set({ role: 'ADMIN', updatedAt: new Date() }).where(eq(users.id, existing.id));
      console.log(`Promoted ${env.ADMIN_EMAIL} to ADMIN.`);
    }
    console.log(`Admin already exists: ${env.ADMIN_EMAIL}`);
    return;
  }

  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
  const now = new Date();

  await db.insert(users).values({
    email: env.ADMIN_EMAIL,
    passwordHash,
    displayName: env.ADMIN_NAME,
    role: 'ADMIN',
    status: 'ACTIVE',
    emailVerifiedAt: now,
    avatarPreset: 'avatar-01',
  });

  console.log(`Admin created: ${env.ADMIN_EMAIL}`);
  if (!isProduction) {
    console.log(`Development admin password: ${env.ADMIN_PASSWORD}`);
  }
};

interface DemoUser {
  id: string;
  email: string;
  displayName: string;
  avatarPreset: string;
}

const seedDemo = async (): Promise<void> => {
  const demoEmails = ['olena@scene.local', 'maksym@scene.local', 'iryna@scene.local', 'andriy@scene.local'];
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, demoEmails[0]!)).limit(1);
  if (existing.length > 0) {
    console.log('Demo data already exists, skipping demo seed.');
    return;
  }

  const passwordHash = await hashPassword(env.DEMO_PASSWORD);
  const now = new Date();

  const demoUsers = await db
    .insert(users)
    .values([
      {
        email: demoEmails[0]!,
        passwordHash,
        displayName: 'Олена Ковальчук',
        bio: 'Продюсерка освітніх програм і ведуча онлайн-заходів.',
        avatarPreset: 'avatar-03',
        status: 'ACTIVE',
        emailVerifiedAt: now,
      },
      {
        email: demoEmails[1]!,
        passwordHash,
        displayName: 'Максим Бондаренко',
        bio: 'Продуктовий дизайнер, викладач UX-практик.',
        avatarPreset: 'avatar-05',
        status: 'ACTIVE',
        emailVerifiedAt: now,
      },
      {
        email: demoEmails[2]!,
        passwordHash,
        displayName: 'Ірина Мельник',
        bio: 'Маркетологиня, авторка курсу про контент без вигорання.',
        avatarPreset: 'avatar-02',
        status: 'ACTIVE',
        emailVerifiedAt: now,
      },
      {
        email: demoEmails[3]!,
        passwordHash,
        displayName: 'Андрій Шевчук',
        bio: 'Викладач, спікер про кар’єру та публічні виступи.',
        avatarPreset: 'avatar-07',
        status: 'ACTIVE',
        emailVerifiedAt: now,
      },
    ])
    .returning({ id: users.id, email: users.email, displayName: users.displayName, avatarPreset: users.avatarPreset });

  const [olena, maksym, iryna, andriy] = demoUsers as [DemoUser, DemoUser, DemoUser, DemoUser];

  const webinarValues: Array<Omit<Webinar, 'id' | 'slug' | 'createdAt' | 'updatedAt' | 'deletedAt'> & {
    slug: string;
    createdAt?: Date;
    updatedAt?: Date;
  }> = [
    {
      ownerId: olena.id,
      title: 'Продакти 2026: як AI змінює продуктові команди',
      slug: 'product-2026-ai',
      description:
        'Розберемо, як сучасні продуктові команди інтегрують AI у дослідження, планування та релізи. Покажемо реальні кейси, типові помилки та практичні інструменти, які можна застосувати вже наступного тижня.',
      category: 'TECHNOLOGY',
      tags: ['ai', 'product', '2026'],
      coverPreset: 'cover-01',
      coverUrl: null,
      status: 'UPCOMING',
      moderationStatus: 'VISIBLE',
      moderationNote: null,
      startsAt: addDays(2),
      durationMinutes: 90,
      capacity: 300,
      isPrivate: false,
      language: 'uk',
      liveStartedAt: null,
      endedAt: null,
      cancelledAt: null,
      createdAt: addDays(-5),
      updatedAt: addDays(-5),
    },
    {
      ownerId: iryna.id,
      title: 'Контент-маркетинг без вигорання',
      slug: 'content-marketing-burnout',
      description:
        'Практична сесія про те, як будувати контент-план на квартал, не виснажувати команду та вимірювати результат. Отримаєте шаблон редакційного календаря і чекліст перевірки контенту перед публікацією.',
      category: 'MARKETING',
      tags: ['content', 'marketing'],
      coverPreset: 'cover-02',
      coverUrl: null,
      status: 'UPCOMING',
      moderationStatus: 'VISIBLE',
      moderationNote: null,
      startsAt: addDays(4, 18, 30),
      durationMinutes: 60,
      capacity: 150,
      isPrivate: false,
      language: 'uk',
      liveStartedAt: null,
      endedAt: null,
      cancelledAt: null,
      createdAt: addDays(-4),
      updatedAt: addDays(-4),
    },
    {
      ownerId: maksym.id,
      title: 'UX-дослідження з нуля: практичний воркшоп',
      slug: 'ux-research-workshop',
      description:
        'Від гіпотези до інсайту: як проводити глибинні інтерв’ю, формувати сценарії та презентувати результати команді. Воркшоп з інтерактивними вправами та розбором ваших кейсів у реальному часі.',
      category: 'DESIGN',
      tags: ['ux', 'research', 'workshop'],
      coverPreset: 'cover-03',
      coverUrl: null,
      status: 'UPCOMING',
      moderationStatus: 'VISIBLE',
      moderationNote: null,
      startsAt: addDays(6, 17),
      durationMinutes: 120,
      capacity: 40,
      isPrivate: false,
      language: 'uk',
      liveStartedAt: null,
      endedAt: null,
      cancelledAt: null,
      createdAt: addDays(-3),
      updatedAt: addDays(-3),
    },
    {
      ownerId: andriy.id,
      title: 'Фінансова грамотність для фрілансерів',
      slug: 'freelance-finance',
      description:
        'Як планувати дохід, формувати резервний фонд і не втрачати гроші на податках. Розберемо прості системи обліку, які працюють без бухгалтера, та відповімо на запитання учасників.',
      category: 'BUSINESS',
      tags: ['finance', 'freelance'],
      coverPreset: 'cover-04',
      coverUrl: null,
      status: 'UPCOMING',
      moderationStatus: 'VISIBLE',
      moderationNote: null,
      startsAt: addDays(8, 19),
      durationMinutes: 75,
      capacity: 200,
      isPrivate: false,
      language: 'uk',
      liveStartedAt: null,
      endedAt: null,
      cancelledAt: null,
      createdAt: addDays(-2),
      updatedAt: addDays(-2),
    },
    {
      ownerId: olena.id,
      title: 'Публічні виступи: голос, який тримає увагу',
      slug: 'public-speaking-voice',
      description:
        'Практикум з техніки мовлення, структури виступу та роботи з хвилюванням. Запишемо короткі відео, розберемо сильні сторони й складемо персональний план тренувань на місяць.',
      category: 'EDUCATION',
      tags: ['speaking', 'communication'],
      coverPreset: 'cover-05',
      coverUrl: null,
      status: 'UPCOMING',
      moderationStatus: 'VISIBLE',
      moderationNote: null,
      startsAt: addDays(10, 18),
      durationMinutes: 90,
      capacity: 60,
      isPrivate: false,
      language: 'uk',
      liveStartedAt: null,
      endedAt: null,
      cancelledAt: null,
      createdAt: addDays(-1),
      updatedAt: addDays(-1),
    },
    {
      ownerId: iryna.id,
      title: 'Teaching tech: як навчати дорослих',
      slug: 'teaching-tech-adults',
      description:
        'Методики залучення дорослої аудиторії, формати практики та оцінювання знань. Розберемо, як перетворити складну технічну тему на зрозумілу історію з вправами.',
      category: 'EDUCATION',
      tags: ['education', 'teaching'],
      coverPreset: 'cover-06',
      coverUrl: null,
      status: 'UPCOMING',
      moderationStatus: 'VISIBLE',
      moderationNote: null,
      startsAt: addDays(12, 17, 30),
      durationMinutes: 60,
      capacity: 120,
      isPrivate: false,
      language: 'uk',
      liveStartedAt: null,
      endedAt: null,
      cancelledAt: null,
      createdAt: addDays(-1),
      updatedAt: addDays(-1),
    },
    {
      ownerId: maksym.id,
      title: 'Живий розбір: лендінг за 60 хвилин',
      slug: 'live-landing-review',
      description:
        'Прямий ефір, у якому розбираємо лендінги учасників: структура, тексти, візуальна ієрархія та конверсія. Ставте запитання в чаті — відповідаємо одразу під час розбору.',
      category: 'DESIGN',
      tags: ['landing', 'ux', 'live'],
      coverPreset: 'cover-03',
      coverUrl: null,
      status: 'LIVE',
      moderationStatus: 'VISIBLE',
      moderationNote: null,
      startsAt: addMinutes(-15),
      durationMinutes: 60,
      capacity: 500,
      isPrivate: false,
      language: 'uk',
      liveStartedAt: addMinutes(-15),
      endedAt: null,
      cancelledAt: null,
      createdAt: addDays(-6),
      updatedAt: addMinutes(-15),
    },
    {
      ownerId: andriy.id,
      title: 'Старт кар’єри в IT: чесний розбір',
      slug: 'it-career-start',
      description:
        'Що насправді шукають роботодавці на junior-позиціях, як скласти портфоліо без досвіду та де шукати перші проєкти. Запис доступний після завершення заходу.',
      category: 'EDUCATION',
      tags: ['career', 'it'],
      coverPreset: 'cover-04',
      coverUrl: null,
      status: 'COMPLETED',
      moderationStatus: 'VISIBLE',
      moderationNote: null,
      startsAt: addDays(-10, 19),
      durationMinutes: 90,
      capacity: 250,
      isPrivate: false,
      language: 'uk',
      liveStartedAt: addDays(-10, 19),
      endedAt: addDays(-10, 20, 30),
      cancelledAt: null,
      createdAt: addDays(-20),
      updatedAt: addDays(-10),
    },
    {
      ownerId: iryna.id,
      title: 'Email-маркетинг 101: перші 1000 підписників',
      slug: 'email-marketing-101',
      description:
        'Базовий воркшоп із побудови email-воронки: лідмагніт, вітальна серія, сегментація та метрики. Після заходу надішлемо шаблони листів і чекліст запуску.',
      category: 'MARKETING',
      tags: ['email', 'marketing'],
      coverPreset: 'cover-02',
      coverUrl: null,
      status: 'COMPLETED',
      moderationStatus: 'VISIBLE',
      moderationNote: null,
      startsAt: addDays(-5, 18),
      durationMinutes: 60,
      capacity: 180,
      isPrivate: false,
      language: 'uk',
      liveStartedAt: addDays(-5, 18),
      endedAt: addDays(-5, 19),
      cancelledAt: null,
      createdAt: addDays(-12),
      updatedAt: addDays(-5),
    },
    {
      ownerId: olena.id,
      title: 'Метаверс для брендів: час розчарувань',
      slug: 'metaverse-for-brands',
      description:
        'Огляд реальних кейсів брендів у метавсесвіті, причини провалів і сценарії, які варто тестувати у 2026 році. Захід скасовано, кошти за квитки повертаються автоматично.',
      category: 'TECHNOLOGY',
      tags: ['metaverse', 'brands'],
      coverPreset: 'cover-01',
      coverUrl: null,
      status: 'CANCELLED',
      moderationStatus: 'VISIBLE',
      moderationNote: null,
      startsAt: addDays(3, 18),
      durationMinutes: 60,
      capacity: 100,
      isPrivate: false,
      language: 'uk',
      liveStartedAt: null,
      endedAt: null,
      cancelledAt: addDays(-1),
      createdAt: addDays(-8),
      updatedAt: addDays(-1),
    },
    {
      ownerId: andriy.id,
      title: 'Сумнівна пропозиція швидкого заробітку',
      slug: 'suspicious-fast-income',
      description:
        'Тестовий захід для демонстрації автоматичної модерації. Він прихований від публічного пошуку та очікує рішення адміністратора. Це не справжня пропозиція заробітку.',
      category: 'BUSINESS',
      tags: ['test', 'moderation'],
      coverPreset: 'cover-04',
      coverUrl: null,
      status: 'UPCOMING',
      moderationStatus: 'PENDING',
      moderationNote: 'Автоматична перевірка виявила підозрілий вміст. Очікує рішення адміністратора.',
      startsAt: addDays(1, 20),
      durationMinutes: 45,
      capacity: 50,
      isPrivate: false,
      language: 'uk',
      liveStartedAt: null,
      endedAt: null,
      cancelledAt: null,
      createdAt: addDays(-1),
      updatedAt: addDays(-1),
    },
  ];

  const createdWebinars = await db.insert(webinars).values(webinarValues).returning();

  const byTitle = (needle: string) => {
    const found = createdWebinars.find((webinar) => webinar.title.includes(needle));
    if (!found) throw new Error(`Seed webinar not found: ${needle}`);
    return found;
  };

  const product = byTitle('Продакти');
  const content = byTitle('Контент-маркетинг');
  const ux = byTitle('UX-дослідження');
  const finance = byTitle('Фінансова');
  const speaking = byTitle('Публічні');
  const live = byTitle('Живий розбір');
  const career = byTitle('Старт кар’єри');
  const email = byTitle('Email-маркетинг');
  const metaverse = byTitle('Метаверс');
  const suspicious = byTitle('Сумнівна');

  await db
    .insert(favorites)
    .values([
      { userId: olena.id, webinarId: content.id },
      { userId: olena.id, webinarId: ux.id },
      { userId: olena.id, webinarId: live.id },
      { userId: maksym.id, webinarId: product.id },
      { userId: maksym.id, webinarId: speaking.id },
      { userId: iryna.id, webinarId: product.id },
      { userId: iryna.id, webinarId: live.id },
      { userId: andriy.id, webinarId: content.id },
      { userId: andriy.id, webinarId: finance.id },
    ])
    .onConflictDoNothing();

  await db
    .insert(registrations)
    .values([
      { userId: maksym.id, webinarId: product.id, status: 'REGISTERED' },
      { userId: iryna.id, webinarId: product.id, status: 'REGISTERED' },
      { userId: andriy.id, webinarId: product.id, status: 'REGISTERED' },
      { userId: olena.id, webinarId: content.id, status: 'REGISTERED' },
      { userId: andriy.id, webinarId: content.id, status: 'REGISTERED' },
      { userId: olena.id, webinarId: ux.id, status: 'REGISTERED' },
      { userId: iryna.id, webinarId: ux.id, status: 'REGISTERED' },
      { userId: olena.id, webinarId: live.id, status: 'REGISTERED' },
      { userId: iryna.id, webinarId: live.id, status: 'REGISTERED' },
      { userId: andriy.id, webinarId: live.id, status: 'REGISTERED' },
      { userId: olena.id, webinarId: career.id, status: 'ATTENDED' },
      { userId: maksym.id, webinarId: career.id, status: 'ATTENDED' },
      { userId: iryna.id, webinarId: email.id, status: 'ATTENDED' },
      { userId: andriy.id, webinarId: email.id, status: 'ATTENDED' },
    ])
    .onConflictDoNothing();

  await db.insert(reports).values([
    {
      reporterId: maksym.id,
      targetType: 'WEBINAR',
      webinarId: metaverse.id,
      reason: 'MISLEADING',
      details: 'Опис обіцяє гарантований дохід, хоча захід скасовано. Прошу перевірити.',
      status: 'OPEN',
    },
    {
      reporterId: olena.id,
      targetType: 'USER',
      userId: andriy.id,
      reason: 'INAPPROPRIATE_NAME',
      details: 'Демонстраційна скарга для перевірки адмінпанелі. Ім’я та аватар виглядають сумнівно.',
      status: 'OPEN',
    },
    {
      reporterId: null,
      targetType: 'WEBINAR',
      webinarId: suspicious.id,
      reason: 'INAPPROPRIATE_CONTENT',
      details: 'Автоматична перевірка виявила підозрілий вміст. Захід приховано до рішення адміністратора.',
      status: 'OPEN',
      isAutomated: true,
    },
  ]);

  console.log('Demo data created.');
  console.log(`Demo accounts (password: ${env.DEMO_PASSWORD}):`);
  for (const demoUser of demoUsers) {
    console.log(`  - ${demoUser.email} (${demoUser.displayName})`);
  }
  console.log(`Demo webinars: ${createdWebinars.length}; favorites and registrations included.`);
};

const run = async (): Promise<void> => {
  if (isProduction) {
    if (env.SEED_DEMO) {
      throw new Error('SEED_DEMO must be false in production.');
    }
    if (env.ADMIN_PASSWORD === 'Admin12345!' || env.ADMIN_EMAIL.endsWith('.local')) {
      throw new Error('Set a strong ADMIN_PASSWORD and a real ADMIN_EMAIL before seeding production.');
    }
  }

  await seedAdmin();
  if (env.SEED_DEMO) {
    await seedDemo();
  } else {
    console.log('SEED_DEMO=false, demo data skipped.');
  }
};

run()
  .then(() => {
    console.log('Seed completed.');
    process.exit(0);
  })
  .catch((error: unknown) => {
    logger.error({ error }, 'seed:failed');
    console.error(error);
    process.exit(1);
  });
