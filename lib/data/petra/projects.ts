import type { PetraProject } from "@/lib/data/petra/types";

/**
 * Empty by design. No real project photos/case studies have been provided
 * yet — the brief explicitly forbids showing AI-generated or stock imagery
 * as if it were a real Petra project. `Projects` section renders an
 * empty state until this array has real entries.
 */
export const petraProjects: PetraProject[] = [];
