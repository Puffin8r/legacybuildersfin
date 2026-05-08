import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, PieChart, Sparkles, TrendingUp, Settings as SettingsIcon, MessageCircle, SlidersHorizontal } from "lucide-react";
import { useCashFlow } from "@/hooks/useCashFlow";
import TodaysMoney from "@/components/cashflow/TodaysMoney";
import WhereItWent from "@/components/cashflow/WhereItWent";
import FixMyMoney from "@/components/cashflow/FixMyMoney";
import FutureBlueprint from "@/components/FutureBlueprint";
import MoneyCoachChat, { type CoachTab } from "@/components/ai/MoneyCoachChat";
import OnboardingDialog, { shouldShowOnboarding } from "@/components/onboarding/OnboardingDialog";
import ManageDataSheet from "@/components/cashflow/ManageDataSheet";
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
  const cf = useCashFlow();
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
              <h1 className="text-base font-bold font-heading leading-tight">CashFlow Blueprint</h1>
              <p className="text-xs text-muted-foreground truncate">{meta.subtitle}</p>
            </div>
            <Link to="/settings" aria-label="Settings" className="p-2 -mr-2 rounded-md hover:bg-accent text-muted-foreground">
              <SettingsIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="px-4 py-5 max-w-2xl mx-auto">
        <h2 className="section-title mb-4">{meta.title}</h2>
        {tab === "today"  && <TodaysMoney cf={cf} />}
        {tab === "where"  && <WhereItWent cf={cf} />}
        {tab === "fix"    && <FixMyMoney cf={cf} />}
        {tab === "future" && <FutureBlueprint />}
      </main>

      <MoneyCoachChat cf={cf} tab={tab} open={coachOpen} onOpenChange={setCoachOpen} hideFab />

      <OnboardingDialog
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onFinish={() => setTab("today")}
        cf={cf}
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
