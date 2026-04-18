import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Home, Users, MessageCircle, User, LogOut, Award, Sparkles, Repeat, Trophy } from "lucide-react";
import logo from "@/assets/logo.png";

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navItems = [
    { to: "/app", icon: Home, label: "Home" },
    { to: "/app/discover", icon: Users, label: "Discover" },
    { to: "/app/matches", icon: Sparkles, label: "Matches" },
    { to: "/app/exchanges", icon: Repeat, label: "Swaps" },
    { to: "/app/chats", icon: MessageCircle, label: "Chats" },
    { to: "/app/leaderboard", icon: Trophy, label: "Ranks" },
    { to: "/app/certificates", icon: Award, label: "Certs" },
    { to: "/app/profile", icon: User, label: "Profile" },
  ];
  const mobileItems = navItems.filter((n) => ["/app", "/app/matches", "/app/chats", "/app/leaderboard", "/app/profile"].includes(n.to));

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/app" className="flex items-center gap-2">
            <img src={logo} alt="SkillSwap" className="h-9 w-9" />
            <span className="font-display text-xl font-bold tracking-tight">
              Skill<span className="text-gradient">Swap</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/app"}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-full text-sm font-medium transition-smooth ${
                    isActive ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          {user && (
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          )}
        </div>
      </header>

      <main className="container py-8 animate-fade-in">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-xl">
        <div className="grid grid-cols-5">
          {mobileItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-3 text-xs ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
