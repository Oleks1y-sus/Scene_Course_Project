'use client';

import { useEffect, useState } from 'react';

/**
 * Returns the current timestamp after mount and refreshes it on an interval.
 * Starting from 0 keeps the server render and the first client render equal,
 * which avoids hydration mismatches around time-dependent UI.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
