import { useEffect, useMemo, useState, useCallback } from "react";
import type { CashFlow } from "@/hooks/useCashFlow";

const KEY = "fb-game-stats-v1";

export interface GameStats {
  xp: number;                  // lifetime XP earned
  streakDays: number;          // current daily check-in streak
  bestStreak: number;
  lastCheckIn: string | null;  // ISO date "YYYY-MM-DD"
  paidBillIds: string[];       // bills already credited
  achievements: string[];      // unlocked achievement ids
}

const DEFAULT: GameStats = {
  xp: 0,
  streakDays: 0,
  bestStreak: 0,
  lastCheckIn: null,
  paidBillIds: [],
  achievements: [],
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) =>
  Math.round((+new Date(b) - +new Date(a)) / 86400000);

// Tiered status — Editorial luxury (Bronze → Obsidian)
export const TIERS = [
  { id: "founder",  label: "Founder",   minLevel: 1,  color: "#8a6a3b", glow: "#c8a26b" },
  { id: "silver",   label: "Sterling",  minLevel: 5,  color: "#9aa3ad", glow: "#d8dde3" },
  { id: "gold",     label: "Gold",      minLevel: 10, color: "#caa15a", glow: "#f1d699" },
  { id: "platinum", label: "Platinum",  minLevel: 18, color: "#b9c2cc", glow: "#eef2f7" },
  { id: "obsidian", label: "Obsidian",  minLevel: 28, color: "#1a1d24", glow: "#caa15a" },
] as const;

export type Tier = typeof TIERS[number];

// XP curve: level n requires n*150 XP cumulative; gentle slope.
const xpForLevel = (level: number) => (level * (level + 1) / 2) * 150;
export function levelFromXp(xp: number): { level: number; into: number; need: number; pct: number } {
  let lvl = 1;
  while (xpForLevel(lvl + 1) <= xp) lvl++;
  const base = xpForLevel(lvl);
  const next = xpForLevel(lvl + 1);
  const into = xp - base;
  const need = next - base;
  return { level: lvl, into, need, pct: Math.max(0, Math.min(1, into / need)) };
}

export function tierFromLevel(level: number): Tier {
  let result: Tier = TIERS[0];
  for (const t of TIERS) if (level >= t.minLevel) result = t;
  return result;
}

const ACHIEVEMENTS = [
  { id: "first-step",     label: "First Step",       desc: "Open the app",                     test: (s: GameStats) => s.xp > 0 },
  { id: "streak-3",       label: "On a Roll",        desc: "3-day streak",                     test: (s: GameStats) => s.bestStreak >= 3 },
  { id: "streak-7",       label: "Iron Will",        desc: "7-day streak",                     test: (s: GameStats) => s.bestStreak >= 7 },
  { id: "streak-30",      label: "Untouchable",      desc: "30-day streak",                    test: (s: GameStats) => s.bestStreak >= 30 },
  { id: "level-5",        label: "Sterling",         desc: "Reach level 5",                    test: (s: GameStats) => levelFromXp(s.xp).level >= 5 },
  { id: "level-10",       label: "Gold Member",      desc: "Reach level 10",                   test: (s: GameStats) => levelFromXp(s.xp).level >= 10 },
] as const;

export function useGameStats(cf: CashFlow) {
  const [stats, setStats] = useState<GameStats>(() => {
    if (typeof window === "undefined") return DEFAULT;
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
    } catch { return DEFAULT; }
  });

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(stats)); } catch { /* noop */ }
  }, [stats]);

  // Daily check-in: opening the app credits +20 XP and advances streak.
  useEffect(() => {
    const t = todayIso();
    setStats(prev => {
      if (prev.lastCheckIn === t) return prev;
      const gap = prev.lastCheckIn ? daysBetween(prev.lastCheckIn, t) : 1;
      const nextStreak = gap === 1 ? prev.streakDays + 1 : 1;
      const xpGain = 20 + Math.min(nextStreak, 14) * 2; // bonus up to 28 extra
      return {
        ...prev,
        xp: prev.xp + xpGain,
        streakDays: nextStreak,
        bestStreak: Math.max(prev.bestStreak, nextStreak),
        lastCheckIn: t,
      };
    });
  }, []);

  // Award XP when bills get marked paid (one-time per bill id)
  useEffect(() => {
    const newlyPaid = cf.bills.filter(b => b.paid && !stats.paidBillIds.includes(b.id));
    if (!newlyPaid.length) return;
    setStats(prev => ({
      ...prev,
      xp: prev.xp + newlyPaid.length * 50,
      paidBillIds: [...prev.paidBillIds, ...newlyPaid.map(b => b.id)],
    }));
  }, [cf.bills, stats.paidBillIds]);

  const derived = useMemo(() => {
    const lv = levelFromXp(stats.xp);
    const tier = tierFromLevel(lv.level);
    const unlocked = ACHIEVEMENTS.filter(a => a.test(stats));
    return { ...lv, tier, achievements: unlocked, allAchievements: ACHIEVEMENTS };
  }, [stats]);

  const grant = useCallback((xp: number) => setStats(s => ({ ...s, xp: s.xp + xp })), []);
  const reset = useCallback(() => setStats(DEFAULT), []);

  return { ...stats, ...derived, grant, reset };
}

export type GameStatsValue = ReturnType<typeof useGameStats>;
