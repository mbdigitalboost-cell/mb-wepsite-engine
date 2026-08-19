"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

export interface ParallaxState {
  /** Normalized horizontal offset, -1 (left/start edge) .. 1 (right/end edge). */
  x: number;
  /** Normalized vertical offset, -1 (top/start edge) .. 1 (bottom/end edge). */
  y: number;
  /** Which input drove the current value — lets a consumer scale/skip effects per device. */
  source: "mouse" | "touch" | null;
}

const ZERO_STATE: ParallaxState = { x: 0, y: 0, source: null };

/** Smoothing factor applied per animation frame — lower = lazier/heavier, higher = snappier. */
const LERP_FACTOR = 0.1;

/** Below this delta a frame's change is imperceptible — skips a React re-render for it. */
const MIN_DELTA = 0.0006;

/**
 * Tracks a normalized (-1..1) pointer offset relative to the center of the
 * element `ref` is attached to — mouse on desktop (mousemove/mouseleave),
 * drag-since-touchstart on mobile (touchstart/touchmove/touchend), both on
 * the SAME element so one hook covers the brief's desktop-mouse and
 * mobile-touch requirements together.
 *
 * Per the brief: raw pointer events are only ever written into a ref
 * (`targetRef`), never straight into React state — the actual state
 * update (and therefore the only React re-render this hook causes) comes
 * exclusively from the rAF loop below, which lerps the current value
 * toward that target and skips the `setState` call entirely when the
 * frame's movement is below `MIN_DELTA`. This is what "no direct
 * state-per-mousemove" and "lerp the movement smooth" mean together: the
 * lerp isn't just cosmetic easing, it's also the throttle.
 *
 * Touch listeners are attached with `{ passive: true }` and never call
 * `preventDefault` — this hook only *reads* touch position, it never
 * blocks the browser's native scroll handling.
 *
 * When `prefers-reduced-motion: reduce` is set, no listeners attach at
 * all and the returned state is permanently `{ x: 0, y: 0, source: null }`
 * — every transform a consumer derives from this collapses to identity,
 * i.e. the effect is fully off, not just toned down.
 */
export function useParallaxPointer<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [state, setState] = useState<ParallaxState>(ZERO_STATE);

  const targetRef = useRef<ParallaxState>(ZERO_STATE);
  const currentRef = useRef<ParallaxState>(ZERO_STATE);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const node = ref.current;
    if (!node) return;

    const clamp = (value: number) => Math.min(1, Math.max(-1, value));

    function handleMouseMove(event: MouseEvent) {
      const rect = node!.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      targetRef.current = {
        x: clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2),
        y: clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2),
        source: "mouse",
      };
    }

    function handleMouseLeave() {
      targetRef.current = { ...targetRef.current, x: 0, y: 0 };
    }

    function handleTouchStart(event: TouchEvent) {
      const touch = event.touches[0];
      if (!touch) return;
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }

    function handleTouchMove(event: TouchEvent) {
      const touch = event.touches[0];
      const start = touchStartRef.current;
      const rect = node!.getBoundingClientRect();
      if (!touch || !start || rect.width === 0 || rect.height === 0) return;
      targetRef.current = {
        x: clamp(((touch.clientX - start.x) / rect.width) * 2),
        y: clamp(((touch.clientY - start.y) / rect.height) * 2),
        source: "touch",
      };
    }

    function handleTouchEnd() {
      touchStartRef.current = null;
      targetRef.current = { ...targetRef.current, x: 0, y: 0 };
    }

    node.addEventListener("mousemove", handleMouseMove);
    node.addEventListener("mouseleave", handleMouseLeave);
    node.addEventListener("touchstart", handleTouchStart, { passive: true });
    node.addEventListener("touchmove", handleTouchMove, { passive: true });
    node.addEventListener("touchend", handleTouchEnd, { passive: true });
    node.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    function tick() {
      const current = currentRef.current;
      const target = targetRef.current;
      const next: ParallaxState = {
        x: current.x + (target.x - current.x) * LERP_FACTOR,
        y: current.y + (target.y - current.y) * LERP_FACTOR,
        source: target.source,
      };
      currentRef.current = next;

      setState((prev) =>
        Math.abs(prev.x - next.x) > MIN_DELTA || Math.abs(prev.y - next.y) > MIN_DELTA || prev.source !== next.source
          ? next
          : prev,
      );

      frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      node.removeEventListener("mousemove", handleMouseMove);
      node.removeEventListener("mouseleave", handleMouseLeave);
      node.removeEventListener("touchstart", handleTouchStart);
      node.removeEventListener("touchmove", handleTouchMove);
      node.removeEventListener("touchend", handleTouchEnd);
      node.removeEventListener("touchcancel", handleTouchEnd);
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      targetRef.current = ZERO_STATE;
      currentRef.current = ZERO_STATE;
    };
  }, [prefersReducedMotion]);

  return { ref, state: prefersReducedMotion ? ZERO_STATE : state };
}
