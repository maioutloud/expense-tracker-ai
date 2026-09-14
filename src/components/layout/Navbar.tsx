"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useExpenses } from "@/context/ExpenseProvider";
import { useTheme } from "@/context/ThemeProvider";
import { cn } from "@/lib/cn";
import { Button, IconButton } from "@/components/ui/Button";
import {
  DashboardIcon,
  ListIcon,
  MoonIcon,
  PlusIcon,
  SunIcon,
  WalletIcon,
} from "@/components/ui/Icons";

const LINKS = [
  { href: "/", label: "Dashboard", Icon: DashboardIcon },
  { href: "/expenses", label: "Expenses", Icon: ListIcon },
];

export function Navbar() {
  const pathname = usePathname();
  const { openForm } = useExpenses();
  const { resolved, cycleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:gap-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-primary transition-opacity hover:opacity-80"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-fg">
            <WalletIcon width={18} height={18} />
          </span>
          <span className="hidden text-[15px] font-semibold tracking-tight sm:block">
            Ledger
          </span>
        </Link>

        <nav
          aria-label="Main"
          className="flex items-center gap-0.5 rounded-lg bg-surface-2 p-0.5"
        >
          {LINKS.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-[13px] font-medium transition-all sm:px-3",
                  active
                    ? "bg-surface text-primary shadow-card"
                    : "text-secondary hover:text-primary",
                )}
              >
                <Icon width={16} height={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <IconButton
            label={`Switch to ${resolved === "dark" ? "light" : "dark"} theme`}
            variant="ghost"
            size="sm"
            onClick={cycleTheme}
            icon={
              resolved === "dark" ? (
                <SunIcon width={17} height={17} />
              ) : (
                <MoonIcon width={17} height={17} />
              )
            }
          />

          <Button
            variant="primary"
            size="sm"
            onClick={() => openForm()}
            icon={<PlusIcon width={16} height={16} />}
          >
            <span className="hidden sm:inline">Add expense</span>
            <span className="sr-only sm:hidden">Add expense</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
