import type { PetraCampaign } from "@/lib/data/petra/types";

/**
 * Empty by design. No confirmed pricing/campaign exists yet — the brief's
 * example numbers (50.900 TL, 12 taksit, ...) are illustrative only and
 * must never ship as real content. `Campaigns` section renders nothing
 * until this array has real, customer-confirmed entries.
 */
export const petraCampaigns: PetraCampaign[] = [];
