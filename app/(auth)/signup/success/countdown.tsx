'use client';

import { useState, useEffect } from 'react';

interface CountdownProps {
  expiresAt: number; // Unix timestamp ms
}

export function EarlyBirdCountdown({ expiresAt }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const tick = () => {
      const diff = expiresAt - Date.now();
      if (diff <= 0) {
        setExpired(true);
        setTimeLeft('00:00:00');
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const t = setInterval(tick, 1_000);
    return () => clearInterval(t);
  }, [expiresAt]);

  if (expired) return null;
  return <span className="font-mono text-2xl font-black tracking-widest text-indigo-300">{timeLeft}</span>;
}
