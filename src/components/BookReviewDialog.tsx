import { useState } from "react";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  date: z.string().min(1, "Pick a date")
    .refine(d => new Date(d) >= new Date(new Date().toDateString()), { message: "Pick today or later" }),
  time: z.string().min(1, "Pick a time"),
});

type FormState = z.infer<typeof schema>;

const STORAGE_KEY = "financial-review-bookings";

export default function BookReviewDialog() {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState<FormState | null>(null);
  const [values, setValues] = useState<FormState>({ name: "", email: "", date: "", time: "10:00" });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setConfirmed(null);
    setValues({ name: "", email: "", date: "", time: "10:00" });
    setErrors({});
  };

  const submit = () => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const errs: Partial<Record<keyof FormState, string>> = {};
      parsed.error.issues.forEach(i => { errs[i.path[0] as keyof FormState] = i.message; });
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      existing.push({ ...parsed.data, created_at: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch { /* ignore */ }
    setConfirmed(parsed.data);
    setSubmitting(false);
    toast.success("Booking received!");
  };

  const set = <K extends keyof FormState>(k: K, v: string) => {
    setValues(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: undefined }));
  };

  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setTimeout(reset, 200); }}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full">Book a Financial Review</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {confirmed ? (
          <div className="space-y-3 text-center py-2">
            <div className="h-14 w-14 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8"/>
            </div>
            <DialogHeader>
              <DialogTitle className="text-center">You're booked!</DialogTitle>
              <DialogDescription className="text-center">
                Thanks {confirmed.name.split(" ")[0]} — we'll email <span className="font-medium text-foreground">{confirmed.email}</span> to confirm your{" "}
                <span className="font-medium text-foreground">
                  {new Date(`${confirmed.date}T${confirmed.time}`).toLocaleString("en", {
                    weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
                  })}
                </span>{" "}
                review.
              </DialogDescription>
            </DialogHeader>
            <Button className="w-full" onClick={() => setOpen(false)}>Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-primary"/>Book a Financial Review</DialogTitle>
              <DialogDescription>30 minutes, free. We'll reach out to confirm.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div>
                <Label htmlFor="name" className="text-xs">Full name</Label>
                <Input id="name" value={values.name} onChange={e => set("name", e.target.value)} maxLength={100} placeholder="Jane Doe"/>
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>
              <div>
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input id="email" type="email" value={values.email} onChange={e => set("email", e.target.value)} maxLength={255} placeholder="you@example.com"/>
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="date" className="text-xs">Preferred date</Label>
                  <Input id="date" type="date" min={minDate} value={values.date} onChange={e => set("date", e.target.value)}/>
                  {errors.date && <p className="text-xs text-destructive mt-1">{errors.date}</p>}
                </div>
                <div>
                  <Label htmlFor="time" className="text-xs">Preferred time</Label>
                  <Input id="time" type="time" value={values.time} onChange={e => set("time", e.target.value)}/>
                  {errors.time && <p className="text-xs text-destructive mt-1">{errors.time}</p>}
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={submit} disabled={submitting} className="flex-1">
                {submitting ? "Booking..." : "Confirm booking"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
