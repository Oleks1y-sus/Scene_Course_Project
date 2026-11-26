import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { WebinarDetailClient } from '@/components/webinars/WebinarDetailClient';
import type { WebinarDetail } from '@/lib/types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const apiOrigin = (process.env.API_ORIGIN ?? 'http://localhost:4000').replace(/\/+$/, '');

const fetchWebinar = async (id: string): Promise<WebinarDetail | null> => {
  if (!UUID_PATTERN.test(id)) return null;
  try {
    const response = await fetch(`${apiOrigin}/api/v1/webinars/${id}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: WebinarDetail };
    return payload.data ?? null;
  } catch {
    return null;
  }
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const webinar = await fetchWebinar(id);
  if (!webinar) {
    return {
      title: 'Захід не знайдено',
      robots: { index: false, follow: false },
    };
  }

  const description = webinar.descriptionExcerpt;
  return {
    title: webinar.title,
    description,
    alternates: { canonical: `/events/${webinar.id}` },
    openGraph: {
      type: 'article',
      title: webinar.title,
      description,
      images: [{ url: webinar.coverUrl, alt: `Обкладинка заходу «${webinar.title}»` }],
    },
    robots: { index: webinar.moderationStatus === 'VISIBLE', follow: true },
  };
}

export default async function WebinarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  return (
    <>
      <Header />
      <main>
        <WebinarDetailClient id={id} />
      </main>
      <Footer />
    </>
  );
}
