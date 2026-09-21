import { useCallback, useEffect, useRef, useState } from "react";

// Ticks a countdown down to 0 once per second. start(seconds) (re)starts it —
// used both when the server proactively tells us a cooldown is active
// (COOLDOWN_ACTIVE response) and right after a successful send, since we
// know the server enforces a 300s window either way.
export function useCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback((seconds: number) => {
    setSecondsLeft(seconds);
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [secondsLeft > 0]);

  return { secondsLeft, start, isActive: secondsLeft > 0 };
}