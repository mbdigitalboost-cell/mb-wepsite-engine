interface StatCardProps {
  label: string;
  value: number | string;
}

/** Small metric tile used on the admin dashboard overview (customer/website/active counts). */
export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-lg border border-black/10 p-5">
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-foreground/60">{label}</p>
    </div>
  );
}
