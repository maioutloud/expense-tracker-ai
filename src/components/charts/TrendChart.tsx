"use client";

import { useState } from "react";

import type { MonthPoint } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import {
  formatCompactCurrency,
  formatCurrency,
  formatMonthKey,
} from "@/lib/format";

const PLOT_HEIGHT = 208;
const TICK_COUNT = 4;

/** Rounds an axis maximum up to a clean 1 / 2 / 2.5 / 5 x 10^n value. */
function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

interface TrendChartProps {
  data: MonthPoint[];
}

/**
 * Monthly spend as columns. One series, so no legend box — the card title names it.
 * Values are direct-labeled selectively (the peak and the current month); the rest
 * are carried by the axis and the hover tooltip.
 */
export function TrendChart({ data }: TrendChartProps) {
  const [active, setActive] = useState<number | null>(null);

  const max = Math.max(...data.map((point) => point.total), 0);
  const axisMax = niceMax(max);
  const peakIndex = data.reduce(
    (best, point, index) => (point.total > data[best].total ? index : best),
    0,
  );

  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => {
    const fraction = i / TICK_COUNT;
    return { value: axisMax * (1 - fraction), top: fraction * PLOT_HEIGHT };
  });

  return (
    <div className="flex gap-2" onMouseLeave={() => setActive(null)}>
      {/* Y axis */}
      <div
        className="relative w-12 shrink-0"
        style={{ height: PLOT_HEIGHT }}
        aria-hidden="true"
      >
        {ticks.map((tick) => (
          <span
            key={tick.top}
            className="absolute right-0 -translate-y-1/2 text-[11px] tabular-nums text-muted"
            style={{ top: tick.top }}
          >
            {formatCompactCurrency(tick.value)}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height: PLOT_HEIGHT }}>
          {/* Hairline gridlines, one step off the surface. */}
          {ticks.map((tick) => (
            <div
              key={tick.top}
              className="absolute inset-x-0 border-t"
              style={{
                top: tick.top,
                borderColor:
                  tick.value === 0 ? "var(--axis)" : "var(--grid)",
              }}
              aria-hidden="true"
            />
          ))}

          <div className="absolute inset-0 flex items-end">
            {data.map((point, index) => {
              const height =
                axisMax > 0 ? (point.total / axisMax) * PLOT_HEIGHT : 0;
              const isActive = active === index;
              const labelled =
                index === peakIndex || index === data.length - 1;

              return (
                <div
                  key={point.key}
                  className="group relative flex h-full flex-1 flex-col justify-end"
                  onMouseEnter={() => setActive(index)}
                >
                  {/* Full-height hit target — the bar alone is too small to hover. */}
                  <button
                    type="button"
                    className="absolute inset-0 cursor-default"
                    aria-label={`${formatMonthKey(point.key)}: ${formatCurrency(point.total)} across ${point.count} ${point.count === 1 ? "expense" : "expenses"}`}
                    onFocus={() => setActive(index)}
                    onBlur={() => setActive(null)}
                  />

                  {labelled && point.total > 0 && !isActive && (
                    <span
                      className="pointer-events-none mb-1 text-center text-[11px] font-medium tabular-nums text-secondary"
                      aria-hidden="true"
                    >
                      {formatCompactCurrency(point.total)}
                    </span>
                  )}

                  <div className="pointer-events-none flex justify-center">
                    <div
                      className={cn(
                        "w-full max-w-[24px] transition-[opacity,height] duration-300",
                        // 4px rounded data-end, square at the baseline.
                        "rounded-t-[4px]",
                      )}
                      style={{
                        height: Math.max(height, point.total > 0 ? 3 : 0),
                        backgroundColor: "var(--brand)",
                        opacity: active === null || isActive ? 1 : 0.4,
                      }}
                    />
                  </div>

                  {isActive && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1.5 text-center shadow-pop">
                      <p className="text-[11px] text-muted">
                        {formatMonthKey(point.key, true)}
                      </p>
                      <p className="text-[13px] font-semibold tabular-nums text-primary">
                        {formatCurrency(point.total)}
                      </p>
                      <p className="text-[11px] text-secondary">
                        {point.count} {point.count === 1 ? "expense" : "expenses"}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* X axis */}
        <div className="mt-2 flex">
          {data.map((point, index) => (
            <span
              key={point.key}
              className={cn(
                "flex-1 text-center text-[11px] transition-colors",
                active === index
                  ? "font-medium text-primary"
                  : "text-muted",
              )}
            >
              {formatMonthKey(point.key, true).split(" ")[0]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
