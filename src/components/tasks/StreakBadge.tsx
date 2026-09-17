import { cn } from "@/lib/utils";

const BADGE_LABELS: Record<string, string> = {
  STREAK_5: "5-Streak",
  STREAK_10: "10-Streak",
  STREAK_25: "25-Streak",
  STREAK_50: "50-Streak",
  POINTS_100: "100 pts",
  POINTS_500: "500 pts",
  POINTS_1000: "1000 pts",
  EARLY_BIRD_10: "Early Bird",
};

export function StreakBadge({
  streak,
  className,
}: {
  streak: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 font-display text-[11px] font-semibold text-warning",
        className,
      )}
    >
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2c1 3-1 5-2 6-1.5 1.5-3 3-3 6a5 5 0 0010 0c0-2-1-3.5-2-5 .5 2-1 3-1 3 .5-3-1.5-5-2-6 0-2 1-3 2-4z" />
      </svg>
      {streak}
    </span>
  );
}

export function BadgeChip({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center rounded-xs bg-brand-tan/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand-tan-dark">
      {BADGE_LABELS[code] ?? code}
    </span>
  );
}
