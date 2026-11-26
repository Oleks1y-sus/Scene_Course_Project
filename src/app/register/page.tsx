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
          Публічним буде лише юзернейм. Логін і пошта залишаються приватними. Пароль
          зберігається у вигляді криптографічного хеша Argon2id.
        </p>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
