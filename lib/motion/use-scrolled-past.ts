"use client";

import { useEffect, useState } from "react";

/**
 * True once the page has scrolled past `threshold` pixels. Used by
 * `SiteHeader` to switch from a transparent hero-overlay header to a
 * dark, blurred sticky header — a passive scroll listener, not tied to
 * any animation library.
 */
export function useScrolledPast(threshold = 24): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > threshold);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return scrolled;
}
