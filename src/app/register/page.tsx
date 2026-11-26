import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = {
  title: 'Створення акаунта',
  description: 'Створіть акаунт на платформі «Сцена», щоб відвідувати онлайн-заходи та проводити власні вебінари.',
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Створіть свій акаунт"
      subtitle="Кілька хвилин — і ви зможете відвідувати та проводити онлайн-заходи."
      footer={
        <p>
          Ми надішлемо код підтвердження на вашу пошту. Пароль зберігається лише у вигляді
          криптографічного хеша.
        </p>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
