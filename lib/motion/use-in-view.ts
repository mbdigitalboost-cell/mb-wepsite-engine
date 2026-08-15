"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

interface UseInViewOptions {
  /** 0–1, how much of the element must be visible before it's "in view". */
  threshold?: number;
  /** Shrinks/grows the viewport check, e.g. "-10% 0px" to trigger a bit early. */
  rootMargin?: string;
  /** Once true, stop observing (reveal animations shouldn't replay on scroll-back-up). */
  once?: boolean;
}

/**
 * Lightweight scroll-reveal primitive — the whole animation system's
 * foundation. No animation library: a plain `IntersectionObserver` plus a
 * boolean. Consumers (Reveal, CountUp, ...) turn that boolean into a CSS
 * class toggle or a rAF loop.
 *
 * When the user prefers reduced motion, `inView` is `true` immediately
 * (derived directly, not via a post-mount effect) and the observer never
 * attaches — content renders in its final state with no motion at all,
 * not just a faster transition.
 */
export function useInView<T extends HTMLElement>({
  threshold = 0.2,
  rootMargin = "0px 0px -10% 0px",
  once = true,
}: UseInViewOptions = {}) {
  const ref = useRef<T | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [observedInView, setObservedInView] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setObservedInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setObservedInView(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [prefersReducedMotion, threshold, rootMargin, once]);

  return { ref, inView: prefersReducedMotion || observedInView };
}
