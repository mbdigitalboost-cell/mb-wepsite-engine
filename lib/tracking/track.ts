"use client";

import type { TrackingEventName, TrackingPayload } from "@/lib/tracking/events";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/**
 * Single entry point for firing a tracking event from anywhere in the app.
 *
 * Today this only pushes to `window.dataLayer`, which is a no-op until a
 * GTM container is actually loaded (see `TrackingScripts`). When Meta
 * Pixel / Meta CAPI / Google Ads are wired up later, they should be
 * configured as GTM tags/triggers reacting to these `dataLayer` events
 * rather than adding more call sites throughout the app — this function
 * itself should not need to change.
 */
export function track(event: TrackingEventName, payload: TrackingPayload = {}) {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...payload });

  if (process.env.NODE_ENV === "development") {
    console.debug("[tracking]", event, payload);
  }
}
