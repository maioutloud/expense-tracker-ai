"use client";

import { useState } from "react";

import type { CategorySlice } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { formatCurrency, formatPercent } from "@/lib/format";

const SIZE = 200;
const CENTER = SIZE / 2;
const OUTER = 84;
const INNER = 56;
const MID = (OUTER + INNER) / 2;
/** A 2px surface gap between segments, expressed as an angle at the mid-radius. */
const GAP_DEGREES = (2 / MID) * (180 / Math.PI);

function polar(radius: number, angleDegrees: number) {
  // -90 puts 0 degrees at 12 o'clock; angles run clockwise from there.
  const radians = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(radians),
    y: CENTER + radius * Math.sin(radians),
  };
}

function arcPath(startAngle: number, endAngle: number): string {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = polar(OUTER, startAngle);
  const outerEnd = polar(OUTER, endAngle);
  const innerEnd = polar(INNER, endAngle);
  const innerStart = polar(INNER, startAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${OUTER} ${OUTER} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${INNER} ${INNER} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

interface DonutChartProps {
  slices: CategorySlice[];
  total: number;
  /** Shown under the total in the ring's center. */
  caption?: string;
}

export function DonutChart({ slices, total, caption }: DonutChartProps) {
  const [active, setActive] = useState<number | null>(null);

  const visible = slices.filter((slice) => slice.total > 0);
  const activeSlice = active !== null ? visible[active] : null;

  // One category owning everything gets a plain ring — a gap in a full circle
  // reads as a rendering bug rather than a separator.
  const single = visible.length === 1;

  let cursor = 0;
  const segments = visible.map((slice, index) => {
    const sweep = slice.share * 360;
    const start = cursor;
    cursor += sweep;

    const inset = single ? 0 : Math.min(GAP_DEGREES / 2, sweep / 4);
    return {
      slice,
      index,
      d: arcPath(start + inset, start + sweep - inset),
    };
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative shrink-0">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={200}
          height={200}
          role="img"
          aria-label={`Spending by category, total ${formatCurrency(total)}`}
          className="max-w-full"
          onMouseLeave={() => setActive(null)}
        >
          {single ? (
            <circle
              cx={CENTER}
              cy={CENTER}
              r={MID}
              fill="none"
              stroke={visible[0].color}
              strokeWidth={OUTER - INNER}
            />
          ) : (
            segments.map(({ slice, index, d }) => (
              <path
                key={slice.id}
                d={d}
                fill={slice.color}
                className="cursor-pointer transition-opacity duration-150"
                opacity={active === null || active === index ? 1 : 0.35}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                tabIndex={0}
              >
                <title>{`${slice.label}: ${formatCurrency(slice.total)} (${formatPercent(slice.share)})`}</title>
              </path>
            ))
          )}
        </svg>

        {/* Center readout — the total, swapped for slice detail on hover. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {activeSlice ? (
            <>
              <span className="max-w-[104px] truncate text-[11px] font-medium uppercase tracking-wide text-muted">
                {activeSlice.label}
              </span>
              <span className="mt-0.5 text-xl font-semibold text-primary">
                {formatCurrency(activeSlice.total)}
              </span>
              <span className="text-[11px] text-secondary">
                {formatPercent(activeSlice.share)} of total
              </span>
            </>
          ) : (
            <>
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                Total
              </span>
              <span className="mt-0.5 text-xl font-semibold text-primary">
                {formatCurrency(total)}
              </span>
              {caption && (
                <span className="text-[11px] text-secondary">{caption}</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* The legend doubles as the direct-label channel: three of the light-mode
          series colors sit under 3:1 on the surface, so every value is written out. */}
      <ul className="w-full min-w-0 space-y-1">
        {visible.map((slice, index) => (
          <li key={slice.id}>
            <button
              type="button"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                active === index ? "bg-surface-2" : "hover:bg-surface-2",
              )}
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="min-w-0 flex-1 truncate text-[13px] text-secondary">
                {slice.label}
              </span>
              <span className="shrink-0 text-[13px] font-medium tabular-nums text-primary">
                {formatCurrency(slice.total)}
              </span>
              <span className="w-9 shrink-0 text-right text-[12px] tabular-nums text-muted">
                {formatPercent(slice.share)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
