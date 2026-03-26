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
    RECEIVED: "bg-blue-100 text-blue-800",
    IN_PRODUCTION: "bg-yellow-100 text-yellow-800",
    PARTIALLY_CUT: "bg-orange-100 text-orange-800",
    FULLY_CUT: "bg-green-100 text-green-800",
    EXHAUSTED: "bg-stone-100 text-stone-800",
    RAW: "bg-stone-100 text-stone-800",
    EPOXY_DONE: "bg-purple-100 text-purple-800",
    POLISHED: "bg-indigo-100 text-indigo-800",
    QC_PASSED: "bg-green-100 text-green-800",
    QC_FAILED: "bg-red-100 text-red-800",
    IN_STOCK: "bg-green-100 text-green-800",
    RESERVED: "bg-yellow-100 text-yellow-800",
    SOLD: "bg-blue-100 text-blue-800",
    DAMAGED: "bg-red-100 text-red-800",
    IN_PROGRESS: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    PAUSED: "bg-orange-100 text-orange-800",
    CANCELLED: "bg-red-100 text-red-800",
    CURING: "bg-purple-100 text-purple-800",
    FAILED: "bg-red-100 text-red-800",
    REWORK_NEEDED: "bg-orange-100 text-orange-800",
    ACTIVE: "bg-green-100 text-green-800",
    MAINTENANCE: "bg-yellow-100 text-yellow-800",
    INACTIVE: "bg-stone-100 text-stone-800",
    PASS: "bg-green-100 text-green-800",
    FAIL: "bg-red-100 text-red-800",
    PENDING: "bg-yellow-100 text-yellow-800",
  };
  return colors[status] || "bg-stone-100 text-stone-800";
}
