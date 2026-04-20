import { cn } from "@/lib/utils";
import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FieldWrapperProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

function FieldWrapper({ label, required, error, hint, children, className }: FieldWrapperProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label className="font-display text-[11px] font-semibold tracking-[.12em] text-brand-olive/80 uppercase">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[12px] text-danger">{error}</p>
      )}
      {hint && !error && (
        <p className="text-[12px] text-brand-olive/55">{hint}</p>
      )}
    </div>
  );
}

const inputBase =
  "w-full rounded-sm border border-brand-brown/20 bg-surface px-3 py-2 text-[13px] text-brand-brown placeholder:text-brand-olive/35 focus:border-brand-tan focus:outline-none focus:ring-2 focus:ring-brand-tan/20 transition-colors disabled:opacity-50";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export function Input({ label, required, error, hint, wrapperClassName, className, ...props }: InputProps) {
  return (
    <FieldWrapper label={label} required={required} error={error} hint={hint} className={wrapperClassName}>
      <input
        {...props}
        className={cn(inputBase, error && "border-danger focus:border-danger focus:ring-danger/20", className)}
      />
    </FieldWrapper>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export function Select({ label, required, error, hint, wrapperClassName, className, children, ...props }: SelectProps) {
  return (
    <FieldWrapper label={label} required={required} error={error} hint={hint} className={wrapperClassName}>
      <select
        {...props}
        className={cn(inputBase, "cursor-pointer", error && "border-danger focus:border-danger focus:ring-danger/20", className)}
      >
        {children}
      </select>
    </FieldWrapper>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export function Textarea({ label, required, error, hint, wrapperClassName, className, ...props }: TextareaProps) {
  return (
    <FieldWrapper label={label} required={required} error={error} hint={hint} className={wrapperClassName}>
      <textarea
        {...props}
        className={cn(inputBase, "resize-none", error && "border-danger focus:border-danger focus:ring-danger/20", className)}
      />
    </FieldWrapper>
  );
}
