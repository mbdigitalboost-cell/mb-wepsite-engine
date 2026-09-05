import { setNavigationItemStatusAction } from "./actions";
import type { ContentStatus } from "@/lib/cms/customer-types";

interface NavigationStatusButtonsProps {
  customerId: string;
  itemId: string;
  currentStatus: ContentStatus;
}

const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: "Taslak",
  published: "Yayınla",
  archived: "Arşivle",
};

export function NavigationStatusButtons({ customerId, itemId, currentStatus }: NavigationStatusButtonsProps) {
  const statuses: ContentStatus[] = ["draft", "published", "archived"];

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((status) => {
        const isCurrent = status === currentStatus;
        const action = setNavigationItemStatusAction.bind(null, customerId, itemId, status);
        return (
          <form key={status} action={action}>
            <button
              type="submit"
              disabled={isCurrent}
              className={
                isCurrent
                  ? "rounded-md bg-black/5 px-3 py-1.5 text-xs font-medium text-foreground"
                  : "rounded-md px-3 py-1.5 text-xs font-medium text-foreground/60 underline-offset-2 hover:text-foreground hover:underline"
              }
            >
              {STATUS_LABELS[status]}
            </button>
          </form>
        );
      })}
    </div>
  );
}
