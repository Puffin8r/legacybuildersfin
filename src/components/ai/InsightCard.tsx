import { Sparkles, AlertTriangle, ShieldAlert, CheckCircle2, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MoneyInsight } from "@/lib/ai-insights";

const TONE = {
  positive: { ring: "border-success/40 bg-white text-slate-900", icon: CheckCircle2, color: "text-success" },
  warning:  { ring: "border-warning/40 bg-white text-slate-900", icon: AlertTriangle, color: "text-warning" },
  danger:   { ring: "border-destructive/40 bg-white text-slate-900", icon: ShieldAlert, color: "text-destructive" },
  neutral:  { ring: "border-primary/30 bg-white text-slate-900", icon: Info, color: "text-primary" },
};

export default function InsightCard({ insight }: { insight: MoneyInsight }) {
  const t = TONE[insight.tone];
  const Icon = t.icon;
  return (
    <Card className={cn("border-2", t.ring)}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start gap-2">
          <div className={cn("h-8 w-8 rounded-lg bg-background/70 flex items-center justify-center shrink-0", t.color)}>
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">AI Money Coach</p>
            <p className="font-semibold leading-snug">{insight.title}</p>
          </div>
        </div>
        <div className="grid gap-1.5 text-sm pl-10">
          <Row label="Why" value={insight.why} />
          <Row label="Next" value={insight.action} />
          <Row label="Impact" value={insight.impact} icon={<Icon className={cn("h-3.5 w-3.5", t.color)} />} />
        </div>
      </CardContent>
    </Card>
  );
}

export function InsightList({ insights }: { insights: MoneyInsight[] }) {
  if (!insights.length) return null;
  return (
    <div className="space-y-2">
      {insights.map(i => <InsightCard key={i.id} insight={i} />)}
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="font-semibold text-muted-foreground w-12 shrink-0">{label}</span>
      <span className="flex items-center gap-1">{icon}{value}</span>
    </div>
  );
}
