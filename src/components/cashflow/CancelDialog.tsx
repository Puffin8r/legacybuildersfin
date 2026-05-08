import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ExternalLink, FileText, Mail, Zap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  type Subscription, type CancellationProgress, type CancellationMethod,
  findProvider, addCancellationRequest,
} from "@/lib/subscription-service";
import { formatMoney } from "@/lib/cashflow-types";
import { fireEvent, loadSettings, saveSettings } from "@/lib/integrations";

interface Props {
  sub: Subscription;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdate: (patch: Partial<Subscription>) => void;
}

export default function CancelDialog({ sub, open, onOpenChange, onUpdate }: Props) {
  const provider = findProvider(sub.merchant);
  const apiAvailable = !!provider?.api_supported; // currently always false — by design
  const [tab, setTab] = useState<CancellationMethod>("manual");
  const [confirm, setConfirm] = useState(false);
  const [authorize, setAuthorize] = useState(false);
  const [notes, setNotes] = useState("");

  // Contact info for cancellation_help_requested payload (persisted to settings)
  const settings = loadSettings();
  const [name, setName]   = useState(settings.userName ?? "");
  const [email, setEmail] = useState(settings.notificationEmail ?? "");
  const [phone, setPhone] = useState(settings.userPhone ?? "");
  const [pref, setPref]   = useState<"email" | "phone" | "sms">(settings.preferredContact ?? "email");

  useEffect(() => {
    if (!open) return;
    const s = loadSettings();
    setName(s.userName ?? "");
    setEmail(s.notificationEmail ?? "");
    setPhone(s.userPhone ?? "");
    setPref(s.preferredContact ?? "email");
  }, [open]);

  function reset() {
    setConfirm(false); setAuthorize(false); setNotes(""); setTab("manual");
  }
  function close() { reset(); onOpenChange(false); }

  function setProgress(p: CancellationProgress, method: CancellationMethod, status?: Subscription["status"]) {
    onUpdate({
      cancellation_progress: p,
      cancellation_method: method,
      cancellation_updated_at: new Date().toISOString(),
      ...(status ? { status } : {}),
    });
  }

  function viewedInstructions() {
    if (sub.cancellation_progress === "Canceled") return;
    setProgress("Instructions Viewed", "manual");
  }

  function submitManual() {
    if (!confirm) { toast.error("Please confirm before continuing."); return; }
    setProgress("Canceled", "manual", "Canceled");
    fireEvent("subscription_canceled", {
      id: sub.id, merchant: sub.merchant, monthly_amount: sub.monthly_amount,
      method: "manual", canceled_at: new Date().toISOString(),
    });
    toast.success(`${sub.merchant} marked as canceled.`);
    close();
  }

  function submitCouldNot() {
    setProgress("Could Not Cancel", "manual");
    toast.info("Marked as 'could not cancel' — we'll keep it on your list.");
    close();
  }

  function submitRequest() {
    if (!confirm)   { toast.error("Please confirm cancellation."); return; }
    if (!authorize) { toast.error("Please authorize CashFlow Blueprint to help."); return; }
    if (!name.trim() || (pref === "email" && !email.trim()) || (pref !== "email" && !phone.trim())) {
      toast.error("Please fill in your name and preferred contact info.");
      return;
    }
    // Persist contact info for next time
    saveSettings({ ...loadSettings(), userName: name, notificationEmail: email, userPhone: phone, preferredContact: pref });

    const req = addCancellationRequest({
      subscription_id: sub.id,
      merchant: sub.merchant,
      monthly_amount: sub.monthly_amount,
      notes: notes.slice(0, 500),
      authorized: true,
    });
    setProgress("Help Requested", "request", "Cancel Requested");

    fireEvent("cancellation_help_requested", {
      request_id: req.id,
      user: { name, email, phone, preferred_contact: pref },
      subscription: {
        id: sub.id, merchant: sub.merchant,
        monthly_amount: sub.monthly_amount,
        last_charged: sub.last_charged, category: sub.category,
      },
      notes: notes.slice(0, 500),
      requested_at: req.created_at,
    });

    toast.success("Cancellation help requested. Our team will follow up.");
    close();
  }

  function submitApi() {
    if (!apiAvailable) return;
    if (!confirm || !authorize) { toast.error("Please confirm and authorize."); return; }
    setProgress("In Progress", "api", "Cancel Requested");
    fireEvent("subscription_canceled", {
      id: sub.id, merchant: sub.merchant, monthly_amount: sub.monthly_amount,
      method: "api", initiated_at: new Date().toISOString(),
    });
    toast.success("Cancellation initiated via provider API.");
    close();
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">Cancel {sub.merchant}</DialogTitle>
          <DialogDescription>
            {formatMoney(sub.monthly_amount)}/mo · {formatMoney(sub.monthly_amount * 12)}/yr
          </DialogDescription>
        </DialogHeader>

        {sub.cancellation_progress && sub.cancellation_progress !== "Not Started" && (
          <div className="rounded-md border bg-muted/40 p-2 text-xs flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">{sub.cancellation_progress}</Badge>
            {sub.cancellation_method && <span className="text-muted-foreground">via {sub.cancellation_method}</span>}
          </div>
        )}

        <Tabs value={tab} onValueChange={v => setTab(v as CancellationMethod)}>
          <TabsList className="grid grid-cols-3 w-full h-auto">
            <TabsTrigger value="manual"  className="text-xs px-1 py-1.5"><FileText className="h-3 w-3 mr-1"/>Manual</TabsTrigger>
            <TabsTrigger value="request" className="text-xs px-1 py-1.5"><Mail className="h-3 w-3 mr-1"/>Get Help</TabsTrigger>
            <TabsTrigger value="api"     className="text-xs px-1 py-1.5"><Zap className="h-3 w-3 mr-1"/>Auto</TabsTrigger>
          </TabsList>

          {/* MANUAL */}
          <TabsContent value="manual" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">
              Step-by-step instructions to cancel yourself. We'll mark this canceled when you confirm.
            </p>
            {provider ? (
              <ol className="space-y-1.5 text-sm list-decimal list-inside">
                {provider.instructions.map((step, i) => <li key={i}>{step}</li>)}
              </ol>
            ) : (
              <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
                We don't have specific instructions for <strong>{sub.merchant}</strong> yet.
                Sign in to the provider's website, open billing or subscription settings,
                and look for "Cancel" or "End Subscription".
              </div>
            )}
            {provider?.url && (
              <Button variant="outline" size="sm" className="w-full" asChild onClick={viewedInstructions}>
                <a href={provider.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1"/>Open {provider.display}
                </a>
              </Button>
            )}
            <ConfirmRow checked={confirm} onChange={setConfirm} label={`Are you sure you want to cancel ${sub.merchant}?`}/>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={submitCouldNot}>Could not cancel</Button>
              <Button onClick={submitManual} disabled={!confirm}>
                <CheckCircle2 className="h-4 w-4 mr-1"/>I've canceled
              </Button>
            </div>
          </TabsContent>

          {/* REQUEST */}
          <TabsContent value="request" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">
              We'll create a cancellation task for our support team. They will reach out with next steps.
              No payment details are shared.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Your name</Label>
                <Input value={name} onChange={e => setName(e.target.value.slice(0, 80))} maxLength={80} className="h-8"/>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Preferred contact</Label>
                <select
                  value={pref}
                  onChange={e => setPref(e.target.value as "email" | "phone" | "sms")}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone call</option>
                  <option value="sms">Text (SMS)</option>
                </select>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value.slice(0, 120))} maxLength={120} className="h-8"/>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Phone</Label>
                <Input type="tel" value={phone} onChange={e => setPhone(e.target.value.slice(0, 30))} maxLength={30} className="h-8"/>
              </div>
            </div>
            <Textarea
              placeholder="Optional notes (account email, last-4 of card, anything that helps us cancel)."
              value={notes}
              onChange={e => setNotes(e.target.value.slice(0, 500))}
              maxLength={500}
              rows={3}
            />
            <ConfirmRow checked={confirm} onChange={setConfirm} label={`Are you sure you want to cancel ${sub.merchant}?`}/>
            <ConfirmRow
              checked={authorize}
              onChange={setAuthorize}
              label="I authorize CashFlow Blueprint to help process this cancellation request."
            />
            <Button className="w-full" onClick={submitRequest} disabled={!confirm || !authorize}>
              <Mail className="h-4 w-4 mr-1"/>Request cancellation help
            </Button>
          </TabsContent>

          {/* API */}
          <TabsContent value="api" className="space-y-3 mt-3">
            {apiAvailable ? (
              <>
                <div className="rounded-md border border-success/40 bg-success/10 p-3 text-xs flex gap-2">
                  <Zap className="h-4 w-4 text-success shrink-0"/>
                  <span><strong>{provider?.display}</strong> supports direct cancellation. We'll cancel it for you immediately.</span>
                </div>
                <ConfirmRow checked={confirm} onChange={setConfirm} label={`Are you sure you want to cancel ${sub.merchant}?`}/>
                <ConfirmRow
                  checked={authorize}
                  onChange={setAuthorize}
                  label="I authorize CashFlow Blueprint to cancel this subscription on my behalf."
                />
                <Button className="w-full" onClick={submitApi} disabled={!confirm || !authorize}>
                  <Zap className="h-4 w-4 mr-1"/>Cancel now
                </Button>
              </>
            ) : (
              <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs flex gap-2">
                <AlertTriangle className="h-4 w-4 text-warning-foreground shrink-0"/>
                <span>
                  Direct cancellation is not available for <strong>{sub.merchant}</strong> yet.
                  We can give you instructions or create a cancellation request.
                </span>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={close}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-start gap-2 text-xs cursor-pointer rounded-md border p-2">
      <Checkbox checked={checked} onCheckedChange={v => onChange(!!v)} className="mt-0.5"/>
      <span>{label}</span>
    </label>
  );
}
