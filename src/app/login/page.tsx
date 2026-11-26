import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Вхід у акаунт',
  description: 'Увійдіть у «Сцену», щоб переглядати вебінари, зберігати обрані заходи та керувати власними подіями.',
  robots: { index: false, follow: false },
};

const safeNextPath = (value: string | string[] | undefined): string => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/events';
  return value;
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);

  return (
    <AuthShell
      title="З поверненням"
      subtitle="Увійдіть, щоб продовжити роботу зі своїми заходами."
      footer={
        <p>
          Для входу використовуються логін і пароль. Пошта та логін не показуються іншим
          користувачам. Якщо пароль забуто, скористайтеся відновленням.
        </p>
      }
    >
      <LoginForm nextPath={nextPath} />
    </AuthShell>
  );
}
