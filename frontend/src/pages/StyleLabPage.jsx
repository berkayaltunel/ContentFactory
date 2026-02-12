import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Fingerprint,
  Zap,
  ExternalLink,
} from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import api, { API } from "@/lib/api";

// ─── Avatar with fallback ───
function Avatar({ url, name, size = 48 }) {
  const [error, setError] = useState(false);
  const initials = (name || "?").charAt(0).toUpperCase();

  if (!url || error) {
    return (
      <div
        className="rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name}
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }}
      onError={() => setError(true)}
    />
  );
}

// ─── Profile Card ───
function ProfileCard({ profile, onUse, onRefresh, onDelete }) {
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh(profile.id);
      toast.success("Profil güncellendi");
    } catch {
      toast.error("Güncelleme başarısız");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`"${profile.name}" profilini silmek istediğine emin misin?`)) return;
    setDeleting(true);
    try {
      await onDelete(profile.id);
      toast.success("Profil silindi");
    } catch {
      toast.error("Silinemedi");
    } finally {
      setDeleting(false);
    }
  };

  const tweetCount = profile.tweet_count || profile.style_summary?.tweet_count || 0;
  const avgLikes = profile.style_summary?.avg_likes || 0;

  return (
    <Card className="bg-[#141414] border-white/10 hover:border-white/20 transition-colors">
      <CardContent className="p-5">
        {/* Header: Avatar + Info */}
        <div className="flex items-start gap-4 mb-4">
          <Avatar
            url={profile.avatar_url}
            name={profile.twitter_display_name || profile.name}
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">
              {profile.twitter_display_name || profile.name}
            </h3>
            {profile.twitter_username && (
              <p className="text-sm text-muted-foreground">
                @{profile.twitter_username}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="secondary" className="text-xs">
                {tweetCount} tweet
              </Badge>
              {avgLikes > 0 && (
                <Badge variant="secondary" className="text-xs">
                  ort. {avgLikes.toLocaleString()} begeni
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            onClick={() => onUse(profile)}
          >
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            Kullan
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/10"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 hover:border-red-500/50 hover:text-red-400"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Add Profile Dialog ───
function AddProfileDialog({ open, onOpenChange, onAdd }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");

  const handleAdd = async () => {
    const handle = username.trim().replace("@", "");
    if (!handle) {
      toast.error("Kullanıcı adı girin");
      return;
    }

    setLoading(true);
    setProgress(10);
    setStatus("Kullanıcı aranıyor...");

    const progressTimer = setInterval(() => {
      setProgress((p) => {
        if (p < 30) return p + 5;
        if (p < 60) return p + 3;
        if (p < 85) return p + 1;
        return p;
      });
    }, 800);

    // Update status messages
    const statusTimer = setTimeout(() => setStatus("Tweetler çekiliyor..."), 3000);
    const statusTimer2 = setTimeout(() => setStatus("Stil analizi yapılıyor..."), 8000);
    const statusTimer3 = setTimeout(() => setStatus("Profil oluşturuluyor..."), 14000);

    try {
      const response = await api.post(`${API}/styles/create-from-handle`, {
        twitter_username: handle,
      });
      setProgress(100);
      setStatus("Tamamlandı!");
      await onAdd(response.data);
      toast.success(`@${handle} stil profili oluşturuldu!`);
      setUsername("");
      onOpenChange(false);
    } catch (error) {
      const detail = error.response?.data?.detail || "Profil oluşturulamadı";
      toast.error(detail);
    } finally {
      clearInterval(progressTimer);
      clearTimeout(statusTimer);
      clearTimeout(statusTimer2);
      clearTimeout(statusTimer3);
      setLoading(false);
      setProgress(0);
      setStatus("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FaXTwitter className="h-5 w-5" />
            Stil Profili Ekle
          </DialogTitle>
          <DialogDescription>
            Stilini klonlamak istediğin Twitter hesabının kullanıcı adını gir.
            Tweetleri analiz edilip stil profili oluşturulacak.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                @
              </span>
              <Input
                placeholder="kullanici_adi"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-8"
                disabled={loading}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleAdd()}
              />
            </div>
            <Button onClick={handleAdd} disabled={loading || !username.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {loading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {status}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───
export default function StyleLabPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const response = await api.get(`${API}/styles/list`);
      setProfiles(response.data || []);
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProfile = async (profileData) => {
    setProfiles([profileData, ...profiles]);
  };

  const handleDeleteProfile = async (profileId) => {
    await api.delete(`${API}/styles/${profileId}`);
    setProfiles(profiles.filter((p) => p.id !== profileId));
  };

  const handleRefreshProfile = async (profileId) => {
    await api.post(`${API}/styles/${profileId}/refresh`);
    await fetchProfiles();
  };

  const handleUseProfile = (profile) => {
    navigate(`/create?platform=x&style_profile_id=${profile.id}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-outfit text-3xl font-bold flex items-center gap-3">
            <Fingerprint className="h-8 w-8 text-purple-400" />
            Style Lab
          </h1>
          <p className="text-muted-foreground mt-1">
            Twitter hesaplarının yazım stilini klonla
          </p>
        </div>
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Stil Profili Ekle
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      ) : profiles.length === 0 ? (
        /* Empty State */
        <Card className="border-dashed border-2 border-white/10 bg-[#141414]">
          <CardContent className="py-16 text-center">
            <Fingerprint className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-outfit text-xl font-semibold mb-2">
              Henüz stil profili yok
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Beğendiğin bir Twitter hesabının yazım stilini analiz edip
              kendi içeriklerinde kullanabilirsin.
            </p>
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              İlk Stil Profilini Ekle
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Profile Grid */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onUse={handleUseProfile}
              onRefresh={handleRefreshProfile}
              onDelete={handleDeleteProfile}
            />
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <AddProfileDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddProfile}
      />
    </div>
  );
}
