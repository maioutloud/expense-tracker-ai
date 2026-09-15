import { CATEGORIES, isCategoryId } from "@/lib/categories";
import { isValidISODate } from "@/lib/date";
import { sumAmounts } from "@/lib/money";
import type { CategoryId, Expense } from "@/lib/types";

/**
 * Share links, for real — no backend involved.
 *
 * The selected expenses are compressed and packed into the URL's **fragment**.
 * A fragment is never transmitted to a server, so the data rides entirely inside
 * the link itself: whoever you send it to can open it, and no host in between
 * (including whoever is serving this app) ever sees the contents. That is what
 * makes a genuine share feature possible with no account, no database, and no
 * upload.
 *
 * The tradeoff is length. Links grow with the data, so callers should check
 * `classifyLength` and share a narrower slice when a link gets unwieldy.
 */

const CODEC_GZIP = "1";
const CODEC_RAW = "0";

/** Keys are single characters because every byte lands in the URL. */
interface PackedExpense {
  d: string;
  c: CategoryId;
  a: number;
  t: string;
}

export interface SharePayload {
  v: 1;
  title: string;
  createdAt: string;
  expenses: PackedExpense[];
}

export interface SharedSnapshot {
  title: string;
  createdAt: string;
  expenses: Expense[];
  total: number;
}

/* ----------------------------- base64url ----------------------------- */

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  // Chunked: spreading a large array into fromCharCode blows the argument limit.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(text: string): Uint8Array {
  const padded = text
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(text.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/* ---------------------------- compression ---------------------------- */

function canCompress(): boolean {
  return typeof CompressionStream !== "undefined";
}

async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(
    new CompressionStream("gzip"),
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(
    new DecompressionStream("gzip"),
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/* ------------------------------ encode ------------------------------- */

export async function encodeShare(
  expenses: Expense[],
  title: string,
): Promise<string> {
  const payload: SharePayload = {
    v: 1,
    title,
    createdAt: new Date().toISOString(),
    expenses: expenses.map((expense) => ({
      d: expense.date,
      c: expense.category,
      a: expense.amount,
      t: expense.description,
    })),
  };

  const raw = new TextEncoder().encode(JSON.stringify(payload));

  if (canCompress()) {
    return `${CODEC_GZIP}${bytesToBase64Url(await gzip(raw))}`;
  }
  return `${CODEC_RAW}${bytesToBase64Url(raw)}`;
}

/* ------------------------------ decode ------------------------------- */

export async function decodeShare(token: string): Promise<SharedSnapshot> {
  if (!token) throw new Error("This link has no data attached.");

  const codec = token[0];
  const body = token.slice(1);

  if (codec !== CODEC_GZIP && codec !== CODEC_RAW) {
    throw new Error("This link is in a format this version doesn't recognize.");
  }

  let bytes: Uint8Array;
  try {
    bytes = base64UrlToBytes(body);
  } catch {
    throw new Error("This link looks damaged — it may have been cut short.");
  }

  if (codec === CODEC_GZIP) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("This browser can't read compressed links.");
    }
    try {
      bytes = await gunzip(bytes);
    } catch {
      throw new Error("This link looks damaged — it may have been cut short.");
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("This link's contents couldn't be read.");
  }

  return validate(parsed);
}

/**
 * Shared links arrive from outside, so nothing in them is trusted: every record
 * is shape-checked and malformed ones are dropped rather than rendered.
 */
function validate(parsed: unknown): SharedSnapshot {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("This link's contents couldn't be read.");
  }
  const payload = parsed as Record<string, unknown>;
  if (payload.v !== 1 || !Array.isArray(payload.expenses)) {
    throw new Error("This link was made by a different version of the app.");
  }

  const expenses: Expense[] = [];
  for (const [index, item] of payload.expenses.entries()) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;

    if (typeof row.d !== "string" || !isValidISODate(row.d)) continue;
    if (!isCategoryId(row.c)) continue;
    if (typeof row.a !== "number" || !Number.isFinite(row.a) || row.a <= 0) continue;
    if (typeof row.t !== "string") continue;

    const stamp = new Date().toISOString();
    expenses.push({
      id: `shared-${index}`,
      date: row.d,
      category: row.c,
      amount: Math.round(row.a * 100) / 100,
      // Cap the length so a hostile link can't blow up the layout.
      description: row.t.slice(0, 200),
      createdAt: stamp,
      updatedAt: stamp,
    });
  }

  const title =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title.slice(0, 80)
      : "Shared expenses";

  return {
    title,
    createdAt:
      typeof payload.createdAt === "string" ? payload.createdAt : new Date().toISOString(),
    expenses,
    total: sumAmounts(expenses.map((expense) => expense.amount)),
  };
}

/* ------------------------------- utils ------------------------------- */

export function buildShareUrl(token: string, origin?: string): string {
  const base =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/shared#${token}`;
}

export type LengthVerdict = "comfortable" | "long" | "too-long";

/**
 * Browsers handle very long URLs, but chat apps, email clients, and QR encoders
 * start truncating well before that. These thresholds are about what survives
 * being pasted somewhere, not what Chrome can hold.
 */
export function classifyLength(url: string): LengthVerdict {
  if (url.length <= 2000) return "comfortable";
  if (url.length <= 8000) return "long";
  return "too-long";
}

export function describeCategories(expenses: Expense[]): string {
  const present = new Set(expenses.map((expense) => expense.category));
  if (present.size === 0) return "No categories";
  return [...present].map((id) => CATEGORIES[id].label).join(", ");
}
