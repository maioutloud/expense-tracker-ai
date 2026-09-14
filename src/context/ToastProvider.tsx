"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  action?: ToastAction;
  duration: number;
}

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  action?: ToastAction;
  /** Milliseconds before auto-dismiss. */
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      // An actionable toast (e.g. "Undo") stays up longer so it is usable.
      const duration =
        options.duration ?? (options.action ? 7000 : options.variant === "error" ? 6000 : 3800);

      const next: Toast = {
        id,
        title: options.title,
        description: options.description,
        variant: options.variant ?? "info",
        action: options.action,
        duration,
      };

      setToasts((current) => [...current, next].slice(-MAX_VISIBLE));

      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  // Clear any pending timers if the provider unmounts.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const value = useMemo(
    () => ({ toasts, toast, dismiss }),
    [toasts, toast, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>.");
  }
  return context;
}
