import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const INTRO_VIDEO_SRC = "/intro-video.mp4";

export default function IntroVideoDialog({
  triggerLabel = "Watch intro video",
  variant = "outline",
}: {
  triggerLabel?: string;
  variant?: "default" | "outline" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className="w-full">
          <PlayCircle className="h-4 w-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-4">
        <DialogHeader>
          <DialogTitle>How CashFlow Blueprint works</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg overflow-hidden bg-black">
          {open && (
            <video
              src={INTRO_VIDEO_SRC}
              controls
              autoPlay
              playsInline
              className="w-full h-auto"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
