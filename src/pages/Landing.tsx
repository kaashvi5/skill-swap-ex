import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Globe2, Shield, Coins, Brain, MessagesSquare } from "lucide-react";
import logo from "@/assets/logo.png";
import hero from "@/assets/hero.jpg";
import { useAuth } from "@/hooks/useAuth";

const Landing = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen gradient-soft">
      {/* Nav */}
      <header className="container flex h-20 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="SkillSwap logo" className="h-10 w-10" width={40} height={40} />
          <span className="font-display text-2xl font-bold tracking-tight">
            Skill<span className="text-gradient">Swap</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild className="rounded-full">
              <Link to="/app">Open app <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="rounded-full hidden sm:inline-flex">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild className="rounded-full gradient-primary text-primary-foreground border-0 shadow-soft">
                <Link to="/auth?mode=signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="container grid lg:grid-cols-2 gap-12 items-center pt-8 pb-24">
        <div className="space-y-7 animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-semibold text-muted-foreground shadow-soft">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            A skill economy for the world
          </div>
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight">
            Trade <span className="text-gradient">skills</span>, not money.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
            Teach what you know. Learn what you love. SkillSwap matches you with people across the world for peer-to-peer learning powered by skill credits and trust.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full gradient-primary text-primary-foreground border-0 shadow-glow text-base px-8 h-12">
              <Link to="/auth?mode=signup">Start swapping <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full text-base px-8 h-12">
              <Link to="/auth">I already have an account</Link>
            </Button>
          </div>
          <div className="flex items-center gap-6 pt-2 text-sm text-muted-foreground">
            <div><span className="font-bold text-foreground">3</span> free credits</div>
            <div className="h-4 w-px bg-border" />
            <div><span className="font-bold text-foreground">All</span> countries</div>
            <div className="h-4 w-px bg-border" />
            <div><span className="font-bold text-foreground">Zero</span> cash</div>
          </div>
        </div>
        <div className="relative animate-float">
          <div className="absolute -inset-8 gradient-hero opacity-20 blur-3xl rounded-full" />
          <img src={hero} alt="Two people exchanging skills" className="relative rounded-3xl shadow-card" width={1536} height={1024} />
        </div>
      </section>

      {/* Features */}
      <section className="container py-20 border-t">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Built for the curious.
          </h2>
          <p className="text-muted-foreground text-lg">A learning loop powered by people, not paywalls.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Brain, title: "AI Matching", desc: "Find partners with complementary skills, instantly." },
            { icon: Coins, title: "Skill Credits", desc: "Earn by teaching. Spend to learn. Money never enters." },
            { icon: Shield, title: "Trust Score", desc: "Verified ratings keep the community safe." },
            { icon: MessagesSquare, title: "Realtime Chat", desc: "Plan sessions and share resources in seconds." },
            { icon: Globe2, title: "Worldwide", desc: "Open to every country. Learn from any timezone." },
            { icon: Sparkles, title: "Certificates", desc: "Claim a downloadable certificate for every skill mastered." },
          ].map((f) => (
            <div key={f.title} className="rounded-3xl border bg-card p-7 shadow-soft hover:shadow-card transition-smooth">
              <div className="h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground mb-5">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20">
        <div className="rounded-[2.5rem] gradient-hero p-12 md:p-20 text-center text-primary-foreground shadow-glow relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
          <div className="relative">
            <h2 className="font-display text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">Your next skill is one swap away.</h2>
            <p className="text-lg md:text-xl opacity-90 mb-8 max-w-2xl mx-auto">Join a global community of learners and teachers.</p>
            <Button asChild size="lg" className="rounded-full bg-background text-foreground hover:bg-background/90 h-14 px-10 text-base font-semibold">
              <Link to="/auth?mode=signup">Create your free account <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="container py-12 border-t text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} SkillSwap. Trade skills, grow together.
      </footer>
    </div>
  );
};

export default Landing;
