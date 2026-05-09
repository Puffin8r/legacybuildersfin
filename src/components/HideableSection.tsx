import { useRef, type ReactNode } from "react";
import { MoreVertical, EyeOff } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { hideSection, useIsHidden } from "@/lib/hidden-sections";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
  /** Position of the menu trigger. Defaults to top-right inset. */
  triggerClassName?: string;
}

/**
 * Wraps a section so the user can hide it via a 3-dot menu (or long-press).
 * Hidden sections can be restored from Settings → Hidden sections.
 */
export default function HideableSection({ id, label, children, className, triggerClassName }: Props) {
  const hidden = useIsHidden(id);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const longPressTimer = useRef<number | null>(null);

  if (hidden) return null;

  const startPress = () => {
    longPressTimer.current = window.setTimeout(() => {
      triggerRef.current?.click();
    }, 500);
  };
  const cancelPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onHide = () => {
    hideSection(id, label);
    toast.success(`Hidden: ${label}`, {
      description: "Restore from Settings → Hidden sections.",
    });
  };

  return (
    <div
      className={cn("relative group", className)}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onTouchCancel={cancelPress}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            type="button"
            size="icon"
            variant="ghost"
            aria-label={`Options for ${label}`}
            className={cn(
              "absolute top-1 right-1 z-10 h-7 w-7 rounded-full bg-background/70 backdrop-blur opacity-70 hover:opacity-100",
              triggerClassName,
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onHide}>
            <EyeOff className="h-4 w-4 mr-2" /> Hide this section
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {children}
    </div>
  );
}
