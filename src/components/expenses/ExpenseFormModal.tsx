"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useExpenses } from "@/context/ExpenseProvider";
import { useToast } from "@/context/ToastProvider";
import { CATEGORY_LIST } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { addDays, toISODate, today } from "@/lib/date";
import {
  MAX_DESCRIPTION,
  validateExpenseForm,
  type ExpenseFormValues,
  type FieldErrors,
} from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Modal } from "@/components/ui/Modal";

const EMPTY: ExpenseFormValues = {
  amount: "",
  category: "",
  date: "",
  description: "",
};

export function ExpenseFormModal() {
  const { isFormOpen, editing, closeForm, addExpense, updateExpense } =
    useExpenses();
  const { toast } = useToast();

  const [values, setValues] = useState<ExpenseFormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  /** Errors stay hidden until the first submit, then update live. */
  const [submitted, setSubmitted] = useState(false);
  const formId = "expense-form";

  // Seed the fields whenever the dialog opens.
  useEffect(() => {
    if (!isFormOpen) return;
    setValues(
      editing
        ? {
            amount: editing.amount.toFixed(2),
            category: editing.category,
            date: editing.date,
            description: editing.description,
          }
        : { ...EMPTY, date: today() },
    );
    setErrors({});
    setSubmitted(false);
  }, [isFormOpen, editing]);

  const setField = useCallback(
    (field: keyof ExpenseFormValues, value: string) => {
      setValues((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  // Live-validate only after a failed submit, so typing isn't nagged at.
  useEffect(() => {
    if (submitted) setErrors(validateExpenseForm(values).errors);
  }, [values, submitted]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = validateExpenseForm(values);
    setSubmitted(true);
    setErrors(result.errors);

    if (!result.draft) {
      // Move focus to the first bad field so keyboard users aren't stranded.
      const firstError = Object.keys(result.errors)[0];
      const element = document.querySelector<HTMLElement>(
        `[data-field="${firstError}"]`,
      );
      element?.focus();
      return;
    }

    if (editing) {
      updateExpense(editing.id, result.draft);
      toast({
        title: "Expense updated",
        description: result.draft.description,
        variant: "success",
      });
    } else {
      addExpense(result.draft);
      toast({
        title: "Expense added",
        description: `${result.draft.description} · ${result.draft.date}`,
        variant: "success",
      });
    }
    closeForm();
  };

  const descriptionLeft = MAX_DESCRIPTION - values.description.length;

  const quickDates = useMemo(
    () => [
      { label: "Today", value: today() },
      { label: "Yesterday", value: toISODate(addDays(new Date(), -1)) },
    ],
    [],
  );

  return (
    <Modal
      open={isFormOpen}
      onClose={closeForm}
      title={editing ? "Edit expense" : "Add expense"}
      description={
        editing
          ? "Update the details and save your changes."
          : "Record what you spent and where it went."
      }
      footer={
        <>
          <Button variant="secondary" onClick={closeForm}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId}>
            {editing ? "Save changes" : "Add expense"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Amount */}
        <div>
          <label htmlFor="amount" className="label">
            Amount
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted"
              aria-hidden="true"
            >
              $
            </span>
            <input
              id="amount"
              data-field="amount"
              data-autofocus
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={values.amount}
              onChange={(event) => setField("amount", event.target.value)}
              aria-invalid={Boolean(errors.amount)}
              aria-describedby={errors.amount ? "amount-error" : undefined}
              className={cn(
                "field pl-7 text-base font-medium tabular-nums",
                errors.amount && "field-invalid",
              )}
            />
          </div>
          <FieldError id="amount-error" message={errors.amount} />
        </div>

        {/* Category */}
        <fieldset>
          <legend className="label">Category</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CATEGORY_LIST.map((category, index) => {
              const selected = values.category === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  // Only the first chip is tabbable when nothing is selected —
                  // arrow-free radio semantics without a real radio group.
                  data-field={index === 0 ? "category" : undefined}
                  onClick={() => setField("category", category.id)}
                  aria-pressed={selected}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-[13px] font-medium transition-all",
                    selected
                      ? "border-transparent text-primary shadow-card"
                      : "border-border text-secondary hover:border-border-strong hover:bg-surface-2",
                  )}
                  style={
                    selected
                      ? {
                          backgroundColor: `color-mix(in srgb, ${category.color} 12%, var(--surface))`,
                          boxShadow: `inset 0 0 0 1.5px ${category.color}`,
                        }
                      : undefined
                  }
                >
                  <CategoryIcon
                    category={category.id}
                    width={17}
                    height={17}
                    style={{ color: category.color }}
                    className="shrink-0"
                  />
                  <span className="truncate">{category.label}</span>
                </button>
              );
            })}
          </div>
          <FieldError id="category-error" message={errors.category} />
        </fieldset>

        {/* Date */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label htmlFor="date" className="label mb-0">
              Date
            </label>
            <div className="flex gap-1">
              {quickDates.map((quick) => (
                <button
                  key={quick.label}
                  type="button"
                  onClick={() => setField("date", quick.value)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[12px] font-medium transition-colors",
                    values.date === quick.value
                      ? "bg-brand-soft text-brand"
                      : "text-muted hover:bg-surface-2 hover:text-primary",
                  )}
                >
                  {quick.label}
                </button>
              ))}
            </div>
          </div>
          <input
            id="date"
            data-field="date"
            type="date"
            max={today()}
            value={values.date}
            onChange={(event) => setField("date", event.target.value)}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? "date-error" : undefined}
            className={cn("field", errors.date && "field-invalid")}
          />
          <FieldError id="date-error" message={errors.date} />
        </div>

        {/* Description */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label htmlFor="description" className="label mb-0">
              Description
            </label>
            {values.description.length > MAX_DESCRIPTION - 30 && (
              <span
                className={cn(
                  "text-[12px] tabular-nums",
                  descriptionLeft < 0 ? "text-danger" : "text-muted",
                )}
              >
                {descriptionLeft}
              </span>
            )}
          </div>
          <input
            id="description"
            data-field="description"
            type="text"
            autoComplete="off"
            placeholder="e.g. Grocery run at the corner market"
            value={values.description}
            onChange={(event) => setField("description", event.target.value)}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? "description-error" : undefined
            }
            className={cn("field", errors.description && "field-invalid")}
          />
          <FieldError id="description-error" message={errors.description} />
        </div>
      </form>
    </Modal>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-[13px] text-danger">
      {message}
    </p>
  );
}
