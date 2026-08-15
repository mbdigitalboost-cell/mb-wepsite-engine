import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export interface LogoProps {
  /** Which background this instance renders on — picks the matching SVG variant. */
  background?: "dark" | "light";
  srcDark: string | null;
  srcLight: string | null;
  alt: string;
  /** Fallback wordmark rendered as text when no SVG file exists yet. */
  wordmarkLines: [string, string];
  width?: number;
  height?: number;
  href?: string;
  className?: string;
}

/**
 * Renders the brand's SVG logo, falling back to a clean text wordmark
 * when no file has been provided yet (this project's current state for
 * Petra — see lib/data/petra/brand-assets.ts). Never redraws a real logo
 * in CSS; once a real SVG is supplied it's used as-is, aspect ratio
 * preserved via next/image width/height.
 */
export function Logo({
  background = "dark",
  srcDark,
  srcLight,
  alt,
  wordmarkLines,
  width = 132,
  height = 40,
  href = "/",
  className,
}: LogoProps) {
  const src = background === "dark" ? srcDark : srcLight;

  const content = src ? (
    <Image src={src} alt={alt} width={width} height={height} className="h-auto w-auto" priority={false} />
  ) : (
    <span className="flex flex-col leading-none font-semibold tracking-tight">
      <span className="text-base">{wordmarkLines[0]}</span>
      <span
        className={cn(
          "text-[0.6rem] font-medium tracking-[0.2em]",
          background === "dark" ? "text-brand-muted" : "text-brand-muted",
        )}
      >
        {wordmarkLines[1]}
      </span>
    </span>
  );

  return (
    <Link href={href} className={cn("inline-flex items-center", className)} aria-label={alt}>
      {content}
    </Link>
  );
}
