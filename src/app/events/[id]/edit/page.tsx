import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { WebinarForm } from '@/components/webinars/WebinarForm';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const metadata: Metadata = {
  title: 'Редагування заходу',
  description: 'Оновіть інформацію про ваш онлайн-захід на платформі «Сцена».',
  robots: { index: false, follow: false },
};

export default async function EditWebinarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  return (
    <>
      <Header />
      <main>
        <WebinarForm mode="edit" webinarId={id} />
      </main>
      <Footer />
    </>
  );
}
