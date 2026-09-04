import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Award, CalendarCheck, CalendarClock, CalendarX, Check, Coins, FileText, History, X,
} from "lucide-react";
import { formatInZone, localTimezone } from "@/lib/timezone";

interface SwapEvent {
  id: string;
  event_type: string;
  actor_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

const describe = (e: SwapEvent) => {
  const d = (e.detail || {}) as Record<string, any>;
  switch (e.event_type) {
    case "request_created":
      return { icon: FileText, tone: "text-primary", text: `Swap request created — ${d.offer_skill} ↔ ${d.request_skill}` };
    case "status_accepted":
      return { icon: Check, tone: "text-success", text: "Request accepted" };
    case "status_rejected":
      return { icon: X, tone: "text-muted-foreground", text: "Request declined" };
    case "status_cancelled":
      return { icon: X, tone: "text-muted-foreground", text: "Swap cancelled" };
    case "status_completed":
      return { icon: Check, tone: "text-success", text: "Swap completed by both people" };
    case "completion_confirmed":
      return { icon: Check, tone: "text-success", text: "One side confirmed completion" };
    case "credits_transferred":
      return { icon: Coins, tone: "text-accent", text: `${d.amount ?? 1} credit moved from the learner to the teacher` };
    case "certificate_issued":
      return { icon: Award, tone: "text-accent", text: `Certificate issued for ${d.skill ?? "the skill"}` };
    case "session_proposed":
      return {
        icon: CalendarClock, tone: "text-primary",
        text: `Session proposed for ${d.starts_at ? formatInZone(d.starts_at, localTimezone()) : "a time"}`,
      };
    case "session_confirmed":
      return {
        icon: CalendarCheck, tone: "text-success",
        text: `Session confirmed for ${d.starts_at ? formatInZone(d.starts_at, localTimezone()) : "a time"}`,
      };
    case "session_declined":
      return { icon: CalendarX, tone: "text-muted-foreground", text: "Proposed time declined" };
    case "session_cancelled":
      return { icon: CalendarX, tone: "text-muted-foreground", text: "Session cancelled" };
    default:
      return { icon: History, tone: "text-muted-foreground", text: e.event_type.replace(/_/g, " ") };
  }
};

export const SwapTimeline = ({ swapId }: { swapId: string }) => {
  const [events, setEvents] = useState<SwapEvent[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("swap_events").select("*").eq("swap_id", swapId).order("created_at");
    setEvents((data as unknown as SwapEvent[]) || []);
  }, [swapId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel(`events-${swapId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "swap_events", filter: `swap_id=eq.${swapId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [swapId, load]);

  if (events.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-secondary/30 p-4">
      <div className="flex items-center gap-2 font-display font-bold text-sm mb-3">
        <History className="h-4 w-4 text-primary" />Swap activity log
      </div>
      <ol className="space-y-3">
        {events.map((e) => {
          const { icon: Icon, tone, text } = describe(e);
          return (
            <li key={e.id} className="flex gap-3">
              <div className="mt-0.5"><Icon className={`h-4 w-4 ${tone}`} /></div>
              <div className="min-w-0">
                <div className="text-sm">{text}</div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(e.created_at).toLocaleString()}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
