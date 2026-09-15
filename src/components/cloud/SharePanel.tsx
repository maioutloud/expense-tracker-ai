"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  AlertIcon,
  CheckIcon,
  CopyIcon,
  LinkIcon,
  ShareIcon,
} from "@/components/ui/Icons";
import { useExpenses } from "@/context/ExpenseProvider";
import { useToast } from "@/context/ToastProvider";
import { resolveRange } from "@/lib/analytics";
import {
  buildShareUrl,
  classifyLength,
  encodeShare,
} from "@/lib/cloud/share";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import { sumAmounts } from "@/lib/money";
import type { DateRangePreset } from "@/lib/types";

const SCOPES: { value: DateRangePreset; label: string }[] = [
  { value: "this-month", label: "This month" },
  { value: "last-30", label: "Last 30 days" },
  { value: "last-90", label: "Last 90 days" },
  { value: "all", label: "Everything" },
];

export function SharePanel() {
  const { expenses } = useExpenses();
  const { toast } = useToast();

  const [scope, setScope] = useState<DateRangePreset>("this-month");
  const [title, setTitle] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [copied, setCopied] = useState(false);

  const now = useMemo(() => new Date(), []);

  const selected = useMemo(() => {
    const range = resolveRange(scope, "", "", now);
    return expenses.filter((expense) => {
      if (range.from && expense.date < range.from) return false;
      if (range.to && expense.date > range.to) return false;
      return true;
    });
  }, [expenses, scope, now]);

  const total = useMemo(
    () => sumAmounts(selected.map((expense) => expense.amount)),
    [selected],
  );

  // Any change to what's being shared invalidates the link that's on screen.
  useEffect(() => {
    setLink(null);
    setCopied(false);
  }, [scope, title]);

  const handleGenerate = async () => {
    setBuilding(true);
    try {
      const token = await encodeShare(
        selected,
        title.trim() || `Expenses · ${SCOPES.find((s) => s.value === scope)?.label}`,
      );
      setLink(buildShareUrl(token));
    } catch (error) {
      toast({
        title: "Couldn't build the link",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
        variant: "error",
      });
    } finally {
      setBuilding(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied", variant: "success" });
    } catch {
      toast({
        title: "Couldn't copy",
        description: "Select the link and copy it manually.",
        variant: "error",
      });
    }
  };

  const verdict = link ? classifyLength(link) : null;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-surface-2 p-4">
        <div className="flex items-start gap-2.5">
          <ShareIcon width={17} height={17} className="mt-0.5 shrink-0 text-brand" />
          <div className="text-[12.5px] leading-relaxed text-secondary">
            <p className="font-medium text-primary">
              This one is real — no server involved.
            </p>
            <p className="mt-1">
              The expenses are compressed into the link&apos;s{" "}
              <span className="font-medium text-primary">fragment</span> (the part
              after <code className="rounded bg-surface px-1">#</code>), which
              browsers never transmit. The data rides inside the link itself, so
              whoever opens it sees your expenses and no server in between ever
              does — including whatever is hosting this app.
            </p>
          </div>
        </div>
      </div>

      <section>
        <h3 className="label">What to share</h3>
        <div className="flex flex-wrap gap-1.5">
          {SCOPES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setScope(option.value)}
              aria-pressed={scope === option.value}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[12.5px] font-medium transition-all",
                scope === option.value
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-border text-secondary hover:border-border-strong hover:bg-surface-2",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12.5px] text-secondary">
          <span className="font-medium tabular-nums text-primary">
            {selected.length}
          </span>{" "}
          {selected.length === 1 ? "expense" : "expenses"} ·{" "}
          <span className="font-medium tabular-nums text-primary">
            {formatCurrency(total)}
          </span>
        </p>
      </section>

      <section>
        <label htmlFor="share-title" className="label">
          Title <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="share-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="September spending"
          maxLength={80}
          className="field"
        />
      </section>

      <Button
        variant="primary"
        className="w-full"
        loading={building}
        disabled={selected.length === 0}
        onClick={handleGenerate}
        icon={<LinkIcon width={16} height={16} />}
      >
        {selected.length === 0 ? "Nothing to share" : "Generate share link"}
      </Button>

      {link && (
        <section className="space-y-2.5">
          <div className="rounded-lg border border-border bg-surface-2 p-3">
            <p className="break-all font-mono text-[11.5px] leading-relaxed text-secondary">
              {link}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              icon={
                copied ? (
                  <CheckIcon width={15} height={15} />
                ) : (
                  <CopyIcon width={15} height={15} />
                )
              }
            >
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open(link, "_blank", "noopener")}
            >
              Open in a new tab
            </Button>
          </div>

          <p
            className={cn(
              "flex items-start gap-1.5 text-[12px]",
              verdict === "too-long" ? "text-danger" : "text-muted",
            )}
          >
            {verdict !== "comfortable" && (
              <AlertIcon width={14} height={14} className="mt-0.5 shrink-0" />
            )}
            <span>
              {link.length.toLocaleString()} characters.{" "}
              {verdict === "comfortable"
                ? "Short enough to paste anywhere."
                : verdict === "long"
                  ? "Some chat apps and email clients truncate links this long — share a narrower range if it breaks."
                  : "Too long to paste reliably. Pick a narrower range."}
            </span>
          </p>
        </section>
      )}
    </div>
  );
}
