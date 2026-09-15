"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useExpenses } from "@/context/ExpenseProvider";
import { useToast } from "@/context/ToastProvider";
import { connectSteps, getDestination } from "@/lib/cloud/destinations";
import {
  buildFilename,
  createJobId,
  deliverDownload,
  stepDuration,
  wait,
} from "@/lib/cloud/jobs";
import {
  appendHistory,
  clearHistory as clearStoredHistory,
  loadConnections,
  loadHistory,
  loadSchedule,
  saveConnections,
  saveSchedule as persistSchedule,
  type ConnectionMap,
} from "@/lib/cloud/storage";
import {
  applyTemplate,
  getTemplate,
  serializeTemplate,
} from "@/lib/cloud/templates";
import type {
  DestinationId,
  ExportJob,
  HistoryEntry,
  ScheduleConfig,
  TemplateId,
} from "@/lib/cloud/types";
import type { CategoryId } from "@/lib/types";

interface RunOptions {
  templateId: TemplateId;
  destinationId: DestinationId;
  categories?: CategoryId[];
}

interface CloudExportContextValue {
  jobs: ExportJob[];
  history: HistoryEntry[];
  connections: ConnectionMap;
  schedule: ScheduleConfig;
  hydrated: boolean;

  runExport: (options: RunOptions) => Promise<void>;
  connect: (id: DestinationId, account?: string) => Promise<void>;
  disconnect: (id: DestinationId) => void;
  updateSchedule: (config: ScheduleConfig) => void;
  clearHistory: () => void;
  dismissJob: (id: string) => void;
}

const CloudExportContext = createContext<CloudExportContextValue | null>(null);

export function CloudExportProvider({ children }: { children: ReactNode }) {
  const { expenses } = useExpenses();
  const { toast } = useToast();

  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [connections, setConnections] = useState<ConnectionMap>({});
  const [schedule, setSchedule] = useState<ScheduleConfig>(loadSchedule());
  const [hydrated, setHydrated] = useState(false);

  // localStorage is only available after mount.
  useEffect(() => {
    setHistory(loadHistory());
    setConnections(loadConnections());
    setSchedule(loadSchedule());
    setHydrated(true);
  }, []);

  const patchJob = useCallback((id: string, patch: Partial<ExportJob>) => {
    setJobs((current) =>
      current.map((job) => (job.id === id ? { ...job, ...patch } : job)),
    );
  }, []);

  const dismissJob = useCallback((id: string) => {
    setJobs((current) => current.filter((job) => job.id !== id));
  }, []);

  const connect = useCallback(
    async (id: DestinationId, account?: string) => {
      const destination = getDestination(id);
      setConnections((current) => {
        const next: ConnectionMap = {
          ...current,
          [id]: { ...current[id], state: "connecting", account },
        };
        return next;
      });

      // A scripted handshake. No network request is made.
      await wait(900);

      setConnections((current) => {
        const next: ConnectionMap = {
          ...current,
          [id]: {
            state: "connected",
            account,
            connectedAt: new Date().toISOString(),
            lastSyncAt: current[id]?.lastSyncAt,
          },
        };
        saveConnections(next);
        return next;
      });

      toast({
        title: `${destination.name} connected`,
        description: "Simulated connection — nothing left your browser.",
        variant: "success",
      });
    },
    [toast],
  );

  const disconnect = useCallback((id: DestinationId) => {
    setConnections((current) => {
      const next = { ...current };
      delete next[id];
      saveConnections(next);
      return next;
    });
  }, []);

  const runExport = useCallback(
    async ({ templateId, destinationId, categories = [] }: RunOptions) => {
      const template = getTemplate(templateId);
      const destination = getDestination(destinationId);
      const now = new Date();

      const result = applyTemplate(expenses, template, categories, now);

      if (result.rows.length === 0) {
        toast({
          title: "Nothing to export",
          description: `${template.name} covers ${result.rangeLabel.toLowerCase()}, and there are no expenses in that window.`,
          variant: "error",
        });
        return;
      }

      const id = createJobId();
      const simulated = !destination.real;

      const job: ExportJob = {
        id,
        templateId,
        destinationId,
        templateName: template.name,
        destinationName: destination.name,
        state: "running",
        progress: 0,
        step: "Preparing",
        rowCount: result.rows.length,
        startedAt: now.toISOString(),
        simulated,
      };
      setJobs((current) => [job, ...current]);

      try {
        // Yield once so the queue paints before serialization takes the thread.
        await wait(0);

        const blob = serializeTemplate(template, result, now);
        const filename = buildFilename(template);

        if (simulated) {
          const steps = connectSteps(destination);
          for (let i = 0; i < steps.length; i += 1) {
            patchJob(id, {
              step: steps[i],
              progress: (i + 1) / steps.length,
            });
            await wait(stepDuration(i, steps.length));
          }
        } else {
          patchJob(id, { step: "Writing file", progress: 0.6 });
          await wait(180);
          deliverDownload(blob, filename);
          patchJob(id, { step: "Saved", progress: 1 });
        }

        patchJob(id, {
          state: "succeeded",
          progress: 1,
          finishedAt: new Date().toISOString(),
          step: simulated ? "Simulated transfer complete" : "Saved to your device",
        });

        const entry: HistoryEntry = {
          id,
          templateId,
          templateName: template.name,
          destinationId,
          destinationName: destination.name,
          filename,
          rowCount: result.rows.length,
          total: result.total,
          byteSize: blob.size,
          exportedAt: new Date().toISOString(),
          simulated,
        };
        setHistory(appendHistory(entry));

        if (simulated) {
          setConnections((current) => {
            if (!current[destinationId]) return current;
            const next: ConnectionMap = {
              ...current,
              [destinationId]: {
                ...current[destinationId]!,
                lastSyncAt: new Date().toISOString(),
              },
            };
            saveConnections(next);
            return next;
          });
        }

        toast({
          title: simulated
            ? `${destination.name}: simulated transfer complete`
            : `${template.name} downloaded`,
          description: simulated
            ? "Demo flow only — no data was sent anywhere."
            : `${filename} · ${result.rows.length} rows`,
          variant: "success",
        });
      } catch (error) {
        patchJob(id, {
          state: "failed",
          finishedAt: new Date().toISOString(),
          step: "Failed",
          error:
            error instanceof Error ? error.message : "The export didn't finish.",
        });
        toast({
          title: "Export failed",
          description:
            error instanceof Error ? error.message : "Something went wrong.",
          variant: "error",
        });
      }
    },
    [expenses, patchJob, toast],
  );

  const updateSchedule = useCallback(
    (config: ScheduleConfig) => {
      setSchedule(config);
      persistSchedule(config);
    },
    [],
  );

  const clearHistory = useCallback(() => {
    clearStoredHistory();
    setHistory([]);
  }, []);

  const value = useMemo(
    () => ({
      jobs,
      history,
      connections,
      schedule,
      hydrated,
      runExport,
      connect,
      disconnect,
      updateSchedule,
      clearHistory,
      dismissJob,
    }),
    [
      jobs,
      history,
      connections,
      schedule,
      hydrated,
      runExport,
      connect,
      disconnect,
      updateSchedule,
      clearHistory,
      dismissJob,
    ],
  );

  return (
    <CloudExportContext.Provider value={value}>
      {children}
    </CloudExportContext.Provider>
  );
}

export function useCloudExport(): CloudExportContextValue {
  const context = useContext(CloudExportContext);
  if (!context) {
    throw new Error("useCloudExport must be used inside <CloudExportProvider>.");
  }
  return context;
}
