"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  CheckCircleIcon,
  CloudIcon,
  MailIcon,
  SheetIcon,
  UnplugIcon,
} from "@/components/ui/Icons";
import { useCloudExport } from "@/context/CloudExportProvider";
import { DESTINATIONS } from "@/lib/cloud/destinations";
import { timeAgo } from "@/lib/cloud/jobs";
import type { Destination, DestinationId } from "@/lib/cloud/types";
import { cn } from "@/lib/cn";

function iconFor(id: DestinationId) {
  if (id === "email") return MailIcon;
  if (id === "google-sheets") return SheetIcon;
  return CloudIcon;
}

export function DestinationsPanel() {
  const { connections, connect, disconnect } = useCloudExport();
  const [pending, setPending] = useState<DestinationId | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<DestinationId, string>>>({});

  const handleConnect = async (destination: Destination) => {
    setPending(destination.id);
    try {
      await connect(destination.id, drafts[destination.id]);
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-3">
      {DESTINATIONS.filter((item) => !item.real).map((destination) => {
        const Icon = iconFor(destination.id);
        const record = connections[destination.id];
        const connected = record?.state === "connected";
        const busy = pending === destination.id;

        return (
          <div
            key={destination.id}
            className="rounded-xl border border-border p-4 transition-colors hover:border-border-strong"
          >
            <div className="flex items-start gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `color-mix(in srgb, ${destination.accent} 14%, transparent)`,
                  color: destination.accent,
                }}
              >
                <Icon width={18} height={18} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[13.5px] font-semibold text-primary">
                    {destination.name}
                  </h3>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
                      connected
                        ? "bg-surface-2 text-good"
                        : "bg-surface-2 text-muted",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        connected ? "bg-good" : "bg-muted",
                        busy && "animate-pulse-soft",
                      )}
                    />
                    {busy ? "Connecting" : connected ? "Connected" : "Not connected"}
                  </span>
                </div>

                <p className="mt-0.5 text-[12.5px] text-secondary">
                  {destination.blurb}
                </p>

                {connected && (
                  <dl className="mt-2 grid gap-x-4 gap-y-0.5 text-[12px] sm:grid-cols-2">
                    {record?.account && (
                      <div className="flex gap-1.5">
                        <dt className="text-muted">Account</dt>
                        <dd className="truncate text-secondary">
                          {record.account}
                        </dd>
                      </div>
                    )}
                    <div className="flex gap-1.5">
                      <dt className="text-muted">Last sync</dt>
                      <dd className="text-secondary">
                        {record?.lastSyncAt
                          ? timeAgo(record.lastSyncAt)
                          : "never"}
                      </dd>
                    </div>
                  </dl>
                )}

                {!connected && destination.requires && (
                  <input
                    type={destination.requires === "email" ? "email" : "text"}
                    value={drafts[destination.id] ?? ""}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [destination.id]: event.target.value,
                      }))
                    }
                    placeholder={
                      destination.requires === "email"
                        ? "you@example.com"
                        : "/Ledger/Exports"
                    }
                    aria-label={
                      destination.requires === "email"
                        ? `Email address for ${destination.name}`
                        : `Folder for ${destination.name}`
                    }
                    className="field mt-2.5"
                  />
                )}

                <div className="mt-3 flex gap-2">
                  {connected ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => disconnect(destination.id)}
                      icon={<UnplugIcon width={15} height={15} />}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={busy}
                      onClick={() => handleConnect(destination)}
                      icon={<CheckCircleIcon width={15} height={15} />}
                    >
                      {busy ? "Connecting" : "Connect"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
