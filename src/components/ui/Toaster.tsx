"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useToast, type ToastVariant } from "@/context/ToastProvider";
import { cn } from "@/lib/cn";
import { AlertIcon, CheckCircleIcon, CloseIcon, InfoIcon } from "./Icons";

const ICONS: Record<ToastVariant, typeof InfoIcon> = {
  success: CheckCircleIcon,
  error: AlertIcon,
  info: InfoIcon,
};

const ICON_COLORS: Record<ToastVariant, string> = {
  success: "text-good",
  error: "text-danger",
  info: "text-brand",
};

export function Toaster() {
  const { toasts, dismiss } = useToast();
  const [mounted, setMounted] = useState(false);

  // Portals need a DOM; defer until after hydration.
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
      // Polite: a toast is a status, not an interruption.
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.variant];
        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={cn(
              "pointer-events-auto flex w-full max-w-sm animate-slide-in items-start gap-3",
              "rounded-xl border border-border bg-surface p-3.5 shadow-pop",
            )}
          >
            <Icon
              width={18}
              height={18}
              className={cn("mt-0.5 shrink-0", ICON_COLORS[toast.variant])}
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-primary">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 truncate text-[13px] text-secondary">
                  {toast.description}
                </p>
              )}
            </div>

            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
                className="shrink-0 rounded-md px-2 py-1 text-[13px] font-semibold text-brand transition-colors hover:bg-brand-soft"
              >
                {toast.action.label}
              </button>
            )}

            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-surface-2 hover:text-primary"
            >
              <CloseIcon width={15} height={15} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
