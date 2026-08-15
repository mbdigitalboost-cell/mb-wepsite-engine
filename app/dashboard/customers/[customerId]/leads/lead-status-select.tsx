"use client";

import { setLeadStatusAction } from "./actions";

const STATUS_LABELS: Record<string, string> = { new: "Yeni", contacted: "İletişime Geçildi", closed: "Kapatıldı" };

export function LeadStatusSelect({ customerId, leadId, currentStatus }: { customerId: string; leadId: string; currentStatus: string }) {
  const action = setLeadStatusAction.bind(null, customerId, leadId);

  return (
    <form action={action}>
      <select
        name="status"
        defaultValue={currentStatus}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-black/15 bg-transparent px-2 py-1.5 text-xs text-foreground"
      >
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </form>
  );
}
