"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "@/lib/motion/use-in-view";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

export interface CountUpProps {
  value: number;
  suffix?: string;
  durationMs?: number;
}

/**
 * Counts up from 0 to `value` once scrolled into view. Plain
 * `requestAnimationFrame`, no dependency. When the user prefers reduced
 * motion, the initial render already shows the final value (lazy
 * `useState` initializer) — no animation ever starts.
 */
export function CountUp({ value, suffix = "", durationMs = 1200 }: CountUpProps) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const prefersReducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(() => (prefersReducedMotion ? value : 0));
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current || prefersReducedMotion) return;
    started.current = true;

    const start = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, prefersReducedMotion, value, durationMs]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}
