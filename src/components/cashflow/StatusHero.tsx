import { useState } from "react";
import { Flame, Trophy, Sparkles, Share2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/cashflow-types";
import type { GameStatsValue } from "@/hooks/useGameStats";
import ShareCardDialog from "./ShareCardDialog";

interface Props {
  totalCash: number;
  monthSaved?: number;
  game: GameStatsValue;
}

export default function StatusHero({ totalCash, monthSaved = 0, game }: Props) {
  const [shareOpen, setShareOpen] = useState(false);
  const { tier, level, into, need, pct, streakDays, bestStreak, xp, achievements, allAchievements } = game;

  return (
    <>
      <div className="luxe-card luxe-grain shimmer relative overflow-hidden rounded-2xl p-6 md:p-7">
        {/* TOP ROW: Tier badge + share */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="h-11 w-11 rounded-full grid place-items-center gold-fill text-[10px] font-bold tracking-[0.18em] uppercase text-[#1a1d24]"
              style={{ boxShadow: `0 0 24px ${tier.glow}55` }}
            >
              {tier.label.slice(0, 2)}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#caa15a]/90">Member · Tier</p>
              <p className="font-heading text-lg font-semibold text-[#f4ead2] leading-tight">{tier.label}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#caa15a] hover:text-[#f3dca0] transition-colors px-2.5 py-1.5 rounded-full border border-[#caa15a]/30 hover:border-[#caa15a]/60"
          >
            <Share2 className="h-3 w-3" />
            Share
          </button>
        </div>

        {/* BIG NUMBER */}
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#caa15a]/70 mb-1">Liquid Capital</p>
          <p className="font-heading text-5xl md:text-6xl font-semibold tabular text-[#f5ecd4] leading-none">
            {formatMoney(totalCash)}
          </p>
          {monthSaved !== 0 && (
            <p className="text-xs mt-2 text-[#caa15a]/80 tabular">
              {monthSaved >= 0 ? "+" : "−"}{formatMoney(Math.abs(monthSaved))} this month
            </p>
          )}
        </div>

        {/* LEVEL + XP BAR */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center justify-between text-[11px] tracking-wider uppercase">
            <span className="text-[#caa15a]">Level {level}</span>
            <span className="text-[#caa15a]/70 tabular">{into} / {need} XP</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#2a2e38] overflow-hidden">
            <div
              className="h-full gold-fill rounded-full transition-all duration-700"
              style={{ width: `${Math.max(4, pct * 100)}%`, boxShadow: "0 0 10px rgba(243, 220, 160, 0.4)" }}
            />
          </div>
        </div>

        {/* STAT STRIP */}
        <div className="grid grid-cols-3 gap-3">
          <Stat
            icon={<Flame className="h-3.5 w-3.5 flame text-[#f3a35b]" />}
            label="Streak"
            value={`${streakDays}d`}
            sub={`Best ${bestStreak}d`}
          />
          <Stat
            icon={<Sparkles className="h-3.5 w-3.5 text-[#caa15a]" />}
            label="Lifetime XP"
            value={xp.toLocaleString()}
          />
          <Stat
            icon={<Trophy className="h-3.5 w-3.5 text-[#caa15a]" />}
            label="Awards"
            value={`${achievements.length}/${allAchievements.length}`}
          />
        </div>
      </div>

      {/* ACHIEVEMENT RAIL */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {allAchievements.map(a => {
          const unlocked = achievements.some(x => x.id === a.id);
          return (
            <div
              key={a.id}
              title={`${a.label} — ${a.desc}`}
              className={`shrink-0 flex flex-col items-center gap-1 w-20 p-2 rounded-xl border transition-all ${
                unlocked
                  ? "border-[#caa15a]/50 bg-gradient-to-b from-[#1a1d24] to-[#0e1117] text-[#f3dca0]"
                  : "border-border bg-muted/30 text-muted-foreground"
              }`}
            >
              <div className={`h-8 w-8 rounded-full grid place-items-center ${unlocked ? "gold-fill" : "bg-muted"}`}>
                {unlocked ? <Trophy className="h-4 w-4 text-[#1a1d24]" /> : <Lock className="h-3.5 w-3.5" />}
              </div>
              <span className="text-[9px] uppercase tracking-wider text-center leading-tight">{a.label}</span>
            </div>
          );
        })}
      </div>

      <ShareCardDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        totalCash={totalCash}
        game={game}
      />
    </>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[#caa15a]/15 bg-[#0b0d12]/40 p-3">
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-[#caa15a]/70 mb-1">
        {icon}{label}
      </div>
      <p className="font-heading text-lg font-semibold tabular text-[#f5ecd4] leading-none">{value}</p>
      {sub && <p className="text-[10px] mt-1 text-[#caa15a]/60 tabular">{sub}</p>}
    </div>
  );
}
