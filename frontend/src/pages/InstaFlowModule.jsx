import { Instagram, Zap, Layers, Hash, Users, Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function InstaFlowModule() {
  return (
    <div className="max-w-3xl" data-testid="instaflow-module">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-outfit text-4xl font-bold tracking-tight mb-2 gradient-text-instagram">
          Instagram Strategy
        </h1>
        <p className="text-muted-foreground">
          Dijital içerik strateji ve üretim merkezi.
        </p>
      </div>

      {/* Search Card */}
      <Card className="bg-card border-border mb-8">
        <CardContent className="p-6">
          <div className="flex gap-3">
            <div className="flex items-center gap-3 flex-1 bg-secondary/50 rounded-lg px-4 py-3">
              <Instagram className="h-5 w-5 text-pink-500" />
              <Input 
                placeholder="Konu gir..." 
                className="border-0 bg-transparent focus-visible:ring-0 p-0"
                data-testid="insta-search-input"
              />
            </div>
            <Button className="px-8 bg-white text-black hover:bg-gray-200" data-testid="insta-search-btn">
              Başla
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feature Card */}
      <Card className="bg-gradient-to-br from-purple-950/20 via-pink-950/20 to-orange-950/20 border-pink-500/20 overflow-hidden">
        <CardContent className="p-8">
          <h2 className="font-outfit text-3xl font-bold gradient-text-instagram mb-2 text-center">
            InstaFlow Strategy
          </h2>
          <p className="text-muted-foreground text-center mb-8">
            Instagram algoritmasını lehinize çeviren içerik stratejileri.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-pink-500/10">
              <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-pink-500" />
              </div>
              <span className="text-sm font-medium">Viral Reels Senaryoları & Ses Önerileri</span>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-pink-500/10">
              <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Layers className="h-5 w-5 text-pink-500" />
              </div>
              <span className="text-sm font-medium">Kaydırılabilir Carousel Kurguları</span>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-pink-500/10">
              <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Hash className="h-5 w-5 text-pink-500" />
              </div>
              <span className="text-sm font-medium">Niş Odaklı Akıllı Hashtag Setleri</span>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-pink-500/10">
              <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-pink-500" />
              </div>
              <span className="text-sm font-medium">Rakip Influencer Analizi</span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-4 rounded-lg bg-pink-500/10 border border-pink-500/20">
            <Lightbulb className="h-4 w-4 text-pink-400 mt-0.5" />
            <p className="text-sm text-pink-200">
              İpucu: Görsel kanca önerilerini kullanarak izleyiciyi ilk 3 saniyede yakalayın.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon Notice */}
      <div className="mt-8 text-center">
        <p className="text-muted-foreground text-sm">
          Bu modül yakında aktif olacak. Şimdilik X AI modülünü kullanabilirsiniz.
        </p>
      </div>
    </div>
  );
}
