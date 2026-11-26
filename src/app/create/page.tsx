import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { WebinarForm } from '@/components/webinars/WebinarForm';

export const metadata: Metadata = {
  title: 'Створення онлайн-заходу',
  description: 'Створіть вебінар або онлайн-захід на платформі «Сцена»: оберіть тему, дату, обкладинку та місткість.',
  robots: { index: false, follow: false },
};

export default function CreateWebinarPage() {
  return (
    <>
      <Header />
      <main>
        <WebinarForm mode="create" />
      </main>
      <Footer />
    </>
  );
}
