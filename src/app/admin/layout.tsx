import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import Link from 'next/link';
import type { User } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Адмінпанель',
  description: 'Модерація скарг, заходів і користувачів платформи «Сцена».',
  robots: { index: false, follow: false },
};

const apiOrigin = (process.env.API_ORIGIN ?? 'http://localhost:4000').replace(/\/+$/, '');

const getCurrentUser = async (): Promise<User | null> => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  if (!cookieHeader) return null;

  try {
    const response = await fetch(`${apiOrigin}/api/v1/auth/me`, {
      cache: 'no-store',
      headers: { Accept: 'application/json', Cookie: cookieHeader },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: { user?: User } };
    return payload.data?.user ?? null;
  } catch {
    return null;
  }
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?next=/admin');
  }

  if (user.role !== 'ADMIN') {
    redirect('/events');
  }

  if (user.mustChangePassword) {
    redirect('/profile?tab=security&force=1');
  }

  return (
    <>
      {children}
      <noscript>
        <div className="container" style={{ padding: '2rem 0' }}>
          Для роботи адмінпанелі потрібно увімкнути JavaScript. <Link href="/events">Повернутися до заходів</Link>
        </div>
      </noscript>
    </>
  );
}
