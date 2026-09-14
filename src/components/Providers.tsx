"use client";

import type { ReactNode } from "react";

import { ExpenseProvider } from "@/context/ExpenseProvider";
import { ThemeProvider } from "@/context/ThemeProvider";
import { ToastProvider } from "@/context/ToastProvider";
import { ExpenseFormModal } from "@/components/expenses/ExpenseFormModal";
import { Navbar } from "@/components/layout/Navbar";
import { Toaster } from "@/components/ui/Toaster";

/**
 * The single client boundary for the app. ExpenseProvider raises toasts, so it
 * must sit inside ToastProvider.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ExpenseProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6">
              {children}
            </main>
            <footer className="border-t border-border py-5">
              <p className="mx-auto max-w-6xl px-4 text-[12.5px] text-muted">
                Ledger keeps every expense in this browser&apos;s local storage.
                Nothing is uploaded anywhere.
              </p>
            </footer>
          </div>

          <ExpenseFormModal />
          <Toaster />
        </ExpenseProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
