import type { SVGProps } from "react";

import { CATEGORIES } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";

const PATHS: Record<CategoryId, JSX.Element> = {
  food: (
    <>
      <path d="M6 3v7a2 2 0 0 0 2 2 2 2 0 0 0 2-2V3" />
      <path d="M8 12v9" />
      <path d="M17.5 3C16 4.5 15.5 6.5 15.5 8.5c0 1.7.8 2.8 2 3.1V21" />
    </>
  ),
  transportation: (
    <>
      <path d="M5 17V12l1.8-4.2A2 2 0 0 1 8.6 6.5h6.8a2 2 0 0 1 1.8 1.3L19 12v5" />
      <path d="M4 12h16" />
      <circle cx="7.5" cy="17" r="1.6" />
      <circle cx="16.5" cy="17" r="1.6" />
    </>
  ),
  entertainment: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M3 15h18" />
      <path d="M8 4v5M16 4v5M8 15v5M16 15v5" />
    </>
  ),
  shopping: (
    <>
      <path d="M6.5 3h11l2 5v11a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V8l2-5Z" />
      <path d="M4.5 8h15" />
      <path d="M15 11.5a3 3 0 0 1-6 0" />
    </>
  ),
  bills: (
    <>
      <path d="M5 3.5 6.8 5l1.8-1.5L10.4 5l1.8-1.5L14 5l1.8-1.5L17.6 5l1.4-1.2v16.9l-1.4-1.2-1.8 1.5L14 19.5l-1.8 1.5-1.8-1.5-1.8 1.5L6.8 19.5 5 20.7V3.5Z" />
      <path d="M8.5 9h7M8.5 13h7M8.5 16.5h4" />
    </>
  ),
  other: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M7.5 12h.01M12 12h.01M16.5 12h.01" />
    </>
  ),
};

interface CategoryIconProps extends SVGProps<SVGSVGElement> {
  category: CategoryId;
}

export function CategoryIcon({ category, ...props }: CategoryIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      width={20}
      height={20}
      {...props}
    >
      {PATHS[category]}
    </svg>
  );
}

/**
 * The icon in a tinted round chip. The chip carries the category's series color,
 * so identity never rests on the text alone.
 */
export function CategoryChip({
  category,
  size = 36,
}: {
  category: CategoryId;
  size?: number;
}) {
  const meta = CATEGORIES[category];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        // color-mix keeps the tint tied to the one source of truth for the hue.
        backgroundColor: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
        color: meta.color,
      }}
      title={meta.label}
    >
      <CategoryIcon category={category} width={size * 0.55} height={size * 0.55} />
    </span>
  );
}
