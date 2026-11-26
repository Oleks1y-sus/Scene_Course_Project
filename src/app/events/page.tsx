import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { EventsExplorer } from '@/components/webinars/EventsExplorer';

export const metadata: Metadata = {
  title: 'Каталог онлайн-заходів',
  description: 'Знайдіть вебінар, воркшоп або онлайн-захід за темою, датою та спікером. Зберігайте цікаві події в обране та реєструйтеся на участь.',
};

export default function EventsPage() {
  return (
    <>
      <Header />
      <main>
        <EventsExplorer />
      </main>
      <Footer />
    </>
  );
}
