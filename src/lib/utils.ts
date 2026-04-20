export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function generateEntryNumber(
  prefix: string,
  count: number
): Promise<string> {
  const year = new Date().getFullYear();
  const num = String(count + 1).padStart(4, "0");
  return `${prefix}-${year}-${num}`;
}

export const BLOCK_TYPES = [
  "Italian Marble",
  "Indian Marble",
  "Turkish Marble",
  "Spanish Marble",
  "Greek Marble",
  "Granite",
  "Onyx",
  "Travertine",
  "Quartzite",
];

export const MARBLE_COLORS = [
  "White",
  "Beige",
  "Grey",
  "Black",
  "Brown",
  "Green",
  "Pink",
  "Red",
  "Blue",
  "Gold",
  "Cream",
  "Multi",
];

export const MARBLE_VARIETIES = [
  "Statuario",
  "Calacatta",
  "Carrara",
  "Bottochino",
  "Perlato",
  "Dyna",
  "Brescia",
  "Armani",
  "Katni",
  "Makrana",
  "Ambaji",
  "Rainforest",
  "Fantasy",
  "Spider",
  "Emperador",
  "Crema Marfil",
  "Rosso Levanto",
  "Sahara Gold",
  "Other",
];

export const ORIGINS = [
  "Italy",
  "Turkey",
  "India",
  "Spain",
  "Greece",
  "Egypt",
  "Iran",
  "Vietnam",
  "China",
  "Brazil",
  "Portugal",
];

export const GRADES = ["A", "B", "C", "D"];

export const FINISH_TYPES = [
  "Polished",
  "Honed",
  "Leather",
  "Brushed",
  "Flamed",
  "Bush Hammered",
];

export const BLOCK_STATUSES = [
  "RECEIVED",
  "IN_PRODUCTION",
  "PARTIALLY_CUT",
  "FULLY_CUT",
  "EXHAUSTED",
];

export const SLAB_STATUSES = [
  "RAW",
  "EPOXY_DONE",
  "POLISHED",
  "QC_PASSED",
  "QC_FAILED",
  "IN_STOCK",
  "RESERVED",
  "SOLD",
  "DAMAGED",
];

export const PRODUCTION_STAGES = [
  "GANG_SAW",
  "EPOXY",
  "POLISHING",
  "QC",
  "WAREHOUSE",
];

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    RECEIVED:      "bg-info/10 text-info",
    IN_PRODUCTION: "bg-warning/10 text-warning",
    PARTIALLY_CUT: "bg-warning/15 text-warning",
    FULLY_CUT:     "bg-success/10 text-success",
    EXHAUSTED:     "bg-brand-olive/10 text-brand-olive",
    RAW:           "bg-brand-olive/10 text-brand-olive",
    EPOXY_DONE:    "bg-mod-epoxy/15 text-mod-epoxy",
    POLISHED:      "bg-mod-polish/15 text-mod-polish",
    QC_PASSED:     "bg-success/10 text-success",
    QC_FAILED:     "bg-danger/10 text-danger",
    IN_STOCK:      "bg-success/10 text-success",
    RESERVED:      "bg-warning/10 text-warning",
    SOLD:          "bg-info/10 text-info",
    DAMAGED:       "bg-danger/10 text-danger",
    IN_PROGRESS:   "bg-warning/10 text-warning",
    COMPLETED:     "bg-success/10 text-success",
    PAUSED:        "bg-warning/15 text-warning",
    CANCELLED:     "bg-danger/10 text-danger",
    CURING:        "bg-mod-epoxy/15 text-mod-epoxy",
    FAILED:        "bg-danger/10 text-danger",
    REWORK_NEEDED: "bg-warning/15 text-warning",
    ACTIVE:        "bg-success/10 text-success",
    MAINTENANCE:   "bg-warning/10 text-warning",
    INACTIVE:      "bg-brand-olive/10 text-brand-olive",
    PASS:          "bg-success/10 text-success",
    FAIL:          "bg-danger/10 text-danger",
    PENDING:       "bg-warning/10 text-warning",
    // Field CRM statuses
    NEW:           "bg-info/10 text-info",
    CONTACTED:     "bg-brand-tan/20 text-brand-tan-dark",
    QUALIFIED:     "bg-mod-sales/10 text-mod-sales",
    PROPOSAL_SENT: "bg-mod-visit/15 text-mod-visit",
    NEGOTIATION:   "bg-warning/10 text-warning",
    WON:           "bg-success/10 text-success",
    LOST:          "bg-danger/10 text-danger",
    DORMANT:       "bg-brand-olive/10 text-brand-olive",
    PLANNED:       "bg-warning/10 text-warning",
    CHECKED_IN:    "bg-info/10 text-info",
    CHECKED_OUT:   "bg-success/10 text-success",
    FLAGGED_FAKE:  "bg-danger/15 text-danger",
    IN_TRANSIT:    "bg-info/10 text-info",
    DELIVERED:     "bg-success/10 text-success",
    RETURNED:      "bg-warning/15 text-warning",
  };
  return colors[status] || "bg-brand-olive/10 text-brand-olive";
}
