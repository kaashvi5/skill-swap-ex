import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export interface SwapTarget {
  user_id: string;
  full_name: string;
  teach: { skill: string; level?: string }[];
}

interface Props {
  target: SwapTarget | null;
  onClose: () => void;
  currentUserId: string | undefined;
  myTeachSkills: string[];
  defaultRequestSkill?: string;
}

const MAX_PER_DAY = 10;

export const SwapRequestDialog = ({ target, onClose, currentUserId, myTeachSkills, defaultRequestSkill }: Props) => {
  const [offerSkill, setOfferSkill] = useState("");
  const [requestSkill, setRequestSkill] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!target) return;
    setRequestSkill(defaultRequestSkill || target.teach[0]?.skill || "");
    setOfferSkill(myTeachSkills[0] || "");
    setMessage("");
  }, [target, defaultRequestSkill, myTeachSkills]);

  const send = async () => {
    if (!currentUserId || !target) return;
    if (!offerSkill || !requestSkill) { toast.error("Pick what you offer and what you want"); return; }
    setSending(true);

    // Rate limit: max requests per rolling 24h
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await supabase.from("swap_requests")
      .select("id", { count: "exact", head: true })
      .eq("requester_id", currentUserId).gte("created_at", since);
    if ((count || 0) >= MAX_PER_DAY) {
      setSending(false);
      toast.error(`You can send up to ${MAX_PER_DAY} swap requests per day.`);
      return;
    }

    const { data: dupe } = await supabase.from("swap_requests")
      .select("id").eq("requester_id", currentUserId).eq("recipient_id", target.user_id)
      .in("status", ["pending", "accepted"]).maybeSingle();
    if (dupe) {
      setSending(false);
      toast.error("You already have an open swap with this person.");
      return;
    }

    const { error } = await supabase.from("swap_requests").insert({
      requester_id: currentUserId,
      recipient_id: target.user_id,
      offer_skill: offerSkill,
      request_skill: requestSkill,
      message: message.trim() || null,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Swap request sent to ${target.full_name}!`);
    onClose();
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Swap with {target?.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">I want to learn from them</label>
            {target && target.teach.length > 0 ? (
              <Select value={requestSkill} onValueChange={setRequestSkill}>
                <SelectTrigger><SelectValue placeholder="Pick a skill they teach" /></SelectTrigger>
                <SelectContent>
                  {target.teach.map((t, i) => <SelectItem key={i} value={t.skill}>{t.skill}{t.level ? ` (${t.level})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">This person hasn't listed any teaching skills yet.</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">In exchange I'll teach</label>
            {myTeachSkills.length > 0 ? (
              <Select value={offerSkill} onValueChange={setOfferSkill}>
                <SelectTrigger><SelectValue placeholder="Pick one of your skills" /></SelectTrigger>
                <SelectContent>
                  {myTeachSkills.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                Add a skill you can teach on your <Link to="/app/profile" className="text-primary font-semibold hover:underline">profile</Link> first.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Message (optional)</label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} rows={3} placeholder="Hey! I'd love to swap..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={sending || !offerSkill || !requestSkill} className="rounded-full gradient-primary text-primary-foreground border-0">
            {sending ? "Sending..." : "Send request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
