import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export default function AdminPage() {
  return (
    <>
      <Header />
      <main>
        <AdminDashboard />
      </main>
      <Footer />
    </>
  );
}
