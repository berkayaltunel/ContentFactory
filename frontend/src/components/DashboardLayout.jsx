import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sun, Moon, Settings, Layers, LogOut, User, History, Heart,
  ChevronDown, Dna, TrendingUp, BarChart3, FileText, Compass, Fingerprint,
  Home, MoreHorizontal, Search, Check, Star, Pencil, Trash2, X
} from "lucide-react";
import { FaXTwitter, FaYoutube, FaInstagram, FaTiktok, FaLinkedinIn } from "react-icons/fa6";
import { PenNib } from "@phosphor-icons/react";
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

const NAV_ITEMS_CONFIG = [
  { path: "/dashboard", labelKey: "nav.home", icon: Home, exact: true },
  { path: "/dashboard/create?platform=twitter", label: "X", icon: (p) => <BI Icon={FaXTwitter} {...p} /> },
  { path: "/dashboard/create?platform=youtube", label: "YouTube", icon: (p) => <BI Icon={FaYoutube} {...p} /> },
  { path: "/dashboard/create?platform=instagram", label: "Instagram", icon: (p) => <BI Icon={FaInstagram} {...p} /> },
  { path: "/dashboard/create?platform=tiktok", label: "TikTok", icon: (p) => <BI Icon={FaTiktok} {...p} /> },
  { path: "/dashboard/create?platform=linkedin", label: "LinkedIn", icon: (p) => <BI Icon={FaLinkedinIn} {...p} /> },
  { path: "/dashboard/create?platform=blog", label: "Blog", icon: (p) => <BI Icon={HiDocumentText} {...p} /> },
];

const MORE_ITEMS_CONFIG = [
  { path: "/dashboard/youtube-studio", labelKey: "nav.youtubeStudio", icon: (p) => <BI Icon={FaYoutube} {...p} /> },
  { path: "/dashboard/style-lab", labelKey: "nav.styleLab", icon: Dna },
  { path: "/dashboard/persona-lab", labelKey: "nav.personaLab", icon: Fingerprint },
  { path: "/dashboard/trends", labelKey: "nav.trends", icon: TrendingUp },
  { path: "/dashboard/account-analysis", labelKey: "nav.accountAnalysis", icon: BarChart3 },
  { path: "/dashboard/coach", labelKey: "nav.aiCoach", icon: Compass },
];

const PROFILE_MENU_CONFIG = [
  { path: "/dashboard/history", labelKey: "nav.history", icon: History },
  { path: "/dashboard/favorites", labelKey: "nav.favorite", icon: Heart },
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
  const { t } = useTranslation();
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
      <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">{t('nav.myAccounts')}</p>
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
                    placeholder={t('common.username')}
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
                    <span className="text-xs text-white/30">{t('nav.addAccount')}</span>
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
                      title={t('nav.makePrimary')}
                    >
                      <Star className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                    className="w-5 h-5 rounded-full hover:bg-red-500/10 flex items-center justify-center text-white/30 hover:text-red-400 transition-colors"
                    title={t('nav.removeAccount')}
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
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user, signOut, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = useMemo(() => NAV_ITEMS_CONFIG.map(item => ({
    ...item,
    label: item.labelKey ? t(item.labelKey) : item.label,
  })), [t]);

  const moreItems = useMemo(() => MORE_ITEMS_CONFIG.map(item => ({
    ...item,
    label: t(item.labelKey),
  })), [t]);

  const profileMenuItems = useMemo(() => PROFILE_MENU_CONFIG.map(item => ({
    ...item,
    label: t(item.labelKey),
  })), [t]);

  // Scroll to top on route change (with small delay to beat other scroll triggers)
  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = setTimeout(() => window.scrollTo(0, 0), 100);
    return () => clearTimeout(timer);
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
      toast.success(t('nav.accountSaved'));
    } catch {
      toast.error(t('nav.accountSaveError'));
    }
  };

  const handleDeleteAccount = async (platform) => {
    try {
      await api.delete(`${API}/accounts/${platform}`);
      await fetchAccounts();
      toast.success(t('nav.accountRemoved'));
    } catch {
      toast.error(t('nav.accountRemoveError'));
    }
  };

  const handleSetPrimary = async (platform) => {
    try {
      await api.patch(`${API}/accounts/${platform}/primary`);
      await fetchAccounts();
      toast.success(t('nav.primaryChanged'));
    } catch {
      toast.error(t('nav.primaryChangeError'));
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success(t('nav.signedOut'));
      navigate("/");
    } catch (error) {
      toast.error(t('nav.signOutError'));
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
      {/* ── Floating Top Nav Bar (desktop) ── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4 pointer-events-none hidden md:flex">
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
                  {t('nav.tools')}
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
                  <span className="text-sm">{t('common.settings')}</span>
                </DropdownMenuItem>

                {/* Language Toggle */}
                <DropdownMenuItem
                  onClick={() => i18n.changeLanguage(i18n.language === 'tr' ? 'en' : 'tr')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-white/70 hover:text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
                >
                  <span className="h-4 w-4 flex items-center justify-center text-xs font-bold">
                    {i18n.language === 'tr' ? '🇬🇧' : '🇹🇷'}
                  </span>
                  <span className="text-sm">
                    {i18n.language === 'tr' ? 'English' : 'Türkçe'}
                  </span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-white/10" />

                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">{t('nav.signOut')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-1.5 rounded-full bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium transition-colors"
            >
              {t('nav.login')}
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

      {/* ── Mobile Top Bar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex md:hidden items-center justify-between px-4 py-2 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-white/[0.06] safe-area-top">
        <NavLink to="/dashboard" className="flex items-center gap-2">
          <img src="/logo.png" alt="Type Hype" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-outfit text-sm font-bold text-white">
            Type<span className="text-purple-400">Hype</span>
          </span>
        </NavLink>
        <div className="flex items-center gap-2">
          {/* Mobile Platform Quick Selector */}
          {location.pathname.includes("/create") && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/[0.1] text-white/70 text-xs font-medium haptic-btn focus:outline-none">
                  {(() => {
                    const currentPlatform = new URLSearchParams(location.search).get("platform") || "twitter";
                    const platformIcons = { twitter: FaXTwitter, youtube: FaYoutube, instagram: FaInstagram, tiktok: FaTiktok, linkedin: FaLinkedinIn, blog: HiDocumentText };
                    const PIcon = platformIcons[currentPlatform] || FaXTwitter;
                    return <PIcon style={{ width: "12px", height: "12px" }} />;
                  })()}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-44 rounded-xl bg-[#1A1A1A] border-white/10 text-white shadow-2xl">
                {[
                  { id: "twitter", label: "X / Twitter", Icon: FaXTwitter },
                  { id: "youtube", label: "YouTube", Icon: FaYoutube },
                  { id: "instagram", label: "Instagram", Icon: FaInstagram },
                  { id: "tiktok", label: "TikTok", Icon: FaTiktok },
                  { id: "linkedin", label: "LinkedIn", Icon: FaLinkedinIn },
                  { id: "blog", label: "Blog", Icon: HiDocumentText },
                ].map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => navigate(`/dashboard/create?platform=${p.id}`)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-white/70 hover:text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
                  >
                    <p.Icon style={{ width: "14px", height: "14px" }} />
                    <span className="text-sm">{p.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded-full focus:outline-none haptic-btn">
                  <Avatar className="h-7 w-7 ring-1 ring-white/20">
                    <AvatarImage src={primaryAvatarUrl || user.avatar_url} alt={user.name} onError={(e) => { e.target.style.display = 'none'; }} />
                    <AvatarFallback className="bg-purple-500 text-white text-xs font-semibold">
                      {user.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-xl bg-[#1A1A1A] border-white/10 text-white shadow-2xl">
                <div className="px-3 py-2.5 border-b border-white/10">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-white/50 truncate">{user.email}</p>
                </div>
                <ConnectedAccountsSection accounts={connectedAccounts} onSave={handleSaveAccount} onDelete={handleDeleteAccount} onSetPrimary={handleSetPrimary} />
                <DropdownMenuSeparator className="bg-white/10" />
                {profileMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.path} onClick={() => navigate(item.path)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-white/70 hover:text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                      <Icon className="h-4 w-4" /><span className="text-sm">{item.label}</span>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-white/70 hover:text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                  <Settings className="h-4 w-4" /><span className="text-sm">{t('common.settings')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300">
                  <LogOut className="h-4 w-4" /><span className="text-sm">{t('nav.signOut')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button onClick={() => navigate("/login")} className="px-3 py-1 rounded-full bg-purple-500 text-white text-xs font-medium haptic-btn">{t('nav.login')}</button>
          )}
        </div>
      </header>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around px-1 pt-1.5 pb-1 bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-white/[0.08] safe-area-bottom">
        {[
          { path: "/dashboard", label: t('nav.home'), icon: Home, exact: true },
          { path: "/dashboard/create?platform=twitter", label: t('nav.create'), icon: (p) => <PenNib weight="duotone" {...p} /> },
          { path: "/dashboard/trends", label: t('nav.trend'), icon: TrendingUp },
          { path: "/dashboard/favorites", label: t('nav.favorite'), icon: Heart },
          { path: "/dashboard/history", label: t('nav.history'), icon: History },
        ].map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={cn(
                "relative flex flex-col items-center gap-0.5 py-2 px-3 min-w-[52px] min-h-[44px] haptic-btn rounded-xl transition-all duration-300",
                active && "mobile-tab-active"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 transition-all duration-300",
                active ? "text-purple-400 scale-110" : "text-white/40"
              )} />
              <span className={cn(
                "text-[10px] transition-all duration-300",
                active ? "text-purple-400 font-semibold" : "text-white/35"
              )}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* ── Main Content ── */}
      <main className="pt-14 md:pt-20 pb-24 md:pb-8 px-3 md:px-8">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* ── Settings Dialog ── */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-outfit">{t('settings.title')}</DialogTitle>
            <DialogDescription>{t('settings.subtitle')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('settings.theme')}</label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Moon className="h-4 w-4" /> {t('settings.darkMode')}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('settings.apiStatus')}</label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                {t('settings.openaiConnected')}
              </div>
            </div>
            {user && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('settings.account')}</label>
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
