"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";
import { IconButton } from "./Button";
import { CloseIcon } from "./Icons";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  /** Rendered under the header — the tab strip, typically. */
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * A side panel that fills the viewport height on desktop and becomes a tall
 * bottom sheet on narrow screens. Deliberately a different pattern from the
 * centered dialog used elsewhere: this one holds a multi-section workspace
 * people move around in, not a single form they complete and dismiss.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  toolbar,
  footer,
  children,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current = document.activeElement as HTMLElement | null;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    document.addEventListener("keydown", onKeyDown);
    const timer = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>("[data-autofocus], button, input, select")
        ?.focus();
    }, 20);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      restoreFocusTo.current?.focus?.();
    };
  }, [open, onKeyDown]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative z-10 flex w-full flex-col bg-surface shadow-pop",
          "mt-auto h-[92vh] animate-scale-in rounded-t-2xl border border-border",
          "sm:mt-0 sm:h-full sm:max-w-2xl sm:animate-slide-in-right sm:rounded-none sm:rounded-l-2xl sm:border-y-0 sm:border-r-0",
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-primary">
              {title}
            </h2>
            {subtitle && (
              <div className="mt-0.5 text-sm text-secondary">{subtitle}</div>
            )}
          </div>
          <IconButton
            label="Close panel"
            variant="ghost"
            size="sm"
            onClick={onClose}
            icon={<CloseIcon width={18} height={18} />}
            className="-mr-1 shrink-0"
          />
        </header>

        {toolbar && (
          <div className="border-b border-border px-5">{toolbar}</div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer && (
          <footer className="border-t border-border px-5 py-3.5">{footer}</footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
