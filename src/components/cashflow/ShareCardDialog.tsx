import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { formatMoney } from "@/lib/cashflow-types";
import type { GameStatsValue } from "@/hooks/useGameStats";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  totalCash: number;
  game: GameStatsValue;
}

export default function ShareCardDialog({ open, onOpenChange, totalCash, game }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawCard(canvas, { totalCash, game });
    setDataUrl(canvas.toDataURL("image/png"));
  }, [open, totalCash, game]);

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `legacy-${game.tier.label.toLowerCase()}-lvl${game.level}.png`;
    a.click();
  };

  const share = async () => {
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "legacy.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Legacy", text: `${game.tier.label} · Level ${game.level}` });
        return;
      }
    } catch { /* fall through */ }
    download();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share your status</DialogTitle>
        </DialogHeader>
        <div className="rounded-xl overflow-hidden bg-[#0b0d12] aspect-square">
          <canvas
            ref={canvasRef}
            width={1080}
            height={1080}
            className="w-full h-full block"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={download}>
            <Download className="h-4 w-4 mr-2" /> Download
          </Button>
          <Button onClick={share} className="gold-fill text-[#1a1d24] hover:opacity-90">
            <Share2 className="h-4 w-4 mr-2" /> Share
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center">1080×1080 · perfect for stories & feeds</p>
      </DialogContent>
    </Dialog>
  );
}

function drawCard(canvas: HTMLCanvasElement, { totalCash, game }: { totalCash: number; game: GameStatsValue }) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = 1080, H = 1080;

  // Background — deep obsidian with gold radial bloom
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0e1117");
  bg.addColorStop(0.5, "#161a23");
  bg.addColorStop(1, "#070809");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const radial = ctx.createRadialGradient(120, 160, 50, 120, 160, 700);
  radial.addColorStop(0, "rgba(202, 161, 90, 0.35)");
  radial.addColorStop(1, "rgba(202, 161, 90, 0)");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, W, H);

  // Subtle grain
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5);
  }

  // Gold border
  ctx.strokeStyle = "#caa15a";
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.strokeStyle = "rgba(202,161,90,0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(60, 60, W - 120, H - 120);

  // Header: brand mark
  ctx.fillStyle = "#caa15a";
  ctx.font = "600 22px 'Space Grotesk', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("LEGACY  ·  M E M B E R", 100, 130);

  ctx.textAlign = "right";
  ctx.fillStyle = "#caa15a";
  ctx.font = "600 18px 'Space Grotesk', sans-serif";
  ctx.fillText(new Date().getFullYear().toString(), W - 100, 130);

  // Tier ring
  ctx.beginPath();
  ctx.arc(W / 2, 320, 90, 0, Math.PI * 2);
  const tierGrad = ctx.createLinearGradient(W / 2 - 90, 230, W / 2 + 90, 410);
  tierGrad.addColorStop(0, "#f3dca0");
  tierGrad.addColorStop(0.6, "#c89b50");
  tierGrad.addColorStop(1, "#8a6a3b");
  ctx.fillStyle = tierGrad;
  ctx.fill();
  ctx.fillStyle = "#0e1117";
  ctx.font = "700 36px 'Space Grotesk', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(game.tier.label.slice(0, 2).toUpperCase(), W / 2, 320);
  ctx.textBaseline = "alphabetic";

  // Tier label
  ctx.fillStyle = "#caa15a";
  ctx.font = "500 16px 'Space Grotesk', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`TIER  ·  ${game.tier.label.toUpperCase()}`, W / 2, 460);

  // Big amount
  ctx.fillStyle = "#f5ecd4";
  ctx.font = "600 124px 'Space Grotesk', sans-serif";
  const amount = formatMoney(totalCash);
  ctx.fillText(amount, W / 2, 600);

  ctx.fillStyle = "rgba(202,161,90,0.7)";
  ctx.font = "400 18px 'DM Sans', sans-serif";
  ctx.fillText("LIQUID  CAPITAL", W / 2, 640);

  // Stats row
  const statsY = 800;
  drawStat(ctx, W * 0.22, statsY, "LEVEL", String(game.level));
  drawStat(ctx, W * 0.5,  statsY, "STREAK", `${game.streakDays}d`);
  drawStat(ctx, W * 0.78, statsY, "AWARDS", `${game.achievements.length}`);

  // Footer
  ctx.fillStyle = "rgba(202,161,90,0.5)";
  ctx.font = "400 14px 'DM Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Built with LegacyBuilders  ·  legacybuildersfin.lovable.app", W / 2, H - 100);
}

function drawStat(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, value: string) {
  ctx.textAlign = "center";
  ctx.fillStyle = "#f5ecd4";
  ctx.font = "600 56px 'Space Grotesk', sans-serif";
  ctx.fillText(value, x, y);
  ctx.fillStyle = "rgba(202,161,90,0.7)";
  ctx.font = "500 14px 'Space Grotesk', sans-serif";
  ctx.fillText(label, x, y + 30);
}
