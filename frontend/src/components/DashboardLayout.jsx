import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sun, Moon, Settings, Layers, LogOut, User, History, Heart,
  ChevronDown, Sparkles, Dna, TrendingUp, BarChart3, FileText,
  Home, MoreHorizontal, Search
} from "lucide-react";
import { FaXTwitter, FaYoutube, FaInstagram, FaTiktok, FaLinkedinIn } from "react-icons/fa6";
import { HiDocumentText } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
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

/* ── Brand Icon Wrappers ─────────────────────────── */

const BI = ({ Icon, className = "" }) => (
  <Icon className={className} style={{ width: "1em", height: "1em" }} />
);

/* ── Navigation Config ───────────────────────────── */

const navItems = [
  { path: "/dashboard", label: "Home", icon: Home, exact: true },
  { path: "/dashboard/x-ai", label: "X", icon: (p) => <BI Icon={FaXTwitter} {...p} /> },
  { path: "/dashboard/youtube", label: "YouTube", icon: (p) => <BI Icon={FaYoutube} {...p} /> },
  { path: "/dashboard/instaflow", label: "Instagram", icon: (p) => <BI Icon={FaInstagram} {...p} /> },
  { path: "/dashboard/tiktrend", label: "TikTok", icon: (p) => <BI Icon={FaTiktok} {...p} /> },
  { path: "/dashboard/linkshare", label: "LinkedIn", icon: (p) => <BI Icon={FaLinkedinIn} {...p} /> },
  { path: "/dashboard/blog", label: "Blog", icon: (p) => <BI Icon={HiDocumentText} {...p} /> },
];

const moreItems = [
  { path: "/dashboard/style-lab", label: "Style Lab", icon: Dna },
  { path: "/dashboard/trends", label: "Trendler", icon: TrendingUp },
  { path: "/dashboard/account-analysis", label: "Hesap Analizi", icon: BarChart3 },
  { path: "/dashboard/coach", label: "AI Coach", icon: Sparkles },
];

const profileMenuItems = [
  { path: "/dashboard/history", label: "Geçmiş", icon: History },
  { path: "/dashboard/favorites", label: "Favoriler", icon: Heart },
];

/* ── Pill Nav Item ───────────────────────────────── */

function PillNavItem({ item, isActive }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end={item.exact}
      className={cn(
        "relative flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 ease-out shrink-0",
        "hover:bg-white/10",
        isActive
          ? "bg-white/15 backdrop-blur-sm"
          : "text-white/60 hover:text-white/90"
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] transition-all duration-300 shrink-0",
          isActive ? "text-white" : "text-white/60"
        )}
      />
      <span
        className={cn(
          "text-sm font-medium whitespace-nowrap transition-all duration-300 overflow-hidden",
          isActive
            ? "max-w-[80px] opacity-100 text-white"
            : "max-w-0 opacity-0"
        )}
      >
        {item.label}
      </span>
    </NavLink>
  );
}

/* ── Main Layout ─────────────────────────────────── */

export default function DashboardLayout() {
  const { theme, setTheme } = useTheme();
  const { user, signOut, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Çıkış yapıldı");
      navigate("/");
    } catch (error) {
      toast.error("Çıkış yapılamadı");
    }
  };

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  // Check if any "more" item is active
  const moreIsActive = moreItems.some((item) => location.pathname.startsWith(item.path));
  const profileIsActive = profileMenuItems.some((item) => location.pathname.startsWith(item.path));

  return (
    <div className="min-h-screen bg-[#F7F7F8] dark:bg-background">
      {/* ── Floating Top Nav Bar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4 pointer-events-none">
        <nav
          className={cn(
            "flex items-center gap-1 px-2 py-1.5 rounded-full pointer-events-auto",
            "bg-[#1A1A1A] dark:bg-[#1A1A1A] border border-white/[0.08]",
            "shadow-2xl shadow-black/20",
            "backdrop-blur-xl"
          )}
        >
          {/* Logo */}
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2 px-3 py-1.5 mr-1"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Layers className="h-4 w-4 text-white" />
            </div>
            <span className="font-outfit text-sm font-bold text-white hidden sm:inline">
              Type<span className="text-purple-400">Hype</span>
            </span>
          </NavLink>

          {/* Divider */}
          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Nav Items */}
          {navItems.map((item) => (
            <PillNavItem
              key={item.path}
              item={item}
              isActive={isActive(item)}
            />
          ))}

          {/* Divider */}
          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* More Menu (Tools) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300",
                  "hover:bg-white/10",
                  moreIsActive
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:text-white/90"
                )}
              >
                <MoreHorizontal className="h-[18px] w-[18px]" />
                <span
                  className={cn(
                    "text-sm font-medium transition-all duration-300 overflow-hidden",
                    moreIsActive ? "max-w-[80px] opacity-100" : "max-w-0 opacity-0"
                  )}
                >
                  Araçlar
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              sideOffset={12}
              className="w-52 rounded-xl bg-[#1A1A1A] border-white/10 text-white shadow-2xl"
            >
              {moreItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname.startsWith(item.path);
                return (
                  <DropdownMenuItem
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
                      "text-white/70 hover:text-white hover:bg-white/10",
                      "focus:bg-white/10 focus:text-white",
                      active && "bg-white/10 text-white"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm">{item.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Divider */}
          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* User Avatar & Menu */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-white/10 transition-all duration-300">
                  <Avatar className="h-7 w-7 ring-1 ring-white/20">
                    <AvatarImage src={user.avatar_url} alt={user.name} />
                    <AvatarFallback className="bg-purple-500 text-white text-xs font-semibold">
                      {user.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-white/70 font-medium hidden md:inline max-w-[100px] truncate">
                    {user.name?.split(" ")[0]}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={12}
                className="w-56 rounded-xl bg-[#1A1A1A] border-white/10 text-white shadow-2xl"
              >
                {/* User info */}
                <div className="px-3 py-2.5 border-b border-white/10">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-white/50 truncate">{user.email}</p>
                </div>

                {profileMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-white/70 hover:text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{item.label}</span>
                    </DropdownMenuItem>
                  );
                })}

                <DropdownMenuSeparator className="bg-white/10" />

                <DropdownMenuItem
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-white/70 hover:text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span className="text-sm">{theme === "dark" ? "Aydınlık Mod" : "Karanlık Mod"}</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setSettingsOpen(true)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-white/70 hover:text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-sm">Ayarlar</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-white/10" />

                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">Çıkış Yap</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-1.5 rounded-full bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium transition-colors"
            >
              Giriş Yap
            </button>
          )}

          {/* Settings Gear */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-all duration-300"
          >
            <Settings className="h-4 w-4" />
          </button>
        </nav>
      </header>

      {/* ── Main Content ── */}
      <main className="pt-[72px] pb-8 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* ── Settings Dialog ── */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-outfit">Ayarlar</DialogTitle>
            <DialogDescription>Uygulama ayarlarını yapılandırın</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tema</label>
              <div className="flex gap-2">
                <Button variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => setTheme("dark")}>
                  <Moon className="h-4 w-4 mr-2" /> Karanlık
                </Button>
                <Button variant={theme === "light" ? "default" : "outline"} size="sm" onClick={() => setTheme("light")}>
                  <Sun className="h-4 w-4 mr-2" /> Aydınlık
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">API Durumu</label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-green-500" />
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
