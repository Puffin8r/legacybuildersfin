import { Link } from "react-router-dom";
import {
  Wallet, PieChart, Sparkles, TrendingUp, ArrowRight, ShieldCheck,
  Brain, LineChart, CheckCircle2, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BookReviewDialog from "@/components/BookReviewDialog";

const FEATURES = [
  { icon: Wallet, title: "Today's Money", desc: "See exactly what's safe to spend right now — no spreadsheets required." },
  { icon: PieChart, title: "Where It Went", desc: "Auto-categorized spending so you finally know where your paycheck goes." },
  { icon: Sparkles, title: "Fix My Money", desc: "Cancel hidden subscriptions and invest the savings — automatically." },
  { icon: TrendingUp, title: "Future Plan", desc: "Project your retirement, net worth, and freedom age in seconds." },
  { icon: Brain, title: "AI Money Coach", desc: "Helpful, judgment-free guidance tailored to your real numbers." },
  { icon: ShieldCheck, title: "Bank-grade Security", desc: "Your data is encrypted end-to-end and never sold. Ever." },
];

const STEPS = [
  { n: "01", title: "Connect or import", desc: "Link your bank or paste in your numbers — takes under a minute." },
  { n: "02", title: "See the truth", desc: "Get a clear picture of cash flow, subscriptions, and danger days." },
  { n: "03", title: "Build the future", desc: "Cancel waste, invest the savings, and watch your blueprint grow." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold">$</div>
            <span className="font-heading font-bold text-base">CashFlow Blueprint</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <Button asChild size="sm">
            <Link to="/app">Open app <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Your money, finally clear
          </div>
          <h1 className="font-heading text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
            The simplest way to fix today and build your future.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            CashFlow Blueprint shows you what's safe to spend, where money is leaking,
            and exactly how to turn small wins into long-term wealth.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/app">Get started free <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#features">See features</a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">No credit card. Takes 60 seconds.</p>

          {/* Stat strip */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { v: "$1,200+", l: "Avg yearly savings found" },
              { v: "9%",     l: "Default invest return" },
              { v: "30 yrs", l: "Wealth projections" },
              { v: "60 sec", l: "To your first insight" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl border bg-card p-4">
                <p className="font-heading text-2xl font-bold text-primary">{s.v}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold">Everything you need, nothing you don't</h2>
            <p className="mt-3 text-muted-foreground">Four focused tabs and an AI coach that actually understands your numbers.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="group rounded-2xl border bg-card p-6 hover:shadow-md transition-shadow">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold text-lg">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 md:py-24 bg-muted/30 border-y">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold">How it works</h2>
            <p className="mt-3 text-muted-foreground">Three steps from confused to confident.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border bg-card p-6">
                <p className="font-heading text-sm font-bold text-primary">{s.n}</p>
                <h3 className="mt-2 font-heading font-semibold text-lg">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coach callout */}
      <section className="py-20 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="rounded-3xl bg-gradient-to-br from-primary to-secondary text-primary-foreground p-10 md:p-14 text-center">
            <MessageCircle className="h-10 w-10 mx-auto mb-4 opacity-90" />
            <h2 className="font-heading text-3xl md:text-4xl font-bold">Meet your AI Money Coach</h2>
            <p className="mt-4 max-w-xl mx-auto opacity-90">
              Ask anything — "Can I afford this?", "What should I cancel?", "When can I retire?" —
              and get clear, personal answers grounded in your real cash flow.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-8">
              <Link to="/app">Try it now <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-24 bg-muted/30 border-t">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-10">Frequently asked</h2>
          <div className="space-y-4">
            {[
              { q: "Is my financial data safe?", a: "Yes. Data is encrypted in transit and at rest, and we never sell or share it." },
              { q: "Do I need to connect my bank?", a: "No — you can manually enter or import a CSV. Bank linking is optional and makes things faster." },
              { q: "How are projections calculated?", a: "We use standard formulas like 4% safe withdrawal and 9% average market return. Estimates only — not guaranteed." },
              { q: "Does it work on mobile?", a: "Yes. The app is mobile-first and works great on any device." },
            ].map((f) => (
              <div key={f.q} className="rounded-xl border bg-card p-5">
                <p className="font-semibold flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />{f.q}</p>
                <p className="mt-2 text-sm text-muted-foreground pl-7">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-24">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <LineChart className="h-10 w-10 mx-auto text-primary mb-4" />
          <h2 className="font-heading text-3xl md:text-4xl font-bold">Your blueprint is one click away.</h2>
          <p className="mt-4 text-muted-foreground">Start fixing today and building tomorrow — for free.</p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/app">Open the app <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} CashFlow Blueprint. All rights reserved.</p>
          <p>Investment projections are estimates and not guaranteed.</p>
        </div>
      </footer>
    </div>
  );
}
