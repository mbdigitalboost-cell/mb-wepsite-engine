import Link from "next/link";

export interface NavLink {
  href: string;
  label: string;
}

/**
 * Public site nav links. Placeholder set for the foundation — a real
 * customer site will source these from that customer's content/theme data
 * instead of this hardcoded array.
 */
const defaultLinks: NavLink[] = [{ href: "/", label: "Ana Sayfa" }];

export function MainNav({ links = defaultLinks }: { links?: NavLink[] }) {
  return (
    <nav aria-label="Ana menü" className="flex items-center gap-6">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-sm font-medium text-current/80 hover:text-current"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
