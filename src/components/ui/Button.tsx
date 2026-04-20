import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand-brown text-brand-cream hover:bg-brand-brown-deep active:bg-brand-brown-deep disabled:opacity-40",
  accent:  "bg-brand-tan text-brand-brown hover:bg-brand-tan-dark active:bg-brand-tan-dark disabled:opacity-40",
  ghost:   "border border-brand-brown/20 bg-transparent text-brand-brown hover:bg-brand-brown/5 active:bg-brand-brown/10 disabled:opacity-40",
  danger:  "bg-danger text-brand-cream hover:opacity-90 active:opacity-80 disabled:opacity-40",
  success: "bg-success text-brand-cream hover:opacity-90 active:opacity-80 disabled:opacity-40",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-7 px-3 text-[12px]",
  md: "h-9 px-4 text-[13px]",
  lg: "h-11 px-6 text-[14px]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-sm font-display font-semibold tracking-wide transition-colors",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {loading && (
        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
