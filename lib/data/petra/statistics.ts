import type { PetraStatistic } from "@/lib/data/petra/types";

/**
 * Empty by design — customer count / project count / years of experience
 * / support hours are all unconfirmed. The brief's example figures
 * (1000+, 500+, 15+, 7/24) must never ship as real content. `Statistics`
 * section renders nothing until this array has real, confirmed entries.
 */
export const petraStatistics: PetraStatistic[] = [];
