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

import { useToast } from "@/context/ToastProvider";
import { createSampleExpenses } from "@/lib/sample";
import {
  clearStoredExpenses,
  createId,
  loadExpenses,
  saveExpenses,
} from "@/lib/storage";
import type { Expense, ExpenseDraft } from "@/lib/types";

export type StoreStatus = "loading" | "ready" | "error";

interface ExpenseContextValue {
  expenses: Expense[];
  status: StoreStatus;
  error: string | null;

  addExpense: (draft: ExpenseDraft) => Expense;
  updateExpense: (id: string, draft: ExpenseDraft) => void;
  deleteExpense: (id: string) => void;
  clearAll: () => void;
  loadSampleData: () => void;

  /** Add/edit dialog plumbing, shared by the nav button and the list rows. */
  isFormOpen: boolean;
  editing: Expense | null;
  openForm: (expense?: Expense) => void;
  closeForm: () => void;
}

const ExpenseContext = createContext<ExpenseContextValue | null>(null);

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [status, setStatus] = useState<StoreStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  /**
   * Guards the persistence effect. Without it, the effect fires once with the
   * initial empty array and overwrites whatever is in localStorage before the
   * load has finished.
   */
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      setExpenses(loadExpenses());
      setStatus("ready");
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Could not read your saved expenses.";
      setError(message);
      setStatus("error");
    } finally {
      hydrated.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current || status !== "ready") return;
    try {
      saveExpenses(expenses);
    } catch (saveError) {
      toast({
        title: "Couldn't save",
        description:
          saveError instanceof Error
            ? saveError.message
            : "Your change may be lost when you reload.",
        variant: "error",
      });
    }
  }, [expenses, status, toast]);

  const addExpense = useCallback(
    (draft: ExpenseDraft) => {
      const now = new Date().toISOString();
      const expense: Expense = {
        ...draft,
        id: createId(),
        createdAt: now,
        updatedAt: now,
      };
      setExpenses((current) => [expense, ...current]);
      return expense;
    },
    [],
  );

  const updateExpense = useCallback((id: string, draft: ExpenseDraft) => {
    setExpenses((current) =>
      current.map((expense) =>
        expense.id === id
          ? { ...expense, ...draft, updatedAt: new Date().toISOString() }
          : expense,
      ),
    );
  }, []);

  const deleteExpense = useCallback(
    (id: string) => {
      let removed: Expense | undefined;
      let index = -1;

      setExpenses((current) => {
        index = current.findIndex((expense) => expense.id === id);
        if (index === -1) return current;
        removed = current[index];
        return current.filter((expense) => expense.id !== id);
      });

      if (!removed) return;
      const restored = removed;
      const position = index;

      toast({
        title: "Expense deleted",
        description: restored.description,
        variant: "info",
        action: {
          label: "Undo",
          onClick: () => {
            // Put it back where it was so the list doesn't visibly reshuffle.
            setExpenses((current) => {
              if (current.some((expense) => expense.id === restored.id)) {
                return current;
              }
              const next = [...current];
              next.splice(Math.min(position, next.length), 0, restored);
              return next;
            });
          },
        },
      });
    },
    [toast],
  );

  const clearAll = useCallback(() => {
    const previous = expenses;
    setExpenses([]);
    try {
      clearStoredExpenses();
    } catch {
      /* The state change alone will re-persist an empty list. */
    }
    toast({
      title: "All expenses cleared",
      description: `${previous.length} ${previous.length === 1 ? "expense" : "expenses"} removed.`,
      variant: "info",
      action: {
        label: "Undo",
        onClick: () => setExpenses(previous),
      },
    });
  }, [expenses, toast]);

  const loadSampleData = useCallback(() => {
    const sample = createSampleExpenses();
    setExpenses(sample);
    toast({
      title: "Sample data loaded",
      description: `${sample.length} expenses across the last 5 months.`,
      variant: "success",
    });
  }, [toast]);

  const openForm = useCallback((expense?: Expense) => {
    setEditing(expense ?? null);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
  }, []);

  const value = useMemo(
    () => ({
      expenses,
      status,
      error,
      addExpense,
      updateExpense,
      deleteExpense,
      clearAll,
      loadSampleData,
      isFormOpen,
      editing,
      openForm,
      closeForm,
    }),
    [
      expenses,
      status,
      error,
      addExpense,
      updateExpense,
      deleteExpense,
      clearAll,
      loadSampleData,
      isFormOpen,
      editing,
      openForm,
      closeForm,
    ],
  );

  return (
    <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>
  );
}

export function useExpenses(): ExpenseContextValue {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error("useExpenses must be used inside <ExpenseProvider>.");
  }
  return context;
}
