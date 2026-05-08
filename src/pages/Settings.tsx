import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Building2, Webhook, Calendar, Users, Github, Upload, Sparkles, CheckCircle2, Send, PlayCircle } from "lucide-react";
import IntroVideoDialog from "@/components/IntroVideoDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ALL_EVENTS, fireEvent, loadSettings, saveSettings,
  type IntegrationSettings,
} from "@/lib/integrations";
import { useCashFlow } from "@/hooks/useCashFlow";
import type { Expense, ExpenseCategory } from "@/lib/cashflow-types";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function Settings() {
  const [s, setS] = useState<IntegrationSettings>(() => loadSettings());
  useEffect(() => { saveSettings(s); }, [s]);

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-20 bg-card/90 backdrop-blur border-b">
        <div className="px-4 py-3 max-w-2xl mx-auto space-y-2">
          <Breadcrumbs items={[{ label: "Settings" }]} />
          <div className="flex items-center gap-3">
            <Link to="/" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 -ml-2 rounded-md hover:bg-accent text-sm font-medium">
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
            <div className="min-w-0">
              <h1 className="text-base font-bold font-heading leading-tight">Settings & Integrations</h1>
              <p className="text-xs text-muted-foreground">Connect your money to the tools you use.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-5 max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><PlayCircle className="h-4 w-4" /> Intro video</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">Re-watch the quick walkthrough of how LegacyBuilders works.</p>
            <IntroVideoDialog />
          </CardContent>
        </Card>
        <BankCard s={s} setS={setS} />
        <N8nCard s={s} setS={setS} />
        <CalendarCard s={s} setS={setS} />
        <GhlCard s={s} setS={setS} />
        <GithubCard />
      </main>
    </div>
  );
}

/* ---------------- Bank ---------------- */
function BankCard({ s, setS }: { s: IntegrationSettings; setS: (x: IntegrationSettings) => void }) {
  const cf = useCashFlow();
  const [importing, setImporting] = useState(false);

  const onCsv = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      let added = 0;
      rows.forEach(r => {
        const amount = Math.abs(parseFloat(r.amount || "0"));
        if (!amount || !r.date) return;
        cf.addExpense({
          date: normalizeDate(r.date),
          amount,
          description: r.description || r.merchant || "Imported",
          merchant: r.merchant,
          category: (r.category as ExpenseCategory) || "Other",
        });
        added++;
      });
      toast.success(`Imported ${added} transactions`);
    } catch (e) {
      toast.error("Could not read CSV. Use columns: date, amount, description, category");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Bank Connection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <ModeBtn active={s.bankMode === "manual"} onClick={() => setS({ ...s, bankMode: "manual" })} label="Manual" />
          <ModeBtn active={s.bankMode === "csv"}    onClick={() => setS({ ...s, bankMode: "csv" })}    label="CSV upload" />
          <ModeBtn active={s.bankMode === "demo"}   onClick={() => setS({ ...s, bankMode: "demo" })}   label="Demo data" />
        </div>

        {s.bankMode === "manual" && (
          <p className="text-xs text-muted-foreground">Add transactions on the <Link to="/" className="underline">Where It Went</Link> tab.</p>
        )}

        {s.bankMode === "csv" && (
          <div className="space-y-2">
            <Label className="text-xs">Upload a CSV with columns: date, amount, description, category</Label>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-md py-6 cursor-pointer hover:bg-accent/40">
              <Upload className="h-4 w-4" />
              <span className="text-sm">{importing ? "Importing…" : "Choose CSV file"}</span>
              <input type="file" accept=".csv,text/csv" hidden
                onChange={e => e.target.files?.[0] && onCsv(e.target.files[0])} />
            </label>
          </div>
        )}

        {s.bankMode === "demo" && (
          <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
            <p className="font-medium">Demo bank data is loaded.</p>
            <p className="text-muted-foreground">Sample paychecks, bills, and transactions let you explore every feature.</p>
          </div>
        )}

        <div className="border-t pt-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-[10px]">Plaid-ready</Badge>
            <Link to="/bank-accounts" className="text-xs font-semibold text-primary underline">Manage bank accounts →</Link>
          </div>
          <p className="text-xs text-muted-foreground">
            Connect checking, savings, and credit cards. Synced transactions auto-categorize, update safe-to-spend, and refresh the 30-day cash flow.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ModeBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className={`rounded-md border p-2 text-xs font-medium transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}>
      {label}
    </button>
  );
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const cells = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = cells[i] ?? ""; });
    return obj;
  });
}

function normalizeDate(d: string): string {
  const dt = new Date(d);
  if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

/* ---------------- n8n ---------------- */
function N8nCard({ s, setS }: { s: IntegrationSettings; setS: (x: IntegrationSettings) => void }) {
  const [testing, setTesting] = useState(false);

  const test = async () => {
    if (!s.n8nWebhookUrl) { toast.error("Paste a webhook URL first"); return; }
    setTesting(true);
    const r = await fireEvent("transaction.added", { test: true, message: "Hello from LegacyBuilders" });
    setTesting(false);
    if (r.ok) toast.success("Test event sent. Check your n8n workflow.");
    else toast.error(r.reason || "Failed to send");
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Webhook className="h-4 w-4" /> n8n Webhook</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Webhook URL</Label>
          <Input
            value={s.n8nWebhookUrl}
            onChange={e => setS({ ...s, n8nWebhookUrl: e.target.value })}
            placeholder="https://your.n8n.cloud/webhook/abc-123"
          />
          <p className="text-[11px] text-muted-foreground mt-1">All events below will POST as JSON to this URL.</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Send these events</p>
          {ALL_EVENTS.map(ev => (
            <div key={ev.id} className="flex items-center justify-between rounded-md border p-2.5">
              <div>
                <p className="text-sm">{ev.label}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{ev.id}</p>
              </div>
              <Switch
                checked={s.enabledEvents[ev.id]}
                onCheckedChange={v => setS({ ...s, enabledEvents: { ...s.enabledEvents, [ev.id]: v } })}
              />
            </div>
          ))}
        </div>

        <Button variant="outline" className="w-full" onClick={test} disabled={testing}>
          <Send className="h-4 w-4 mr-1" /> {testing ? "Sending…" : "Send test event"}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ---------------- Calendar booking ---------------- */
function CalendarCard({ s, setS }: { s: IntegrationSettings; setS: (x: IntegrationSettings) => void }) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    date: new Date().toISOString().slice(0, 10),
    time: "10:00",
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (!form.name || !form.email) { toast.error("Name and email required"); return; }
    const payload = { ...form, calendar: "google" };
    const r = await fireEvent("appointment.requested", payload);
    setSubmitted(true);
    if (r.ok) toast.success("Appointment request sent to n8n → Google Calendar");
    else toast.success("Saved locally. Add an n8n webhook to sync to Google Calendar.");
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Google Calendar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Enable booking flow</Label>
          <Switch checked={s.calendarEnabled} onCheckedChange={v => setS({ ...s, calendarEnabled: v })} />
        </div>

        {s.calendarEnabled && !submitted && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">"Book a Financial Review" collects this and POSTs to n8n, which creates a Google Calendar event.</p>
            <Input placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              <Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
            </div>
            <Textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <Button className="w-full" onClick={submit}><Sparkles className="h-4 w-4 mr-1" />Book Financial Review</Button>
          </div>
        )}

        {submitted && (
          <div className="rounded-md bg-success/10 border border-success/30 p-3 text-sm flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
            <div>
              <p className="font-semibold">Request sent</p>
              <p className="text-xs text-muted-foreground">We'll confirm your appointment shortly.</p>
              <Button variant="link" size="sm" className="px-0 h-auto" onClick={() => setSubmitted(false)}>Book another</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Go High Level ---------------- */
function GhlCard({ s, setS }: { s: IntegrationSettings; setS: (x: IntegrationSettings) => void }) {
  const [lead, setLead] = useState({
    name: "", email: "", phone: "",
    concern: "", fin: "", overdraftRisk: "", appointment: "",
  });

  const send = async () => {
    if (!lead.name || !lead.email) { toast.error("Name and email required"); return; }
    const r = await fireEvent("lead.captured", { ...lead, destination: "gohighlevel" });
    if (r.ok) toast.success("Lead sent to n8n → Go High Level");
    else toast.success("Saved locally. Add an n8n webhook to push to GHL.");
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Go High Level</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Push leads to GHL via n8n</Label>
          <Switch checked={s.ghlEnabled} onCheckedChange={v => setS({ ...s, ghlEnabled: v })} />
        </div>
        {s.ghlEnabled && (
          <div className="space-y-2">
            <Input placeholder="Name" value={lead.name} onChange={e => setLead({ ...lead, name: e.target.value })} />
            <Input placeholder="Email" type="email" value={lead.email} onChange={e => setLead({ ...lead, email: e.target.value })} />
            <Input placeholder="Phone" value={lead.phone} onChange={e => setLead({ ...lead, phone: e.target.value })} />
            <Textarea placeholder="Financial concern" value={lead.concern} onChange={e => setLead({ ...lead, concern: e.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="FIN result" value={lead.fin} onChange={e => setLead({ ...lead, fin: e.target.value })} />
              <Input placeholder="Overdraft risk" value={lead.overdraftRisk} onChange={e => setLead({ ...lead, overdraftRisk: e.target.value })} />
              <Input placeholder="Appointment" value={lead.appointment} onChange={e => setLead({ ...lead, appointment: e.target.value })} />
            </div>
            <Button className="w-full" onClick={send}><Send className="h-4 w-4 mr-1" />Send lead</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- GitHub developer notes ---------------- */
function GithubCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Github className="h-4 w-4" /> GitHub (developer notes)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>This project is GitHub-ready. Connect via the Lovable editor → GitHub → Connect project.</p>

        <Section title="React components">
          <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-5">
            <li><code>src/components/cashflow/*</code> — Today's Money, Where It Went, Fix My Money</li>
            <li><code>src/components/FutureBlueprint.tsx</code> — Long-term planner</li>
            <li><code>src/components/ai/*</code> — Money Coach insight cards & chat</li>
          </ul>
        </Section>

        <Section title="Backend / Supabase">
          <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-5">
            <li>Edge function: <code>supabase/functions/money-coach-chat</code></li>
            <li>Schema mirrors interfaces in <code>src/lib/cashflow-types.ts</code> (accounts, income, bills, expenses, debts, goals)</li>
            <li>Currently persisted to <code>localStorage</code>; swap with Supabase tables when authentication is enabled.</li>
          </ul>
        </Section>

        <Section title="Environment variables">
          <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-5">
            <li><code>VITE_SUPABASE_URL</code></li>
            <li><code>VITE_SUPABASE_PUBLISHABLE_KEY</code></li>
            <li><code>VITE_SUPABASE_PROJECT_ID</code></li>
            <li><code>LOVABLE_API_KEY</code> (server-side, used by AI Money Coach)</li>
          </ul>
        </Section>

        <Section title="Webhook URLs (set above)">
          <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-5">
            <li><strong>n8n:</strong> single inbound URL fans out to Google Calendar, GHL, Gmail, etc.</li>
            <li>Event names: <code>transaction.added</code>, <code>overdraft.warning</code>, <code>leak.detected</code>, <code>monthly.reset</code>, <code>blueprint.completed</code>, <code>appointment.requested</code>, <code>lead.captured</code></li>
          </ul>
        </Section>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{title}</p>
      {children}
    </div>
  );
}
