import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; isPositive: boolean };
  color?: "amber" | "blue" | "green" | "red" | "purple" | "indigo";
}

export default function StatCard({ title, value, subtitle, trend }: StatCardProps) {
  return (
    <div className="rounded-lg border border-brand-brown/10 bg-surface p-5 shadow-1">
      <p className="font-display text-[10px] font-semibold tracking-[.15em] text-brand-olive/70 uppercase">
        {title}
      </p>
      <p className="mt-2 font-display text-[28px] font-bold leading-none text-brand-brown">
        {value}
      </p>
      {(subtitle || trend) && (
        <div className="mt-2 flex items-center gap-2">
          {trend && (
            <span className={cn(
              "font-display text-[11px] font-semibold",
              trend.isPositive ? "text-success" : "text-danger"
            )}>
              {trend.isPositive ? "+" : ""}{trend.value}%
            </span>
          )}
          {subtitle && (
            <span className="text-[12px] text-brand-olive/60">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}
