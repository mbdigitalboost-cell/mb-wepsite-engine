"use client";

// Client Component boundary is deliberate here, not incidental: almost
// every CTA in this project fires a tracking event on click (see brief
// §19/§33), so the shared Button primitive needs to support `onClick`
// wherever it's rendered — including from Server Component sections like
// Hero/Campaigns/FinalCTA. Keeping that boundary at this single small
// leaf component (instead of promoting whole sections to "use client")
// is what keeps Server Components the default everywhere else.
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { track } from "@/lib/tracking/track";
import type { TrackingEventName, TrackingPayload } from "@/lib/tracking/events";
import type { MouseEventHandler, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  /** Appends an arrow that nudges right on hover — the brief's "arrow movement" micro-interaction. */
  showArrow?: boolean;
  /** When set, renders as a styled navigation link instead of a <button>. */
  href?: string;
  /** Opens `href` in a new tab with rel="noopener noreferrer" (e.g. WhatsApp). */
  external?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  /**
   * Fires `track(trackEvent, trackPayload)` on click. Use this (not
   * `onClick`) when a Server Component section needs a CTA to report a
   * tracking event — event name + a plain payload object are
   * serializable props a Server Component CAN pass to a Client
   * Component; a function like `onClick` cannot cross that boundary.
   */
  trackEvent?: TrackingEventName;
  trackPayload?: TrackingPayload;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  "aria-label"?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-brand-primary text-white hover:opacity-90",
  secondary: "bg-brand-secondary text-white hover:opacity-90",
  outline: "border border-current bg-transparent hover:bg-white/5",
  ghost: "bg-transparent hover:bg-white/5",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-12 px-6 text-sm",
  lg: "h-14 px-8 text-base",
};

const baseClasses =
  "group inline-flex items-center justify-center gap-2 rounded-[var(--radius-brand,0.5rem)] font-medium tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:pointer-events-none disabled:opacity-50";

function Arrow() {
  return (
    <ArrowRight
      size={16}
      strokeWidth={2}
      aria-hidden="true"
      className="transition-transform duration-300 group-hover:translate-x-1"
    />
  );
}

/**
 * Generic, unbranded button primitive — used both as `<button>` (form
 * submit, menu toggles) and, via `href`, as a styled `next/link` (CTAs
 * that navigate). Colors resolve through the `bg-brand-*` tokens set by
 * `ThemeProvider`, so this single component reskins per customer without
 * any prop or code change.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  showArrow,
  href,
  external,
  onClick,
  trackEvent,
  trackPayload,
  type = "button",
  disabled,
  "aria-label": ariaLabel,
}: ButtonProps) {
  const classes = cn(baseClasses, variantClasses[variant], sizeClasses[size], className);

  const handleClick: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement> = (event) => {
    if (trackEvent) track(trackEvent, trackPayload);
    onClick?.(event);
  };

  if (href && external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={classes}
        aria-label={ariaLabel}
      >
        {children}
        {showArrow ? <Arrow /> : null}
      </a>
    );
  }

  if (href) {
    return (
      <Link href={href} onClick={handleClick} className={classes} aria-label={ariaLabel}>
        {children}
        {showArrow ? <Arrow /> : null}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={handleClick}
      className={classes}
      aria-label={ariaLabel}
    >
      {children}
      {showArrow ? <Arrow /> : null}
    </button>
  );
}
