import { cn } from "@/lib/utils";

type BadgeVariant = "status" | "tier";

interface StatusConfig {
  label: string;
  classes: string;
  dot: string;
}

const statusConfig: Record<string, StatusConfig> = {
  COMPLETED:     { label: "Completed",     classes: "bg-success/10 text-success",           dot: "bg-success" },
  PLANNED:       { label: "Planned",       classes: "bg-warning/10 text-warning",           dot: "bg-warning" },
  CHECKED_IN:    { label: "Checked In",    classes: "bg-info/10 text-info",                 dot: "bg-info" },
  CHECKED_OUT:   { label: "Checked Out",   classes: "bg-success/10 text-success",           dot: "bg-success" },
  FLAGGED_FAKE:  { label: "Flagged",       classes: "bg-danger/10 text-danger",             dot: "bg-danger" },
  SYNCING:       { label: "Syncing",       classes: "bg-info/10 text-info",                 dot: "bg-info" },
  DORMANT:       { label: "Dormant",       classes: "bg-brand-olive/10 text-brand-olive",   dot: "bg-brand-olive" },
  NEW:           { label: "New",           classes: "bg-info/10 text-info",                 dot: "bg-info" },
  CONTACTED:     { label: "Contacted",     classes: "bg-brand-tan/20 text-brand-tan-dark",  dot: "bg-brand-tan-dark" },
  QUALIFIED:     { label: "Qualified",     classes: "bg-mod-sales/10 text-mod-sales",       dot: "bg-mod-sales" },
  PROPOSAL_SENT: { label: "Proposal Sent", classes: "bg-mod-visit/15 text-mod-visit",       dot: "bg-mod-visit" },
  NEGOTIATION:   { label: "Negotiation",   classes: "bg-warning/10 text-warning",           dot: "bg-warning" },
  WON:           { label: "Won",           classes: "bg-success/10 text-success",           dot: "bg-success" },
  LOST:          { label: "Lost",          classes: "bg-danger/10 text-danger",             dot: "bg-danger" },
  ACTIVE:        { label: "Active",        classes: "bg-success/10 text-success",           dot: "bg-success" },
  INACTIVE:      { label: "Inactive",      classes: "bg-brand-olive/10 text-brand-olive",   dot: "bg-brand-olive" },
  PENDING:       { label: "Pending",       classes: "bg-warning/10 text-warning",           dot: "bg-warning" },
  IN_PROGRESS:   { label: "In Progress",   classes: "bg-warning/10 text-warning",           dot: "bg-warning" },
  IN_PRODUCTION: { label: "In Production", classes: "bg-warning/10 text-warning",           dot: "bg-warning" },
  COMPLETED_:    { label: "Completed",     classes: "bg-success/10 text-success",           dot: "bg-success" },
  CANCELLED:     { label: "Cancelled",     classes: "bg-danger/10 text-danger",             dot: "bg-danger" },
  PAUSED:        { label: "Paused",        classes: "bg-warning/10 text-warning",           dot: "bg-warning" },
  FAILED:        { label: "Failed",        classes: "bg-danger/10 text-danger",             dot: "bg-danger" },
  DELIVERED:     { label: "Delivered",     classes: "bg-success/10 text-success",           dot: "bg-success" },
  IN_TRANSIT:    { label: "In Transit",    classes: "bg-info/10 text-info",                 dot: "bg-info" },
  RESERVED:      { label: "Reserved",      classes: "bg-warning/10 text-warning",           dot: "bg-warning" },
  IN_STOCK:      { label: "In Stock",      classes: "bg-success/10 text-success",           dot: "bg-success" },
  SOLD:          { label: "Sold",          classes: "bg-info/10 text-info",                 dot: "bg-info" },
  DAMAGED:       { label: "Damaged",       classes: "bg-danger/10 text-danger",             dot: "bg-danger" },
};

const tierConfig: Record<string, string> = {
  PLATINUM: "bg-brand-olive text-brand-cream",
  GOLD:     "bg-mod-sales text-brand-cream",
  SILVER:   "bg-brand-olive/50 text-brand-cream",
  BRONZE:   "bg-mod-inventory text-brand-cream",
};

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
  className?: string;
}

export default function StatusBadge({ status, variant = "status", className }: StatusBadgeProps) {
  if (variant === "tier") {
    const tierClass = tierConfig[status] ?? "bg-brand-olive/10 text-brand-olive";
    return (
      <span className={cn(
        "inline-flex items-center rounded-xs px-2 py-0.5 font-display text-[10px] font-semibold tracking-[.1em]",
        tierClass,
        className
      )}>
        {status}
      </span>
    );
  }

  const config = statusConfig[status];
  const label = config?.label ?? status.replace(/_/g, " ");
  const classes = config?.classes ?? "bg-brand-olive/10 text-brand-olive";
  const dot = config?.dot ?? "bg-brand-olive";

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-display text-[11px] font-semibold tracking-wide",
      classes,
      className
    )}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
      {label}
    </span>
  );
}
