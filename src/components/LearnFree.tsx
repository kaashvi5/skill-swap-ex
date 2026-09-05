import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { GraduationCap, Play, Plus, Check } from "lucide-react";

interface FreeSkill {
  skill: string;
  emoji: string;
  blurb: string;
  channel: string;
  url: string;
}

const FREE_SKILLS: FreeSkill[] = [
  {
    skill: "Python Programming",
    emoji: "🐍",
    blurb: "The most beginner-friendly coding language — start from zero.",
    channel: "CodeWithHarry",
    url: "https://www.youtube.com/results?search_query=python+for+beginners+hindi+code+with+harry",
  },
  {
    skill: "Guitar",
    emoji: "🎸",
    blurb: "Learn your first chords and songs, no prior music needed.",
    channel: "Indian guitar lessons (Hindi)",
    url: "https://www.youtube.com/results?search_query=guitar+lessons+for+absolute+beginners+hindi",
  },
  {
    skill: "Public Speaking",
    emoji: "🎤",
    blurb: "Build confidence and speak clearly in front of anyone.",
    channel: "Sandeep Maheshwari style (Hindi)",
    url: "https://www.youtube.com/results?search_query=public+speaking+for+beginners+hindi",
  },
  {
    skill: "Digital Marketing",
    emoji: "📈",
    blurb: "Learn social media, ads and SEO from scratch.",
    channel: "WsCube Tech (Hindi)",
    url: "https://www.youtube.com/results?search_query=digital+marketing+course+for+beginners+hindi+wscube+tech",
  },
  {
    skill: "Photography",
    emoji: "📷",
    blurb: "Shoot great photos with just your phone.",
    channel: "Indian photography tutorials (Hindi)",
    url: "https://www.youtube.com/results?search_query=mobile+photography+basics+hindi+beginners",
  },
];

const LearnFree = ({ onAdded }: { onAdded?: () => void }) => {
  const { user } = useAuth();
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const addGoal = async (skill: string) => {
    if (!user) return;
    setBusy(skill);
    const { error } = await supabase
      .from("skills_learn")
      .insert({ user_id: user.id, skill, level: "beginner" });
    setBusy(null);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Already in your goals" : "Couldn't add — try again");
      if (error.message.includes("duplicate")) setAdded((s) => new Set(s).add(skill));
      return;
    }
    setAdded((s) => new Set(s).add(skill));
    toast.success(`"${skill}" added to your learning goals 🎯`);
    onAdded?.();
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        <GraduationCap className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold">No skills yet? Start free</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        These 5 skills are free to learn from scratch — follow an Indian YouTube course, then come back and swap what you learned.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FREE_SKILLS.map((s) => (
          <div key={s.skill} className="rounded-3xl border bg-card p-5 shadow-soft hover:shadow-card transition-smooth flex flex-col">
            <div className="text-3xl mb-2">{s.emoji}</div>
            <div className="font-display font-bold">{s.skill}</div>
            <div className="text-sm text-muted-foreground mb-3">{s.blurb}</div>
            <div className="flex gap-2 mt-auto">
              <Button asChild variant="outline" size="sm" className="rounded-full flex-1">
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  <Play className="h-3.5 w-3.5 mr-1" />Learn free
                </a>
              </Button>
              <Button
                size="sm"
                className="rounded-full flex-1 gradient-primary text-primary-foreground border-0"
                disabled={busy === s.skill || added.has(s.skill)}
                onClick={() => addGoal(s.skill)}
              >
                {added.has(s.skill) ? (
                  <><Check className="h-3.5 w-3.5 mr-1" />Added</>
                ) : (
                  <><Plus className="h-3.5 w-3.5 mr-1" />My goal</>
                )}
              </Button>
            </div>
            <div className="text-[11px] text-muted-foreground mt-2">▶ {s.channel}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default LearnFree;
