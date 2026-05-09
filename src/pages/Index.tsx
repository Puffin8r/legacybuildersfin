import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, PieChart, Sparkles, TrendingUp, Settings as SettingsIcon, MessageCircle, SlidersHorizontal, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useCashFlow } from "@/hooks/useCashFlow";
import TodaysMoney from "@/components/cashflow/TodaysMoney";
import WhereItWent from "@/components/cashflow/WhereItWent";
import FixMyMoney from "@/components/cashflow/FixMyMoney";
import FutureBlueprint from "@/components/FutureBlueprint";
import MoneyCoachChat, { type CoachTab, SUGGESTED } from "@/components/ai/MoneyCoachChat";
import OnboardingDialog, { shouldShowOnboarding } from "@/components/onboarding/OnboardingDialog";
import ManageDataSheet from "@/components/cashflow/ManageDataSheet";
import BookReviewDialog from "@/components/BookReviewDialog";
import RescheduleBanner from "@/components/RescheduleBanner";
import { cn } from "@/lib/utils";

type Tab = CoachTab;

const TABS: { id: Tab; label: string; icon: typeof Wallet }[] = [
  { id: "today",  label: "Today",    icon: Wallet },
  { id: "where",  label: "Spending", icon: PieChart },
  { id: "fix",    label: "Fix",      icon: Sparkles },
  { id: "future", label: "Future",   icon: TrendingUp },
];

const TITLES: Record<Tab, { title: string; subtitle: string }> = {
  today:  { title: "Today's Money",  subtitle: "Money in. Money out. Right now." },
  where:  { title: "Where it went",  subtitle: "See where your money disappeared." },
  fix:    { title: "Fix my money",   subtitle: "Simple steps to avoid danger days." },
  future: { title: "Future plan",    subtitle: "Plan long-term wealth & retirement." },
};

export default function Index() {
  const [tab, setTab] = useState<Tab>("today");
  const [coachOpen, setCoachOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [coachPrompt, setCoachPrompt] = useState<string | null>(null);
  const cf = useCashFlow();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const askCoach = (prompt: string, focus?: Tab) => {
    if (focus && focus !== tab) setTab(focus);
    setCoachPrompt(prompt);
    setCoachOpen(true);
  };
  const meta = TITLES[tab];

  useEffect(() => {
    if (shouldShowOnboarding()) setShowOnboarding(true);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 bg-card/90 backdrop-blur border-b">
        <div className="px-4 py-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold">$</div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-bold font-heading leading-tight">LegacyBuilders</h1>
              <p className="text-xs text-muted-foreground truncate">{meta.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setManageOpen(true)}
              aria-label="Manage my money"
              className="p-2 rounded-md hover:bg-accent text-muted-foreground"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>
            <Link to="/settings" aria-label="Settings" className="p-2 rounded-md hover:bg-accent text-muted-foreground">
              <SettingsIcon className="h-5 w-5" />
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              className="p-2 -mr-2 rounded-md hover:bg-accent text-muted-foreground"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-5 max-w-2xl mx-auto">
        <RescheduleBanner />
        <h2 className="section-title mb-4">{meta.title}</h2>
        {tab === "today"  && <TodaysMoney cf={cf} />}
        {tab === "where"  && <WhereItWent cf={cf} />}
        {tab === "fix"    && <FixMyMoney cf={cf} />}
        {tab === "future" && <FutureBlueprint />}

        {/* Book a financial review */}
        {tab === "today" ? (
          <section className="mt-6 rounded-2xl border border-[#caa15a]/30 bg-gradient-to-br from-[#0e1117] to-[#1a1d24] p-4 shadow-[0_10px_40px_-15px_rgba(202,161,90,0.4)]">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#caa15a]/80 mb-1">Founder · Concierge</p>
            <h3 className="text-sm font-semibold mb-1 text-[#f5ecd4]">Want a hand from a real human?</h3>
            <p className="text-xs text-[#caa15a]/70 mb-3">
              Book a free 30-minute financial review with our team.
            </p>
            <BookReviewDialog variant="founder" />
          </section>
        ) : (
          <section className="mt-6 rounded-2xl border bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
            <h3 className="text-sm font-semibold mb-1">Want a hand from a real human?</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Book a free 30-minute financial review with our team.
            </p>
            <BookReviewDialog />
          </section>
        )}

        {/* Cross-tab Coach jump prompts */}
        <section className="mt-6 rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Ask the Coach</h3>
          </div>
          <div className="space-y-3">
            <PromptGroup
              label="Fix my money"
              accent="text-secondary"
              prompts={SUGGESTED.fix.slice(0, 3)}
              onPick={(p) => askCoach(p, "fix")}
            />
            <PromptGroup
              label="Future plan"
              accent="text-primary"
              prompts={SUGGESTED.future.slice(0, 3)}
              onPick={(p) => askCoach(p, "future")}
            />
          </div>
        </section>
      </main>

      <MoneyCoachChat
        cf={cf}
        tab={tab}
        open={coachOpen}
        onOpenChange={(o) => { setCoachOpen(o); if (!o) setCoachPrompt(null); }}
        hideFab
        initialPrompt={coachPrompt}
        onPromptConsumed={() => setCoachPrompt(null)}
      />

      <OnboardingDialog
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onFinish={() => setTab("today")}
        cf={cf}
      />

      <ManageDataSheet
        open={manageOpen}
        onOpenChange={setManageOpen}
        cf={cf}
        onReplay={() => setShowOnboarding(true)}
      />

      {/* Bottom nav (mobile-first) — Today / Spending / Fix / Future / Coach */}
      <nav className="fixed bottom-0 inset-x-0 z-30 border-t bg-card/95 backdrop-blur">
        <div className="max-w-2xl mx-auto grid grid-cols-5">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative flex flex-col items-center justify-center py-2.5 gap-1 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "scale-110")} />
                <span>{t.label}</span>
                {active && <span className="absolute bottom-0 h-0.5 w-10 bg-primary rounded-full" />}
              </button>
            );
          })}
          <button
            onClick={() => setCoachOpen(true)}
            className={cn(
              "relative flex flex-col items-center justify-center py-2.5 gap-1 text-xs font-semibold transition-colors",
              coachOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Open AI Money Coach"
          >
            <span className="h-7 w-7 -mt-0.5 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground flex items-center justify-center shadow">
              <MessageCircle className="h-4 w-4" />
            </span>
            <span>Coach</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function PromptGroup({
  label, accent, prompts, onPick,
}: { label: string; accent: string; prompts: string[]; onPick: (p: string) => void }) {
  return (
    <div>
      <p className={cn("text-[11px] font-semibold uppercase tracking-wide mb-1.5", accent)}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {prompts.map(p => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className="text-xs rounded-full border bg-background hover:bg-accent px-3 py-1.5 text-left transition-colors"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
