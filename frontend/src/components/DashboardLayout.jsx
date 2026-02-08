import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  Twitter, Youtube, Instagram, Music2, Linkedin, FileText,
  Sun, Moon, Settings, Layers, LogOut, User, History, Heart,
  ChevronDown, Sparkles, Dna, TrendingUp, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api, { API } from "@/lib/api";

const moduleItems = [
  { path: "/dashboard/x-ai", label: "X AI", icon: Twitter, color: "text-sky-400" },
  { path: "/dashboard/youtube", label: "YouTube AI", icon: Youtube, color: "text-red-500" },
  { path: "/dashboard/instaflow", label: "InstaFlow AI", icon: Instagram, color: "text-pink-500" },
  { path: "/dashboard/tiktrend", label: "TikTrend AI", icon: Music2, color: "text-cyan-400" },
  { path: "/dashboard/linkshare", label: "LinkedIn AI", icon: Linkedin, color: "text-blue-500" },
  { path: "/dashboard/blog", label: "Blog Architect", icon: FileText, color: "text-orange-500" },
];

const toolItems = [
  { path: "/dashboard/style-lab", label: "Style Lab", icon: Dna, color: "text-purple-400" },
  { path: "/dashboard/trends", label: "Trendler", icon: TrendingUp, color: "text-orange-500" },
  { path: "/dashboard/account-analysis", label: "Hesap Analizi", icon: BarChart3, color: "text-blue-400" },
  { path: "/dashboard/coach", label: "AI Coach", icon: Sparkles, color: "text-emerald-400" },
];

function MiniSparkline() {
  return (
    <svg width="80" height="24" viewBox="0 0 80 24" fill="none" className="text-purple-500">
      <polyline
        points="0,20 10,16 20,18 30,10 40,14 50,6 60,8 70,4 80,2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DashboardLayout() {
  const { theme, setTheme } = useTheme();
  const { user, signOut, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [stats, setStats] = useState({ generations: 0, tweets: 0, favorites: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get(`${API}/user/stats`);
        if (response.data) setStats(response.data);
      } catch (error) { /* ignore */ }
    };
    if (isAuthenticated) fetchStats();
  }, [isAuthenticated, location.pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Çıkış yapıldı");
      navigate("/");
    } catch (error) {
      toast.error("Çıkış yapılamadı");
    }
  };

  const isActive = (path) => {
    if (path === "/dashboard" && location.pathname === "/dashboard") return true;
    if (path !== "/dashboard") return location.pathname.includes(path.split('/').pop());
    return false;
  };

  const NavItem = ({ item, badge }) => {
    const active = isActive(item.path);
    const Icon = item.icon;
    return (
      <NavLink
        to={item.path}
        data-testid={`nav-${item.path.split('/').pop()}`}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
          "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
          active && "bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium border-l-[3px] border-purple-500 ml-0 pl-[9px]"
        )}
      >
        <Icon className={cn("h-[18px] w-[18px]", active ? "text-purple-500" : item.color)} />
        <span className="text-sm flex-1">{item.label}</span>
        {badge !== undefined && badge > 0 && (
          <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-[10px] font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400">
            {badge}
          </Badge>
        )}
      </NavLink>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#F7F7F8] dark:bg-background">
      {/* Floating Sidebar */}
      <aside
        className="fixed left-0 top-0 z-40 h-screen w-[280px] p-3 pr-0"
        data-testid="sidebar"
      >
        <div className="h-full w-full bg-card rounded-3xl shadow-xl border border-border/50 flex flex-col overflow-hidden">
          {/* User Profile */}
          {isAuthenticated && user ? (
            <div className="px-5 pt-5 pb-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-secondary/50 transition-colors" data-testid="user-menu-trigger">
                    <Avatar className="h-11 w-11 ring-2 ring-purple-500/20">
                      <AvatarImage src={user.avatar_url} alt={user.name} />
                      <AvatarFallback className="bg-purple-500 text-white font-semibold">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold truncate">{user.name}</p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-medium border-purple-500/30 text-purple-600 dark:text-purple-400">
                        Free Plan
                      </Badge>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                    <User className="h-4 w-4 mr-2" /> Profil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                    <Settings className="h-4 w-4 mr-2" /> Ayarlar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-500">
                    <LogOut className="h-4 w-4 mr-2" /> Çıkış Yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500">
                  <Layers className="h-5 w-5 text-white" />
                </div>
                <span className="font-outfit text-lg font-bold">Type Hype</span>
              </div>
            </div>
          )}

          {/* Stats Card */}
          {isAuthenticated && (
            <div className="mx-4 mb-3 p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-500/10">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Toplam Üretim</p>
                  <p className="text-3xl font-outfit font-bold tracking-tight">{stats.generations.toLocaleString()}</p>
                </div>
                <MiniSparkline />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Heart className="h-3 w-3" />
                  <span>{stats.favorites} favori</span>
                </div>
              </div>
              <Button
                size="sm"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 text-sm font-medium"
                onClick={() => navigate('/dashboard/x-ai')}
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                Yeni İçerik Üret
              </Button>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 overflow-y-auto space-y-1 pb-2" data-testid="sidebar-nav">
            {/* Modules */}
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 pt-3 pb-1">Modüller</p>
            {moduleItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}

            {/* Tools */}
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 pt-4 pb-1">Araçlar</p>
            {toolItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}

            {/* Profile Section */}
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 pt-4 pb-1">Profilim</p>
            <NavItem
              item={{ path: "/dashboard/history", label: "Geçmiş", icon: History, color: "text-slate-400" }}
              badge={stats.generations}
            />
            <NavItem
              item={{ path: "/dashboard/favorites", label: "Favoriler", icon: Heart, color: "text-rose-400" }}
              badge={stats.favorites}
            />
          </nav>

          {/* Bottom: Theme Toggle + Settings */}
          <div className="p-4 border-t border-border/50 flex items-center justify-between">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              data-testid="theme-toggle"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="text-xs">{theme === "dark" ? "Aydınlık" : "Karanlık"}</span>
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              data-testid="settings-btn"
              className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-[280px]">
        <div className="p-8">
          <Outlet />
        </div>
      </main>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md" data-testid="settings-modal">
          <DialogHeader>
            <DialogTitle className="font-outfit">Ayarlar</DialogTitle>
            <DialogDescription>Uygulama ayarlarını yapılandırın</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tema</label>
              <div className="flex gap-2">
                <Button variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => setTheme("dark")} data-testid="theme-dark-btn">
                  <Moon className="h-4 w-4 mr-2" /> Karanlık
                </Button>
                <Button variant={theme === "light" ? "default" : "outline"} size="sm" onClick={() => setTheme("light")} data-testid="theme-light-btn">
                  <Sun className="h-4 w-4 mr-2" /> Aydınlık
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">API Durumu</label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                OpenAI Bağlı
              </div>
            </div>
            {user && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Hesap</label>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
