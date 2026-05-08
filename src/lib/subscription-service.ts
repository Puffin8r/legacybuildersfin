// Subscription store + Plaid recurring-stream importer.
// Local-first today; same shape works server-side once Plaid is live.
//
// To go live with Plaid recurring transactions:
//   1. Call Plaid `/transactions/recurring/get` on the server with each item's
//      access_token, then POST `{ streams: [...] }` to the
//      `plaid-recurring-sync` edge function.
//   2. The edge function (or a client poll) hands the streams to
//      `upsertFromPlaidRecurring()` below — same matching/diff logic.

import type { ExpenseCategory } from "./cashflow-types";

export type SubscriptionUsage  = "Use Often" | "Sometimes" | "Rarely" | "Never";
export type SubscriptionStatus = "Keep" | "Maybe Cancel" | "Cancel Requested" | "Canceled";
export type SubscriptionFreq   = "monthly" | "yearly" | "weekly";

export interface Subscription {
  id: string;
  merchant: string;
  monthly_amount: number;
  frequency: SubscriptionFreq;
  last_charged: string;
  category: ExpenseCategory;
  usage: SubscriptionUsage;
  status: SubscriptionStatus;
  source: "manual" | "csv" | "detected" | "plaid";
  prev_amount?: number;
  /** Plaid recurring stream id — used for stable upsert. */
  plaid_stream_id?: string;
}

/** Mirrors the subset of Plaid's RecurringTransaction stream we use. */
export interface PlaidRecurringStream {
  stream_id: string;
  merchant_name?: string;
  description?: string;
  category?: string[];
  frequency?: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "SEMI_MONTHLY" | "ANNUALLY" | "UNKNOWN";
  last_amount?: { amount: number; iso_currency_code?: string };
  average_amount?: { amount: number };
  last_date?: string;            // YYYY-MM-DD
  is_active?: boolean;
  status?: "MATURE" | "EARLY_DETECTION" | "TOMBSTONED";
}

const KEY = "cashflow-subscriptions-v1";

export function loadSubscriptions(): Subscription[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}
export function saveSubscriptions(list: Subscription[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function plaidFreqToMonthly(freq?: PlaidRecurringStream["frequency"]): SubscriptionFreq {
  if (freq === "WEEKLY" || freq === "BIWEEKLY") return "weekly";
  if (freq === "ANNUALLY") return "yearly";
  return "monthly";
}

/** Convert a stream's last/average amount to a normalized monthly value. */
function streamMonthlyAmount(s: PlaidRecurringStream): number {
  const raw = Math.abs(s.last_amount?.amount ?? s.average_amount?.amount ?? 0);
  switch (s.frequency) {
    case "WEEKLY":      return +(raw * 4.345).toFixed(2);
    case "BIWEEKLY":    return +(raw * 2.1725).toFixed(2);
    case "SEMI_MONTHLY":return +(raw * 2).toFixed(2);
    case "ANNUALLY":    return +(raw / 12).toFixed(2);
    default:            return +raw.toFixed(2); // MONTHLY / UNKNOWN
  }
}

function categorizeFromPlaid(cats?: string[]): ExpenseCategory {
  if (!cats?.length) return "Subscriptions";
  const path = cats.join(" ").toLowerCase();
  if (path.includes("rent") || path.includes("mortgage") || path.includes("housing")) return "Housing";
  if (path.includes("food") || path.includes("restaurant") || path.includes("grocer")) return "Food";
  if (path.includes("gas") || path.includes("fuel")) return "Gas";
  if (path.includes("transport")) return "Transportation";
  if (path.includes("insurance")) return "Insurance";
  if (path.includes("loan") || path.includes("debt")) return "Debt";
  if (path.includes("entertainment") || path.includes("movie") || path.includes("music") || path.includes("video")) return "Entertainment";
  if (path.includes("shop") || path.includes("merchandise")) return "Shopping";
  if (path.includes("subscription") || path.includes("service")) return "Subscriptions";
  return "Subscriptions";
}

export interface UpsertResult {
  added: Subscription[];
  updated: Subscription[]; // amount changed → prev_amount tracked
  unchanged: number;
  removed: number;         // tombstoned streams marked Canceled
}

/**
 * Merge a batch of Plaid recurring streams into the local subscription list.
 *  - Match priority: plaid_stream_id → merchant name (case-insensitive).
 *  - Tombstoned/inactive streams flip status to "Canceled".
 *  - Amount changes set prev_amount so the UI can flag price hikes.
 *  - User-managed fields (usage, status when not Canceled) are preserved.
 */
export function upsertFromPlaidRecurring(
  current: Subscription[],
  streams: PlaidRecurringStream[],
): { next: Subscription[]; result: UpsertResult } {
  const next = [...current];
  const result: UpsertResult = { added: [], updated: [], unchanged: 0, removed: 0 };

  for (const stream of streams) {
    const monthly = streamMonthlyAmount(stream);
    if (!monthly) continue;

    const merchantRaw = (stream.merchant_name || stream.description || "").trim();
    if (!merchantRaw) continue;

    const idx = next.findIndex(s =>
      (stream.stream_id && s.plaid_stream_id === stream.stream_id) ||
      s.merchant.toLowerCase() === merchantRaw.toLowerCase()
    );

    const tombstoned = stream.status === "TOMBSTONED" || stream.is_active === false;

    if (idx === -1) {
      if (tombstoned) continue; // don't import dead streams
      const fresh: Subscription = {
        id: crypto.randomUUID(),
        merchant: merchantRaw,
        monthly_amount: monthly,
        frequency: plaidFreqToMonthly(stream.frequency),
        last_charged: stream.last_date || new Date().toISOString().slice(0, 10),
        category: categorizeFromPlaid(stream.category),
        usage: "Sometimes",
        status: "Keep",
        source: "plaid",
        plaid_stream_id: stream.stream_id,
      };
      next.push(fresh);
      result.added.push(fresh);
      continue;
    }

    const existing = next[idx];
    if (tombstoned) {
      if (existing.status !== "Canceled") {
        next[idx] = { ...existing, status: "Canceled" };
        result.removed++;
      } else {
        result.unchanged++;
      }
      continue;
    }

    const amountChanged = Math.abs(existing.monthly_amount - monthly) > 0.01;
    if (amountChanged) {
      next[idx] = {
        ...existing,
        prev_amount: existing.monthly_amount,
        monthly_amount: monthly,
        last_charged: stream.last_date || existing.last_charged,
        plaid_stream_id: stream.stream_id || existing.plaid_stream_id,
        source: "plaid",
      };
      result.updated.push(next[idx]);
    } else {
      next[idx] = {
        ...existing,
        last_charged: stream.last_date || existing.last_charged,
        plaid_stream_id: stream.stream_id || existing.plaid_stream_id,
      };
      result.unchanged++;
    }
  }

  return { next, result };
}

/** Demo recurring-stream feed used until Plaid is live. */
export function demoRecurringStreams(): PlaidRecurringStream[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    { stream_id: "demo_netflix",  merchant_name: "Netflix",  frequency: "MONTHLY", last_amount: { amount: 15.99 }, last_date: today, category: ["Service", "Subscription", "Video"], is_active: true, status: "MATURE" },
    { stream_id: "demo_spotify",  merchant_name: "Spotify",  frequency: "MONTHLY", last_amount: { amount: 11.99 }, last_date: today, category: ["Service", "Subscription", "Music"], is_active: true, status: "MATURE" },
    { stream_id: "demo_gym",      merchant_name: "Planet Fitness", frequency: "MONTHLY", last_amount: { amount: 24.99 }, last_date: today, category: ["Service", "Gym"], is_active: true, status: "MATURE" },
    { stream_id: "demo_icloud",   merchant_name: "Apple iCloud",   frequency: "MONTHLY", last_amount: { amount: 2.99 },  last_date: today, category: ["Service", "Cloud Storage"], is_active: true, status: "MATURE" },
    { stream_id: "demo_amazon",   merchant_name: "Amazon Prime",   frequency: "ANNUALLY", last_amount: { amount: 139 },  last_date: today, category: ["Shops", "Subscription"], is_active: true, status: "MATURE" },
  ];
}
