import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/Providers";
import { THEME_SCRIPT } from "@/context/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Ledger — Expense Tracker",
    template: "%s · Ledger",
  },
  description:
    "A fast, private expense tracker. Log spending, filter it, see where the money goes, and export to CSV.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Stamps the saved theme before first paint to avoid a light flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:text-brand-fg"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
