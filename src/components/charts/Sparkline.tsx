"use client";

import { useId } from "react";

interface SparklineProps {
  /** One value per period, oldest first. */
  values: number[];
  height?: number;
  color?: string;
  label?: string;
}

const VIEW_W = 100;

/**
 * A bare trend shape for stat tiles — 2px line, no axes, no labels. The tile's
 * value carries the number; this only carries the shape.
 *
 * The plot is stretched with `preserveAspectRatio="none"` so it fills any width.
 * That would squash a circular end-marker into an ellipse, so the marker is an
 * HTML overlay positioned in percentages instead of an SVG element.
 */
export function Sparkline({
  values,
  height = 40,
  color = "var(--brand)",
  label = "Trend",
}: SparklineProps) {
  const gradientId = useId();

  if (values.length < 2) {
    return <div style={{ height }} aria-hidden="true" />;
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * VIEW_W;
    // 3px of padding top and bottom so the stroke and marker never clip.
    const y = height - 3 - ((value - min) / span) * (height - 6);
    return { x, y };
  });

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const area = `${line} L ${VIEW_W} ${height} L 0 ${height} Z`;
  const last = points[points.length - 1];

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${height}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        role="img"
        aria-label={label}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            {/* A wash, never a saturated block. */}
            <stop offset="0%" stopColor={color} stopOpacity="0.16" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          // Keeps the 2px stroke true despite the non-uniform scaling.
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* End marker: 8px dot with a 2px surface ring. */}
      <span
        aria-hidden="true"
        className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: `${last.x}%`,
          top: `${(last.y / height) * 100}%`,
          backgroundColor: color,
          boxShadow: "0 0 0 2px var(--surface)",
        }}
      />
    </div>
  );
}
