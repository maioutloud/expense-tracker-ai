"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-brand-fg hover:bg-brand-hover active:translate-y-px shadow-card",
  secondary:
    "bg-surface text-primary border border-border hover:bg-surface-2 hover:border-border-strong active:translate-y-px",
  ghost: "text-secondary hover:bg-surface-2 hover:text-primary",
  danger:
    "bg-danger text-white hover:opacity-90 active:translate-y-px shadow-card",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Rendered before the label; hidden while `loading`. */
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "secondary",
      size = "md",
      loading = false,
      icon,
      className,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          "inline-flex select-none items-center justify-center whitespace-nowrap font-medium",
          "transition-all duration-150",
          "disabled:pointer-events-none disabled:opacity-50",
          VARIANTS[variant],
          SIZES[size],
          className,
        )}
        {...props}
      >
        {loading ? <Spinner /> : icon}
        {children}
      </button>
    );
  },
);

function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={16}
      height={16}
      className="animate-spin"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Square icon-only button with an accessible name. */
export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonProps & { label: string }
>(function IconButton({ label, className, size = "md", ...props }, ref) {
  return (
    <Button
      ref={ref}
      aria-label={label}
      title={label}
      size={size}
      className={cn(size === "sm" ? "w-8 px-0" : "w-10 px-0", className)}
      {...props}
    />
  );
});
