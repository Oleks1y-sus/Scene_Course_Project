import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Політика конфіденційності',
  description: 'Як платформа «Сцена» збирає, використовує та захищає персональні дані користувачів.',
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main>
        <div className="app-page legal-page">
          <div className="container container--narrow">
            <p className="page-heading__eyebrow">Правова інформація</p>
            <h1 className="page-heading__title">Політика конфіденційності</h1>
            <p className="legal-updated">Оновлено: 26 листопада 2026 року</p>

            <section className="legal-section">
              <h2>1. Які дані ми збираємо</h2>
              <p>
                Для роботи платформи ми обробляємо ім’я, адресу електронної пошти, хеш пароля,
                вибраний аватар, біографію, а також інформацію про створені заходи, реєстрації,
                обрані події та скарги. Пароль ніколи не зберігається у відкритому вигляді.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Для чого використовуються дані</h2>
              <p>
                Дані потрібні для автентифікації, надсилання одноразових кодів входу, відображення
                профілю та заходів, роботи обраного й реєстрацій, модерації скарг, а також для
                формування знеособленої статистики.
              </p>
            </section>

            <section className="legal-section">
              <h2>3. Передача даних</h2>
              <p>
                Ми не продаємо персональні дані. Для інфраструктури використовуються постачальники
                хостингу та бази даних, а для надсилання листів — сервіс електронної пошти. Передача
                даних відбувається лише в обсязі, потрібному для роботи сервісу.
              </p>
            </section>

            <section className="legal-section">
              <h2>4. Файли cookie</h2>
              <p>
                Платформа використовує одну сесійну cookie з атрибутами HttpOnly, Secure та SameSite.
                Вона потрібна для підтримки входу й не використовується для рекламного відстеження.
              </p>
            </section>

            <section className="legal-section">
              <h2>5. Ваші права</h2>
              <p>
                Ви можете змінити ім’я, біографію, аватар і пошту в налаштуваннях профілю, змінити
                пароль або видалити акаунт. Після видалення створені заходи скасовуються та
                приховуються, а персональні дані анонімізуються.
              </p>
            </section>

            <section className="legal-section">
              <h2>6. Безпека</h2>
              <p>
                Паролі хешуються алгоритмом Argon2id. Сесії зберігаються у вигляді хешів, вхід
                захищений одноразовим кодом на пошту, а всі зміни даних проходять серверну
                валідацію. Підозрілі дії обмежуються rate limiting.
              </p>
            </section>

            <p className="legal-contact">
              Питання щодо даних: <a href="mailto:privacy@scene.example">privacy@scene.example</a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
