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
  Sparkles,
  Dna,
  RefreshCw,
  Palette,
  TrendingUp,
  BarChart3
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
import api, { API } from "@/lib/api";
// ProfileSwitcher removed - style profiles now managed in X AI module


// Style Profile Settings Component
function StyleProfileSettings({ onNavigateToStyleLab }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const response = await api.get(`${API}/styles/list`);
        if (response.data) {
          setProfiles(response.data);
          if (response.data.length > 0) {
            setSelectedProfile(response.data[0].id);
          }
        }
      } catch (error) {
        // Style profiles may not exist yet
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  const handleRefreshStyle = async () => {
    if (!selectedProfile) {
      toast.error("Lütfen bir stil profili seçin");
      return;
    }

    setRefreshing(true);
    try {
      const response = await api.post(
        `${API}/styles/${selectedProfile}/refresh`,
        {}
      );
      
      if (response.data.success) {
        toast.success(`Stil profili güncellendi! ${response.data.tweets_analyzed} tweet analiz edildi.`);
      } else {
        toast.error("Stil profili güncellenemedi");
      }
    } catch (error) {
      console.error('Refresh error:', error);
      toast.error(error.response?.data?.detail || "Stil profili güncellenemedi");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Stil Profili</label>
      
      {loading ? (
        <div className="text-xs text-muted-foreground">Yükleniyor...</div>
      ) : profiles.length === 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Henüz bir stil profili oluşturmadınız. Style Lab'dan yeni bir profil oluşturun.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToStyleLab}
            className="w-full gap-2"
            data-testid="create-style-btn"
          >
            <Palette className="h-4 w-4" />
            Stil Profili Oluştur
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <select
            value={selectedProfile || ''}
            onChange={(e) => setSelectedProfile(e.target.value)}
            className="w-full p-2 text-sm rounded-md border border-border bg-background"
            data-testid="style-profile-select"
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name} ({profile.style_summary?.tweet_count || 0} tweet)
              </option>
            ))}
          </select>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshStyle}
              disabled={refreshing || !selectedProfile}
              className="flex-1 gap-2"
              data-testid="refresh-style-btn"
            >
              {refreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Güncelleniyor...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Yenile
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToStyleLab}
              className="gap-2"
              data-testid="manage-style-btn"
            >
              <Palette className="h-4 w-4" />
              Düzenle
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            "Yenile" ile tweet'ler tekrar çekilir ve stil analizi güncellenir. (Ayda max 3)
          </p>
        </div>
      )}
    </div>
  );
}

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
    label: "LinkedIn AI", 
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
  { 
    path: "/dashboard/trends", 
    label: "🔥 Trendler", 
    icon: TrendingUp,
    color: "text-orange-500",
    bgColor: "bg-gradient-to-r from-orange-500/10 to-red-500/10",
    borderColor: "border-orange-500/30"
  },
  { 
    path: "/dashboard/account-analysis", 
    label: "Hesap Analizi", 
    icon: BarChart3,
    color: "text-blue-400",
    bgColor: "bg-gradient-to-r from-blue-500/10 to-purple-500/10",
    borderColor: "border-blue-500/30"
  },
  { 
    path: "/dashboard/coach", 
    label: "AI Coach", 
    icon: Sparkles,
    color: "text-emerald-400",
    bgColor: "bg-gradient-to-r from-emerald-500/10 to-cyan-500/10",
    borderColor: "border-emerald-500/30"
  },
];

export default function DashboardLayout() {
  const { theme, setTheme } = useTheme();
  const { user, signOut, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [stats, setStats] = useState({ generations: 0, tweets: 0, favorites: 0 });

  // Fetch user stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get(`${API}/user/stats`);
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
  }, [isAuthenticated]);

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
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
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
      <main className="flex-1 ml-[260px] relative">
        {/* Top Right Controls */}
        <div className="absolute top-4 right-8 z-30 flex items-center gap-3">
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
        </div>

        {/* Page Content */}
        <div className="p-8 pt-4">
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

            {/* Style Profile Update */}
            <StyleProfileSettings 
              onNavigateToStyleLab={() => {
                setSettingsOpen(false);
                navigate('/dashboard/style-lab');
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
