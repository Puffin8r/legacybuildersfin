import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarCheck, ExternalLink, Phone } from "lucide-react";

const CALENDLY_URL = "https://calendly.com/nimbliqai/30min";
const PHONE_NUMBER = "(951) 421-1177";
const PHONE_HREF = "tel:+19514211177";

interface BookReviewDialogProps {
  variant?: "default" | "founder";
}

export default function BookReviewDialog({ variant = "default" }: BookReviewDialogProps = {}) {
  const [open, setOpen] = useState(false);
  const embedUrl = `${CALENDLY_URL}?embed_domain=${window.location.hostname}&embed_type=Inline&hide_gdpr_banner=1`;

  const isFounder = variant === "founder";

  return (
    <div className="w-full space-y-2">
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className={isFounder ? "w-full border-0 text-[#1a1d24] hover:opacity-95" : "w-full"}
          style={
            isFounder
              ? {
                  background: "linear-gradient(135deg, #caa15a 0%, #f3dca0 50%, #caa15a 100%)",
                  boxShadow: "0 0 24px rgba(202,161,90,0.4)",
                }
              : undefined
          }
        >
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

        {open && (
          <iframe
            src={embedUrl}
            title="Book a Financial Review"
            className="w-full border-0"
            style={{ height: "640px" }}
            allow="camera; microphone; autoplay; encrypted-media; fullscreen; payment"
          />
        )}

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
      <Button
        asChild
        size="lg"
        variant="outline"
        className={isFounder ? "w-full bg-[#0e1117] text-[#f3dca0] border-2 border-[#caa15a]/60 hover:bg-[#1a1d24] hover:text-[#f5ecd4]" : "w-full"}
      >
        <a
          href={PHONE_HREF}
          onClick={(e) => {
            e.preventDefault();
            window.location.href = PHONE_HREF;
          }}
        >
          <Phone className="h-4 w-4 mr-2" />
          Or call today {PHONE_NUMBER}
        </a>
      </Button>
    </div>
  );
}
