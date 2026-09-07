import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Award, Repeat, Star, Coins } from "lucide-react";

interface Item {
  kind: string;
  skill: string | null;
  partner_name: string | null;
  happened_at: string;
}

const timeAgo = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d}d ago` : `${Math.round(d / 30)}mo ago`;
};

const line = (i: Item) => {
  if (i.kind === "certificate")
    return { icon: Award, text: `Earned a certificate in ${i.skill}`, sub: i.partner_name ? `taught by ${i.partner_name}` : "" };
  if (i.kind === "rating")
    return { icon: Star, text: `Received a rating from ${i.partner_name || "a partner"}`, sub: "" };
  return { icon: Repeat, text: `Completed a swap${i.skill ? ` — learned ${i.skill}` : ""}`, sub: i.partner_name ? `with ${i.partner_name}` : "" };
};

export const ProfileActivity = ({ userId, title = "Recent activity" }: { userId: string; title?: string }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc("public_activity", { _user_id: userId });
      if (!cancelled) {
        setItems((data as Item[]) || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const credits = items.filter((i) => i.kind === "swap").length;

  return (
    <section className="rounded-3xl border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        {credits > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold rounded-full bg-accent/10 text-accent px-3 py-1">
            <Coins className="h-3.5 w-3.5" />
            {credits} swap{credits > 1 ? "s" : ""} settled
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-4">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4">No activity yet.</div>
      ) : (
        <ul className="space-y-4">
          {items.map((i, idx) => {
            const l = line(i);
            const Icon = l.icon;
            return (
              <li key={idx} className="flex items-start gap-3 text-sm">
                <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{l.text}</div>
                  {l.sub && <div className="text-xs text-muted-foreground">{l.sub}</div>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{timeAgo(i.happened_at)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default ProfileActivity;
