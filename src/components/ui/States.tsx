"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { AlertIcon } from "./Icons";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

/** Card-shaped placeholder used while localStorage is being read. */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("card p-5", className)}>
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="mt-3 h-8 w-32" />
      <Skeleton className="mt-3 h-3 w-20" />
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <Skeleton className="h-9 w-9 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="mt-2 h-3 w-24" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-secondary">{description}</p>
      )}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-danger bg-danger-soft p-4"
    >
      <AlertIcon width={18} height={18} className="mt-0.5 shrink-0 text-danger" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-primary">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-secondary">{description}</p>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
