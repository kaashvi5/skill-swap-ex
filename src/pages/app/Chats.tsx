import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, Send, Star, Award, ArrowLeft, Coins } from "lucide-react";

interface SwapRow {
  id: string;
  requester_id: string;
  recipient_id: string;
  offer_skill: string;
  request_skill: string;
  message: string | null;
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
  other: { user_id: string; full_name: string; avatar_url: string | null };
}

interface Msg { id: string; sender_id: string; body: string; created_at: string; }

const Chats = () => {
  const { user } = useAuth();
  const [swaps, setSwaps] = useState<SwapRow[]>([]);
  const [active, setActive] = useState<SwapRow | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [rateOpen, setRateOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");

  const loadSwaps = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("swap_requests")
      .select("*")
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });
    if (!data) return;
    const otherIds = Array.from(new Set(data.map((s: any) => s.requester_id === user.id ? s.recipient_id : s.requester_id)));
    const { data: profiles } = await supabase.from("profiles").select("user_id,full_name,avatar_url").in("user_id", otherIds);
    const rows: SwapRow[] = data.map((s: any) => {
      const otherId = s.requester_id === user.id ? s.recipient_id : s.requester_id;
      const other = (profiles || []).find((p: any) => p.user_id === otherId) || { user_id: otherId, full_name: "User", avatar_url: null };
      return { ...s, other };
    });
    setSwaps(rows);
    setLoading(false);
  };

  useEffect(() => { loadSwaps(); }, [user]);

  useEffect(() => {
    if (!active) return;
    (async () => {
      const { data } = await supabase.from("messages").select("*").eq("swap_id", active.id).order("created_at");
      setMessages((data as Msg[]) || []);
      setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 50);
    })();
    const ch = supabase
      .channel(`msgs-${active.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `swap_id=eq.${active.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Msg]);
          setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 50);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active]);

  const respond = async (id: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("swap_requests").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "accepted" ? "Swap accepted! Start chatting." : "Request declined");
    loadSwaps();
  };

  const sendMsg = async () => {
    if (!user || !active || !text.trim()) return;
    const body = text.trim();
    setText("");
    const { error } = await supabase.from("messages").insert({ swap_id: active.id, sender_id: user.id, body });
    if (error) toast.error(error.message);
  };

  const completeSwap = async () => {
    if (!user || !active) return;
    const otherId = active.requester_id === user.id ? active.recipient_id : active.requester_id;
    // Mark complete + transfer 1 credit from learner→teacher (we treat requester as learner of request_skill)
    const { error } = await supabase.from("swap_requests").update({ status: "completed" }).eq("id", active.id);
    if (error) { toast.error(error.message); return; }
    // Credits: requester spends 1, recipient earns 1
    await supabase.rpc as any;
    const { data: rp } = await supabase.from("profiles").select("credits").eq("user_id", active.requester_id).maybeSingle();
    const { data: rcp } = await supabase.from("profiles").select("credits").eq("user_id", active.recipient_id).maybeSingle();
    await supabase.from("profiles").update({ credits: Math.max((rp?.credits ?? 0) - 1, 0) }).eq("user_id", active.requester_id);
    await supabase.from("profiles").update({ credits: (rcp?.credits ?? 0) + 1 }).eq("user_id", active.recipient_id);
    // Issue certificate to requester (the learner) for request_skill
    await supabase.from("certificates").insert({
      swap_id: active.id, learner_id: active.requester_id, teacher_id: active.recipient_id, skill: active.request_skill,
    });
    toast.success("Session completed! Credit transferred 🎉");
    setActive({ ...active, status: "completed" });
    loadSwaps();
    setRateOpen(true);
  };

  const submitRating = async () => {
    if (!user || !active) return;
    const otherId = active.requester_id === user.id ? active.recipient_id : active.requester_id;
    const { error } = await supabase.from("ratings").insert({
      swap_id: active.id, rater_id: user.id, ratee_id: otherId, stars, comment: comment.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Thanks for your feedback!");
    setRateOpen(false);
    setComment("");
  };

  if (active) {
    return (
      <div className="max-w-3xl mx-auto h-[calc(100vh-12rem)] flex flex-col rounded-3xl border bg-card shadow-card overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b">
          <Button size="icon" variant="ghost" onClick={() => setActive(null)}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="h-10 w-10 rounded-full overflow-hidden bg-secondary">
            {active.other.avatar_url ? <img src={active.other.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center font-bold">{active.other.full_name[0]}</div>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold truncate">{active.other.full_name}</div>
            <div className="text-xs text-muted-foreground truncate">{active.request_skill} ↔ {active.offer_skill}</div>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-secondary capitalize">{active.status}</span>
        </div>

        {active.status === "pending" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
            <p className="text-muted-foreground max-w-sm">{active.recipient_id === user?.id ? "This person wants to swap with you. Accept to start chatting." : "Waiting for response..."}</p>
            {active.message && <div className="rounded-2xl bg-secondary p-4 max-w-md text-sm">"{active.message}"</div>}
            {active.recipient_id === user?.id && (
              <div className="flex gap-2">
                <Button onClick={() => respond(active.id, "rejected")} variant="outline" className="rounded-full"><X className="h-4 w-4 mr-1" />Decline</Button>
                <Button onClick={() => respond(active.id, "accepted")} className="rounded-full gradient-primary text-primary-foreground border-0"><Check className="h-4 w-4 mr-1" />Accept</Button>
              </div>
            )}
          </div>
        ) : active.status === "rejected" || active.status === "cancelled" ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">Request {active.status}.</div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && <p className="text-center text-muted-foreground text-sm">Say hello 👋</p>}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${m.sender_id === user?.id ? "gradient-primary text-primary-foreground rounded-br-sm" : "bg-secondary rounded-bl-sm"}`}>
                    {m.body}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t p-3 flex flex-col gap-2">
              {active.status === "accepted" && (
                <Button onClick={completeSwap} variant="outline" className="rounded-full text-success border-success/30 hover:bg-success/10">
                  <Award className="h-4 w-4 mr-1" />Mark session complete (transfer credit)
                </Button>
              )}
              {active.status === "completed" && (
                <Button onClick={() => setRateOpen(true)} variant="outline" className="rounded-full">
                  <Star className="h-4 w-4 mr-1" />Leave a rating
                </Button>
              )}
              <div className="flex gap-2">
                <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMsg()} placeholder="Type a message..." disabled={active.status === "completed"} maxLength={500} className="rounded-full" />
                <Button onClick={sendMsg} disabled={!text.trim()} className="rounded-full gradient-primary text-primary-foreground border-0"><Send className="h-4 w-4" /></Button>
              </div>
            </div>
          </>
        )}

        <Dialog open={rateOpen} onOpenChange={setRateOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Rate your session with {active.other.full_name}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-center gap-2">
                {[1,2,3,4,5].map((n) => (
                  <button key={n} onClick={() => setStars(n)} className="transition-smooth hover:scale-110">
                    <Star className={`h-9 w-9 ${n <= stars ? "fill-accent text-accent" : "text-muted"}`} />
                  </button>
                ))}
              </div>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What was great? (optional)" maxLength={300} rows={3} />
            </div>
            <DialogFooter>
              <Button onClick={submitRating} className="rounded-full gradient-primary text-primary-foreground border-0">Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Chats & Swaps</h1>
        <p className="text-muted-foreground">All your skill exchange conversations.</p>
      </div>
      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading...</div>
      ) : swaps.length === 0 ? (
        <div className="text-center py-20 rounded-3xl border bg-card">
          <p className="text-muted-foreground">No swaps yet. Find a match in Discover!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {swaps.map((s) => (
            <button key={s.id} onClick={() => setActive(s)} className="w-full text-left rounded-3xl border bg-card p-5 hover:shadow-card shadow-soft transition-smooth flex items-center gap-4">
              <div className="h-12 w-12 rounded-full overflow-hidden bg-secondary shrink-0">
                {s.other.avatar_url ? <img src={s.other.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center font-bold">{s.other.full_name[0]}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold truncate">{s.other.full_name}</span>
                  {s.status === "pending" && s.recipient_id === user?.id && <span className="text-[10px] px-2 py-0.5 rounded-full gradient-accent text-accent-foreground font-bold">NEW</span>}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {s.requester_id === user?.id ? "You want " : "They want "}<span className="font-semibold text-foreground">{s.requester_id === user?.id ? s.request_skill : s.offer_skill}</span> ↔ <span className="font-semibold text-foreground">{s.requester_id === user?.id ? s.offer_skill : s.request_skill}</span>
                </div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full capitalize shrink-0 ${
                s.status === "accepted" ? "bg-success/10 text-success" :
                s.status === "completed" ? "bg-primary/10 text-primary" :
                s.status === "pending" ? "bg-accent/10 text-accent" :
                "bg-muted text-muted-foreground"
              }`}>{s.status}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Chats;
