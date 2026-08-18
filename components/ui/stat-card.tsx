import type { LucideIcon } from "lucide-react";
import { Icon } from "@/components/ui/icon";

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
}

/** Small metric tile used on the admin dashboard overview (customer/website/active counts). */
export function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-black/10 p-5 transition-shadow hover:shadow-sm">
      {icon ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-accent/10">
          <Icon icon={icon} size="sm" className="text-brand-accent" />
        </div>
      ) : null}
      <div>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-sm text-foreground/60">{label}</p>
      </div>
    </div>
  );
}
