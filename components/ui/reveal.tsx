"use client";

import type { ElementType, ReactNode } from "react";
import { useInView } from "@/lib/motion/use-in-view";
import { MOTION_STAGGER_STEP } from "@/lib/design-system/tokens";
import { cn } from "@/lib/utils/cn";

type RevealVariant = "fade-up" | "fade-in" | "scale-in";

const variantClasses: Record<RevealVariant, { base: string; visible: string }> = {
  "fade-up": {
    base: "opacity-0 translate-y-6",
    visible: "opacity-100 translate-y-0",
  },
  "fade-in": {
    base: "opacity-0",
    visible: "opacity-100",
  },
  "scale-in": {
    base: "opacity-0 scale-95",
    visible: "opacity-100 scale-100",
  },
};

export interface RevealProps {
  children: ReactNode;
  variant?: RevealVariant;
  /** Position in a staggered group (0-indexed) — multiplies MOTION_STAGGER_STEP. */
  index?: number;
  as?: ElementType;
  className?: string;
}

/**
 * Scroll-reveal wrapper built on `useInView` — the single mechanism every
 * section uses for "fade up on scroll" and "staggered reveal". No
 * animation library; a CSS transition toggled by an IntersectionObserver
 * boolean. Honors prefers-reduced-motion via `useInView` itself (content
 * renders already-visible, no transition at all).
 */
export function Reveal({
  children,
  variant = "fade-up",
  index = 0,
  as: Tag = "div",
  className,
}: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const { base, visible } = variantClasses[variant];

  return (
    <Tag
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-[var(--motion-easing)] will-change-transform",
        inView ? visible : base,
        className,
      )}
      style={{ transitionDelay: inView ? `${index * MOTION_STAGGER_STEP}ms` : "0ms" }}
    >
      {children}
    </Tag>
  );
}
