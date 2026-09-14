"use client";

import { SORT_LABELS } from "@/lib/analytics";
import { CATEGORY_LIST } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { DEFAULT_FILTERS, type CategoryId, type DateRangePreset, type Filters, type SortKey } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { CloseIcon, SearchIcon } from "@/components/ui/Icons";

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "last-7", label: "Last 7 days" },
  { value: "last-30", label: "Last 30 days" },
  { value: "last-90", label: "Last 90 days" },
  { value: "this-year", label: "This year" },
  { value: "custom", label: "Custom range" },
];

interface ExpenseFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  /** Number of expenses matching the current filters, for the summary line. */
  matchCount: number;
  totalCount: number;
}

export function ExpenseFilters({
  filters,
  onChange,
  matchCount,
  totalCount,
}: ExpenseFiltersProps) {
  const patch = (partial: Partial<Filters>) =>
    onChange({ ...filters, ...partial });

  const toggleCategory = (id: CategoryId) => {
    const next = filters.categories.includes(id)
      ? filters.categories.filter((category) => category !== id)
      : [...filters.categories, id];
    patch({ categories: next });
  };

  const isFiltered =
    filters.search.trim() !== "" ||
    filters.categories.length > 0 ||
    filters.preset !== "all";

  return (
    <div className="space-y-3 border-b border-border p-4">
      {/* Row 1 — search, range, sort. Filters sit in one row above the list. */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon
            width={17}
            height={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={filters.search}
            onChange={(event) => patch({ search: event.target.value })}
            placeholder="Search descriptions and categories..."
            aria-label="Search expenses"
            className="field pl-9 pr-9"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => patch({ search: "" })}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted transition-colors hover:bg-surface-2 hover:text-primary"
            >
              <CloseIcon width={15} height={15} />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <select
            value={filters.preset}
            onChange={(event) =>
              patch({ preset: event.target.value as DateRangePreset })
            }
            aria-label="Date range"
            className="field w-full cursor-pointer sm:w-[142px]"
          >
            {PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>

          <select
            value={filters.sort}
            onChange={(event) =>
              patch({ sort: event.target.value as SortKey })
            }
            aria-label="Sort order"
            className="field w-full cursor-pointer sm:w-[146px]"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2 — custom range, only when it applies. */}
      {filters.preset === "custom" && (
        <div className="flex flex-col gap-2 rounded-lg bg-surface-2 p-3 sm:flex-row sm:items-center">
          <label htmlFor="range-from" className="text-[13px] text-secondary">
            From
          </label>
          <input
            id="range-from"
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(event) => patch({ from: event.target.value })}
            className="field flex-1"
          />
          <label htmlFor="range-to" className="text-[13px] text-secondary sm:ml-2">
            To
          </label>
          <input
            id="range-to"
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(event) => patch({ to: event.target.value })}
            className="field flex-1"
          />
        </div>
      )}

      {/* Row 3 — category toggles. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {CATEGORY_LIST.map((category) => {
          const active = filters.categories.includes(category.id);
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => toggleCategory(category.id)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-medium transition-all",
                active
                  ? "border-transparent text-primary"
                  : "border-border text-secondary hover:border-border-strong hover:bg-surface-2",
              )}
              style={
                active
                  ? {
                      backgroundColor: `color-mix(in srgb, ${category.color} 14%, var(--surface))`,
                      boxShadow: `inset 0 0 0 1.5px ${category.color}`,
                    }
                  : undefined
              }
            >
              <CategoryIcon
                category={category.id}
                width={14}
                height={14}
                style={{ color: category.color }}
              />
              {category.label}
            </button>
          );
        })}
      </div>

      {/* Summary + reset */}
      <div className="flex items-center justify-between gap-3 pt-0.5">
        <p className="text-[13px] text-secondary" aria-live="polite">
          {isFiltered ? (
            <>
              <span className="font-medium text-primary tabular-nums">
                {matchCount}
              </span>{" "}
              of {totalCount} {totalCount === 1 ? "expense" : "expenses"}
            </>
          ) : (
            <>
              <span className="font-medium text-primary tabular-nums">
                {totalCount}
              </span>{" "}
              {totalCount === 1 ? "expense" : "expenses"}
            </>
          )}
        </p>
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort })}
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
