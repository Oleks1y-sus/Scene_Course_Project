import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ProfileClient } from '@/components/profile/ProfileClient';

export const metadata: Metadata = {
  title: 'Мій профіль',
  description: 'Керуйте профілем, обраними та створеними заходами, переглядайте статистику й налаштування безпеки.',
  robots: { index: false, follow: false },
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[]; notice?: string | string[] }>;
}) {
  const params = await searchParams;
  const tab = typeof params.tab === 'string' ? params.tab : undefined;
  const notice = typeof params.notice === 'string' ? params.notice : undefined;

  return (
    <>
      <Header />
      <main>
        <ProfileClient initialTab={tab} notice={notice} />
      </main>
      <Footer />
    </>
  );
}
