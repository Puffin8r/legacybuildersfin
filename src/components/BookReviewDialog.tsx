import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarCheck, ExternalLink } from "lucide-react";

// Replace with your real Calendly event URL when ready.
const CALENDLY_URL = "https://calendly.com/nimbliqai/30min";

export default function BookReviewDialog() {
  const [open, setOpen] = useState(false);

  // Lazy-load Calendly's widget script once when dialog opens.
  useEffect(() => {
    if (!open) return;
    const id = "calendly-widget-script";
    if (document.getElementById(id)) return;
    const s = document.createElement("script");
    s.id = id;
    s.src = "https://assets.calendly.com/assets/external/widget.js";
    s.async = true;
    document.body.appendChild(s);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full">
          <CalendarCheck className="h-4 w-4 mr-2" />
          Book a Financial Review
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            Book a Financial Review
          </DialogTitle>
          <DialogDescription>
            Pick a time that works for you — the invite will land on your calendar.
          </DialogDescription>
        </DialogHeader>

        <div
          className="calendly-inline-widget mt-2"
          data-url={`${CALENDLY_URL}?hide_gdpr_banner=1`}
          style={{ minWidth: "320px", height: "640px" }}
        />

        <div className="px-6 py-3 border-t bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
          <span>Powered by Calendly</span>
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            Open in new tab <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
