const APPOINTMENT_STYLES: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-600",
  CONFIRMED: "bg-brand-50 text-brand-700",
  COMPLETED: "bg-emerald-50 text-emerald-600",
  CANCELLED: "bg-slate-100 text-slate-500",
  NO_SHOW: "bg-red-50 text-red-600",
};

const INVOICE_STYLES: Record<string, string> = {
  UNPAID: "bg-red-50 text-red-600",
  PARTIAL: "bg-amber-50 text-amber-600",
  PAID: "bg-emerald-50 text-emerald-600",
  REFUNDED: "bg-slate-100 text-slate-500",
};

export function StatusBadge({ status, kind = "appointment" }: { status: string; kind?: "appointment" | "invoice" }) {
  const styles = kind === "invoice" ? INVOICE_STYLES : APPOINTMENT_STYLES;
  return <span className={`badge ${styles[status] || "bg-slate-100 text-slate-500"}`}>{status.replace("_", " ")}</span>;
}
