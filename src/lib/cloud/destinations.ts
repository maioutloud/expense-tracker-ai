import type { Destination, DestinationId } from "./types";

/**
 * Where an export can go.
 *
 * Exactly one of these is real: `download`, which writes a file to disk. Every
 * other tile runs a scripted connect-and-transfer flow with no network access at
 * all — see `simulated: true` and the disclosure the UI renders alongside it.
 * They exist to demonstrate the interaction, not to move data anywhere.
 */
export const DESTINATIONS: Destination[] = [
  {
    id: "download",
    name: "Download",
    blurb: "Save the file straight to this device.",
    accent: "var(--brand)",
    real: true,
  },
  {
    id: "email",
    name: "Email",
    blurb: "Send the report as an attachment.",
    accent: "var(--cat-bills)",
    real: false,
    requires: "email",
  },
  {
    id: "google-sheets",
    name: "Google Sheets",
    blurb: "Open the data as a live spreadsheet.",
    accent: "var(--cat-entertainment)",
    real: false,
  },
  {
    id: "google-drive",
    name: "Google Drive",
    blurb: "File it in a Drive folder.",
    accent: "var(--cat-shopping)",
    real: false,
    requires: "folder",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    blurb: "Sync to your Dropbox account.",
    accent: "var(--cat-food)",
    real: false,
    requires: "folder",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    blurb: "Back up to Microsoft OneDrive.",
    accent: "var(--cat-transportation)",
    real: false,
    requires: "folder",
  },
];

export function getDestination(id: DestinationId): Destination {
  const destination = DESTINATIONS.find((item) => item.id === id);
  if (!destination) throw new Error(`Unknown destination: ${id}`);
  return destination;
}

/** The scripted steps a simulated transfer walks through. */
export function connectSteps(destination: Destination): string[] {
  if (destination.id === "email") {
    return [
      "Rendering the report",
      "Attaching the file",
      "Handing off to the mail service",
      "Delivered",
    ];
  }
  if (destination.id === "google-sheets") {
    return [
      "Authorizing with Google",
      "Creating the spreadsheet",
      "Writing rows",
      "Applying formatting",
      "Sheet ready",
    ];
  }
  return [
    `Authorizing with ${destination.name}`,
    "Preparing the upload",
    "Transferring",
    "Verifying checksum",
    "Synced",
  ];
}
