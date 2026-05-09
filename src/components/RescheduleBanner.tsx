import { useEffect, useState } from "react";
import { CalendarX, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface NoShowEvent {
  id: string;
  scheduled_start: string;
  reschedule_url: string | null;
}

const CALENDLY_URL = "https://calendly.com/nimbliqai/30min";

/**
 * Shows a banner for any Calendly appointments the host marked as a no-show.
 * The user can dismiss it (saved to the row) or click reschedule which opens
 * Calendly's invitee-specific reschedule link when available.
 */
export default function RescheduleBanner() {
  const { user } = useAuth();
  const [events, setEvents] = useState<NoShowEvent[]>([]);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from("calendly_events")
        .select("id, scheduled_start, reschedule_url")
        .eq("user_id", user.id)
        .eq("status", "no_show")
        .is("dismissed_at", null)
        .order("scheduled_start", { ascending: false });
      if (active) setEvents((data as NoShowEvent[]) ?? []);
    };

    load();

    const channel = supabase
      .channel("calendly-events-banner")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendly_events", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const dismiss = async (id: string) => {
    setEvents((cur) => cur.filter((e) => e.id !== id));
    await supabase
      .from("calendly_events")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", id);
  };

  if (!events.length) return null;

  return (
    <div className="space-y-2">
      {events.map((ev) => {
        const when = new Date(ev.scheduled_start).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        });
        const href = ev.reschedule_url || CALENDLY_URL;
        return (
          <div
            key={ev.id}
            className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4"
          >
            <CalendarX className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">
                You missed your financial review on {when}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Let's get you rebooked — pick a new time that works.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    Reschedule <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </a>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => dismiss(ev.id)}>
                  Dismiss
                </Button>
              </div>
            </div>
            <button
              aria-label="Dismiss"
              onClick={() => dismiss(ev.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
