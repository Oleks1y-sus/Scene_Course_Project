import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Відновлення пароля',
  description: 'Відновіть доступ до акаунта «Сцени» за логіном і електронною поштою.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Відновлення пароля"
      subtitle="Підтвердіть логін і пошту, щоб установити новий пароль."
      footer={
        <p>
          Ми не надсилаємо листів. Якщо логін і пошта збігаються, ви зможете змінити пароль
          одразу. Після зміни всі активні сесії буде завершено.
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
