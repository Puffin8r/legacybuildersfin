// Lightweight integration settings persisted in localStorage.
// Webhook fan-out: events are POSTed to the user-configured n8n URL so they can
// route to Google Calendar, Go High Level, Gmail, etc.

const KEY = "cashflow-integrations-v1";

export type EventType =
  | "transaction.added"
  | "overdraft.warning"
  | "leak.detected"
  | "monthly.reset"
  | "blueprint.completed"
  | "appointment.requested"
  | "lead.captured";

export interface IntegrationSettings {
  bankMode: "manual" | "csv" | "demo";
  n8nWebhookUrl: string;
  enabledEvents: Record<EventType, boolean>;
  ghlEnabled: boolean;
  calendarEnabled: boolean;
  notificationEmail: string;
}

export const ALL_EVENTS: { id: EventType; label: string }[] = [
  { id: "transaction.added",     label: "New transaction added" },
  { id: "overdraft.warning",     label: "Overdraft warning triggered" },
  { id: "leak.detected",         label: "Money leak detected" },
  { id: "monthly.reset",         label: "Monthly reset completed" },
  { id: "blueprint.completed",   label: "Future Blueprint completed" },
  { id: "appointment.requested", label: "Appointment requested" },
  { id: "lead.captured",         label: "GHL lead captured" },
];

const DEFAULTS: IntegrationSettings = {
  bankMode: "manual",
  n8nWebhookUrl: "",
  enabledEvents: ALL_EVENTS.reduce((acc, e) => ({ ...acc, [e.id]: true }), {} as Record<EventType, boolean>),
  ghlEnabled: false,
  calendarEnabled: false,
  notificationEmail: "",
};

export function loadSettings(): IntegrationSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return DEFAULTS; }
}

export function saveSettings(s: IntegrationSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export interface WebhookEvent<T = unknown> {
  event: EventType;
  source: "cashflow-blueprint";
  timestamp: string;
  payload: T;
}

export async function fireEvent<T>(event: EventType, payload: T): Promise<{ ok: boolean; reason?: string }> {
  const s = loadSettings();
  if (!s.n8nWebhookUrl) return { ok: false, reason: "No webhook URL configured" };
  if (!s.enabledEvents[event]) return { ok: false, reason: "Event disabled" };

  const body: WebhookEvent<T> = {
    event,
    source: "cashflow-blueprint",
    timestamp: new Date().toISOString(),
    payload,
  };

  try {
    await fetch(s.n8nWebhookUrl, {
      method: "POST",
      mode: "no-cors", // webhook endpoints often lack CORS — fire-and-forget
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { ok: true };
  } catch (e) {
    console.warn("Webhook send failed", e);
    return { ok: false, reason: e instanceof Error ? e.message : "Unknown" };
  }
}
