"use client";

import { useEffect, useState } from "react";

function readPrefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Tracks the user's `prefers-reduced-motion` OS setting live (it can
 * change while the page is open). Every JS-driven animation in this
 * project (scroll reveal, count-up, stagger) must check this and skip
 * straight to the end state when `true` — CSS transition-duration is
 * already neutralized globally in globals.css, but JS timers/rAF loops
 * need this explicit check too.
 *
 * Initial value is read lazily in `useState` (not set via an effect) so
 * it's correct from the very first client render with no extra re-render.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(readPrefersReducedMotion);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return reduced;
}
