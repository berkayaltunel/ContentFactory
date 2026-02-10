import { useState, useEffect, useRef, useCallback } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sun, Moon, Settings, Layers, LogOut, User, History, Heart,
  ChevronDown, Sparkles, Dna, TrendingUp, BarChart3, FileText,
  Home, MoreHorizontal, Search, Check, Star, Pencil, Trash2, X
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
  { path: "/dashboard/create?platform=twitter", label: "X", icon: (p) => <BI Icon={FaXTwitter} {...p} /> },
  { path: "/dashboard/create?platform=youtube", label: "YouTube", icon: (p) => <BI Icon={FaYoutube} {...p} /> },
  { path: "/dashboard/create?platform=instagram", label: "Instagram", icon: (p) => <BI Icon={FaInstagram} {...p} /> },
  { path: "/dashboard/create?platform=tiktok", label: "TikTok", icon: (p) => <BI Icon={FaTiktok} {...p} /> },
  { path: "/dashboard/create?platform=linkedin", label: "LinkedIn", icon: (p) => <BI Icon={FaLinkedinIn} {...p} /> },
  { path: "/dashboard/create?platform=blog", label: "Blog", icon: (p) => <BI Icon={HiDocumentText} {...p} /> },
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

/* ── Platform Config ──────────────────────────────── */

const PLATFORMS = [
  { id: "twitter", label: "Twitter / X", Icon: FaXTwitter, avatarUrl: (u) => `https://unavatar.io/x/${u}` },
  { id: "instagram", label: "Instagram", Icon: FaInstagram, avatarUrl: (u) => `${process.env.REACT_APP_API_URL || "https://api.typehype.io"}/api/accounts/avatar/instagram/${u}` },
  { id: "youtube", label: "YouTube", Icon: FaYoutube, avatarUrl: (u) => `https://unavatar.io/youtube/${u}` },
  { id: "tiktok", label: "TikTok", Icon: FaTiktok, avatarUrl: (u) => `https://unavatar.io/tiktok/${u}` },
  { id: "linkedin", label: "LinkedIn", Icon: FaLinkedinIn, avatarUrl: null },
];

/* ── Connected Accounts Section ──────────────────── */

function ConnectedAccountsSection({ accounts, onSave, onDelete, onSetPrimary }) {
  const [editingPlatform, setEditingPlatform] = useState(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingPlatform && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingPlatform]);

  const accountMap = {};
  (accounts || []).forEach((a) => { accountMap[a.platform] = a; });

  const handleStartEdit = (platformId, currentUsername) => {
    setEditingPlatform(platformId);
    setEditValue(currentUsername || "");
  };

  const handleSave = async (platformId) => {
    const val = editValue.trim().replace(/^@/, "");
    if (!val) {
      setEditingPlatform(null);
      return;
    }
    await onSave(platformId, val);
    setEditingPlatform(null);
  };

  return (
    <div className="px-3 py-2">
      <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">Hesaplarım</p>
      <div className="space-y-1">
        {PLATFORMS.map(({ id, label, Icon, avatarUrl }) => {
          const acct = accountMap[id];
          const isEditing = editingPlatform === id;

          return (
            <div
              key={id}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group"
            >
              {/* Platform avatar or icon */}
              {acct && avatarUrl ? (
                <img
                  src={avatarUrl(acct.username)}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover shrink-0 border border-white/10"
                  onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                />
              ) : null}
              <div
                className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0"
                style={{ display: acct && avatarUrl ? "none" : "flex" }}
              >
                <Icon className="w-3 h-3 text-white/60" />
              </div>

              {isEditing ? (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <span className="text-white/40 text-xs">@</span>
                  <input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value.replace(/^@/, ""))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave(id);
                      if (e.key === "Escape") setEditingPlatform(null);
                    }}
                    className="flex-1 bg-transparent border-none outline-none text-white text-xs min-w-0"
                    placeholder="kullanıcı adı"
                  />
                  <button
                    onClick={() => handleSave(id)}
                    className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center hover:bg-green-500/30 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setEditingPlatform(null)}
                    className="w-5 h-5 rounded-full bg-white/10 text-white/40 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div
                  className="flex items-center gap-1 flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleStartEdit(id, acct?.username)}
                >
                  {acct ? (
                    <>
                      <span className="text-xs text-white/70 truncate">@{acct.username}</span>
                      {acct.is_primary && <Star className="w-3 h-3 text-yellow-400 shrink-0 fill-yellow-400" />}
                    </>
                  ) : (
                    <span className="text-xs text-white/30">Ekle</span>
                  )}
                </div>
              )}

              {/* Actions (visible on hover) */}
              {acct && !isEditing && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!acct.is_primary && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onSetPrimary(id); }}
                      className="w-5 h-5 rounded-full hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-yellow-400 transition-colors"
                      title="Ana hesap yap"
                    >
                      <Star className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                    className="w-5 h-5 rounded-full hover:bg-red-500/10 flex items-center justify-center text-white/30 hover:text-red-400 transition-colors"
                    title="Kaldır"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Layout ─────────────────────────────────── */

export default function DashboardLayout() {
  const { theme, setTheme } = useTheme();
  const { user, signOut, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState([]);

  // Fetch connected accounts
  const fetchAccounts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get(`${API}/accounts`);
      setConnectedAccounts(res.data || []);
    } catch {}
  }, [isAuthenticated]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  // Derive primary account & avatar
  const primaryAccount = connectedAccounts.find((a) => a.is_primary);
  const primaryAvatarUrl = primaryAccount
    ? PLATFORMS.find((p) => p.id === primaryAccount.platform)?.avatarUrl?.(primaryAccount.username)
    : null;

  const handleSaveAccount = async (platform, username) => {
    try {
      await api.put(`${API}/accounts/${platform}`, { username });
      await fetchAccounts();
      toast.success("Hesap kaydedildi");
    } catch {
      toast.error("Kaydedilemedi");
    }
  };

  const handleDeleteAccount = async (platform) => {
    try {
      await api.delete(`${API}/accounts/${platform}`);
      await fetchAccounts();
      toast.success("Hesap kaldırıldı");
    } catch {
      toast.error("Silinemedi");
    }
  };

  const handleSetPrimary = async (platform) => {
    try {
      await api.patch(`${API}/accounts/${platform}/primary`);
      await fetchAccounts();
      toast.success("Ana hesap değiştirildi");
    } catch {
      toast.error("Değiştirilemedi");
    }
  };

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
    const [itemPath, itemSearch] = item.path.split("?");
    if (item.exact) return location.pathname === itemPath;
    if (itemSearch) {
      const params = new URLSearchParams(itemSearch);
      const currentParams = new URLSearchParams(location.search);
      return location.pathname === itemPath && [...params.entries()].every(([k, v]) => currentParams.get(k) === v);
    }
    return location.pathname.startsWith(itemPath);
  };

  // Check if any "more" item is active
  const moreIsActive = moreItems.some((item) => location.pathname.startsWith(item.path));
  const profileIsActive = profileMenuItems.some((item) => location.pathname.startsWith(item.path));

  return (
    <div className="min-h-screen bg-background">
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
            <img src="/logo.png" alt="Type Hype" className="h-9 w-9 rounded-lg object-cover" />
            <span className="font-outfit text-base font-bold text-white hidden sm:inline">
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
                <button className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-white/10 transition-all duration-300 focus:outline-none focus-visible:outline-none">
                  <Avatar className="h-7 w-7 ring-1 ring-white/20">
                    <AvatarImage 
                      src={primaryAvatarUrl || user.avatar_url} 
                      alt={user.name}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
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

                {/* Connected Accounts */}
                <ConnectedAccountsSection
                  accounts={connectedAccounts}
                  onSave={handleSaveAccount}
                  onDelete={handleDeleteAccount}
                  onSetPrimary={handleSetPrimary}
                />

                <DropdownMenuSeparator className="bg-white/10" />

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
      <main className="pt-20 pb-8 px-4 md:px-8">
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Moon className="h-4 w-4" /> Karanlık Mod (aktif)
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
