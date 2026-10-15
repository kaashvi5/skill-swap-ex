import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ACCEPT_AFTER_MS = 60_000; // demo users accept after ~1 minute
const POLL_MS = 15_000;

/**
 * Watches for pending swap requests the current user sent to demo members
 * and auto-accepts them once they're about a minute old, so sample
 * conversations come alive without manual steps.
 */
export const useDemoAutoAccept = (userId: string | undefined) => {
  useEffect(() => {
    if (!userId) return;

    const check = async () => {
      const cutoff = new Date(Date.now() - ACCEPT_AFTER_MS).toISOString();
      const { data: pending } = await supabase
        .from("swap_requests")
        .select("id, recipient_id")
        .eq("requester_id", userId)
        .eq("status", "pending")
        .lt("created_at", cutoff);
      if (!pending || pending.length === 0) return;

      const recipientIds = pending.map((p) => p.recipient_id);
      const { data: demos } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", recipientIds)
        .eq("is_demo", true);
      if (!demos || demos.length === 0) return;

      const demoIds = new Set(demos.map((d) => d.user_id));
      for (const swap of pending) {
        if (!demoIds.has(swap.recipient_id)) continue;
        const { error } = await supabase
          .from("swap_requests")
          .update({ status: "accepted" })
          .eq("id", swap.id)
          .eq("status", "pending");
        if (!error) {
          const name = demos.find((d) => d.user_id === swap.recipient_id)?.full_name || "Your partner";
          toast.success(`${name} accepted your swap request! Open Chats to say hi.`);
        }
      }
    };

    const timer = setInterval(check, POLL_MS);
    check();
    return () => clearInterval(timer);
  }, [userId]);
};
