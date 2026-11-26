'use client';

import { useEffect, useState } from 'react';

const pad = (value: number): string => String(value).padStart(2, '0');

export function Countdown({ targetIso }: { targetIso: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(targetIso).getTime();
    const tick = () => setRemaining(Math.max(0, target - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [targetIso]);

  if (remaining === null) {
    return <div className="countdown" aria-hidden="true"><div className="countdown__box">--</div><div className="countdown__box">--</div><div className="countdown__box">--</div><div className="countdown__box">--</div></div>;
  }

  if (remaining <= 0) {
    return <p className="countdown__started">Час починати — захід уже має бути в ефірі.</p>;
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="countdown-wrap">
      <p className="countdown__label">До початку залишилось</p>
      <div className="countdown" role="timer" aria-label={`До початку ${days} днів ${hours} годин ${minutes} хвилин`}>
        <div className="countdown__box"><strong>{pad(days)}</strong><span>днів</span></div>
        <div className="countdown__box"><strong>{pad(hours)}</strong><span>годин</span></div>
        <div className="countdown__box"><strong>{pad(minutes)}</strong><span>хвилин</span></div>
        <div className="countdown__box"><strong>{pad(seconds)}</strong><span>секунд</span></div>
      </div>
    </div>
  );
}
