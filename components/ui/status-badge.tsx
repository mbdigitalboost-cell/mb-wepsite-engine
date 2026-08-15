import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: "active" | "inactive";
}

/** Consistent Aktif/Pasif rendering everywhere a customer_status/website_status shows up. */
export function StatusBadge({ status }: StatusBadgeProps) {
  const isActive = status === "active";
  return (
    <Badge
      variant={isActive ? "solid" : "outline"}
      className={isActive ? undefined : "text-foreground/50"}
    >
      {isActive ? "Aktif" : "Pasif"}
    </Badge>
  );
}
