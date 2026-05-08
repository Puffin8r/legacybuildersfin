import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Glossary of plain-English explanations for app jargon. */
export const TIPS = {
  safeToSpend:
    "Safe to spend = cash on hand minus the bills you still need to pay before your next paycheck. It's what's truly free to use today.",
  overdraft:
    "An overdraft warning means we predict your balance will dip below $0 on a specific day, based on upcoming bills and your next paycheck.",
  snowball:
    "Snowball method: pay your smallest debt first while making minimum payments on the rest. Quick wins keep you motivated.",
  avalanche:
    "Avalanche method: pay the highest-interest debt first. It saves the most money in the long run.",
  ruleOf72:
    "Rule of 72: divide 72 by your expected return % to roughly see how many years it takes for your money to double.",
  fin:
    "FIN (Financial Independence Number) = your annual expenses × 25. Once your investments hit this, you can theoretically live on a 4% withdrawal forever.",
} as const;

export type TipKey = keyof typeof TIPS;

interface Props {
  tip: TipKey | string;
  className?: string;
  label?: string;
}

export function InfoTip({ tip, className, label = "What does this mean?" }: Props) {
  const content = typeof tip === "string" && tip in TIPS ? TIPS[tip as TipKey] : tip;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className={cn(
              "inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors",
              className
            )}
            onClick={(e) => e.preventDefault()}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-xs leading-snug">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
