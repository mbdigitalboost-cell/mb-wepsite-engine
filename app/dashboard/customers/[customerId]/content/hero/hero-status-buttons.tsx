import { setHeroStatusAction } from "./actions";
import type { ContentStatus } from "@/lib/cms/customer-types";

const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: "Taslak",
  published: "Yayınla",
  archived: "Arşivle",
};

/**
 * Hero-specific version of ../[type]/status-buttons.tsx — hero_sections
 * isn't one of the 6 generic content types (see
 * lib/cms/dashboard/content-types.ts), so it needs its own bound action
 * (setHeroStatusAction) rather than the generic setContentItemStatusAction.
 */
export function HeroStatusButtons({
  customerId,
  heroId,
  currentStatus,
}: {
  customerId: string;
  heroId: string;
  currentStatus: ContentStatus;
}) {
  const statuses: ContentStatus[] = ["draft", "published", "archived"];

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((status) => {
        const isCurrent = status === currentStatus;
        const action = setHeroStatusAction.bind(null, customerId, heroId, status);
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
