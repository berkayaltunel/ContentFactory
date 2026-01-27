import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  Twitter, 
  Youtube, 
  Instagram, 
  Music2, 
  Linkedin, 
  FileText,
  Sun,
  Moon,
  Settings,
  Layers,
  LogOut,
  User,
  History,
  Heart,
  ChevronDown,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const navItems = [
  { 
    path: "/dashboard/youtube", 
    label: "YouTubeAI", 
    icon: Youtube,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30"
  },
  { 
    path: "/dashboard/instaflow", 
    label: "InstaFlow AI", 
    icon: Instagram,
    color: "text-pink-500",
    bgColor: "bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10",
    borderColor: "border-pink-500/30"
  },
  { 
    path: "/dashboard/x-ai", 
    label: "X AI", 
    icon: Twitter,
    color: "text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/30"
  },
  { 
    path: "/dashboard/tiktrend", 
    label: "TikTrend AI", 
    icon: Music2,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30"
  },
  { 
    path: "/dashboard/linkshare", 
    label: "LinkShareAI", 
    icon: Linkedin,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30"
  },
  { 
    path: "/dashboard/blog", 
    label: "Blog Architect", 
    icon: FileText,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30"
  },
];

export default function DashboardLayout() {
  const { theme, setTheme } = useTheme();
  const { user, signOut, isAuthenticated, getAccessToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [stats, setStats] = useState({ generations: 0, tweets: 0, favorites: 0 });

  // Fetch user stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = getAccessToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(`${API}/user/stats`, { headers });
        if (response.data) {
          setStats(response.data);
        }
      } catch (error) {
        // Stats endpoint may not exist yet, ignore
      }
    };
    
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated, getAccessToken]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Çıkış yapıldı");
      navigate("/");
    } catch (error) {
      toast.error("Çıkış yapılamadı");
    }
  };

  const currentModule = navItems.find(item => location.pathname.includes(item.path.split('/').pop()));

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside 
        className="fixed left-0 top-0 z-40 h-screen w-[260px] border-r border-border bg-card flex flex-col"
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
            <Layers className="h-5 w-5 text-black" />
          </div>
          <span className="font-outfit text-xl font-bold tracking-tight">
            ContentFactory
          </span>
        </div>

        {/* User Stats */}
        {isAuthenticated && (
          <div className="px-4 py-4 border-b border-border">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>{stats.generations} üretim</span>
              </div>
              <span className="text-muted-foreground">·</span>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Heart className="h-4 w-4" />
                <span>{stats.favorites}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto" data-testid="sidebar-nav">
          {navItems.map((item) => {
            const isActive = location.pathname.includes(item.path.split('/').pop());
            const Icon = item.icon;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.path.split('/').pop()}`}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                  "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  isActive && [
                    item.bgColor,
                    item.color,
                    "font-medium",
                    "border",
                    item.borderColor
                  ]
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && item.color)} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          {/* History & Favorites */}
          <div className="pt-4 mt-4 border-t border-border space-y-1">
            <NavLink
              to="/dashboard/history"
              data-testid="nav-history"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                location.pathname.includes('history') && "bg-secondary text-foreground"
              )}
            >
              <History className="h-5 w-5" />
              <span>Geçmiş</span>
            </NavLink>
            <NavLink
              to="/dashboard/favorites"
              data-testid="nav-favorites"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                location.pathname.includes('favorites') && "bg-secondary text-foreground"
              )}
            >
              <Heart className="h-5 w-5" />
              <span>Favoriler</span>
            </NavLink>
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="border-t border-border p-4">
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                  data-testid="user-menu-trigger"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatar_url} alt={user.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                  <User className="h-4 w-4 mr-2" />
                  Profil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Ayarlar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-500">
                  <LogOut className="h-4 w-4 mr-2" />
                  Çıkış Yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">Giriş yapmadınız</p>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/login')}
              >
                Giriş Yap
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-[260px]">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-end gap-3 border-b border-border bg-background/80 backdrop-blur-sm px-8 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            data-testid="settings-btn"
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Ayarlar
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            data-testid="theme-toggle"
            className="h-9 w-9"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </header>

        {/* Page Content */}
        <div className="p-8">
          <Outlet />
        </div>
      </main>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md" data-testid="settings-modal">
          <DialogHeader>
            <DialogTitle className="font-outfit">Ayarlar</DialogTitle>
            <DialogDescription>
              Uygulama ayarlarını yapılandırın
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tema</label>
              <div className="flex gap-2">
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  data-testid="theme-dark-btn"
                >
                  <Moon className="h-4 w-4 mr-2" />
                  Karanlık
                </Button>
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  data-testid="theme-light-btn"
                >
                  <Sun className="h-4 w-4 mr-2" />
                  Aydınlık
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
