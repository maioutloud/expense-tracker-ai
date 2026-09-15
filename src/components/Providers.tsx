"use client";

import type { ReactNode } from "react";

import { CloudExportProvider } from "@/context/CloudExportProvider";
import { ExpenseProvider } from "@/context/ExpenseProvider";
import { ThemeProvider } from "@/context/ThemeProvider";
import { ToastProvider } from "@/context/ToastProvider";
import { ExpenseFormModal } from "@/components/expenses/ExpenseFormModal";
import { Navbar } from "@/components/layout/Navbar";
import { Toaster } from "@/components/ui/Toaster";

/**
 * The single client boundary for the app.
 *
 * Nesting order matters: ExpenseProvider raises toasts, and CloudExportProvider
 * reads expenses and raises toasts, so each sits inside what it depends on.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ExpenseProvider>
          <CloudExportProvider>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main
                id="main"
                className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6"
              >
                {children}
              </main>
              <footer className="border-t border-border py-5">
                <p className="mx-auto max-w-6xl px-4 text-[12.5px] text-muted">
                  Ledger keeps every expense in this browser&apos;s local
                  storage. Nothing is uploaded anywhere.
                </p>
              </footer>
            </div>

            <ExpenseFormModal />
            <Toaster />
          </CloudExportProvider>
        </ExpenseProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
