import { Youtube, Search, TrendingUp, Image, Activity, Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function YouTubeModule() {
  return (
    <div className="max-w-3xl" data-testid="youtube-module">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-outfit text-4xl font-bold tracking-tight mb-2 text-red-500">
          YouTube Intelligence
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
              <Youtube className="h-5 w-5 text-red-500" />
              <Input 
                placeholder="Konu gir..." 
                className="border-0 bg-transparent focus-visible:ring-0 p-0"
                data-testid="youtube-search-input"
              />
            </div>
            <Button className="px-8 bg-white text-black hover:bg-gray-200" data-testid="youtube-search-btn">
              Başla
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feature Card */}
      <Card className="bg-gradient-to-br from-red-950/30 to-card border-red-500/20 overflow-hidden">
        <CardContent className="p-8">
          <h2 className="font-outfit text-3xl font-bold text-red-500 mb-2 text-center italic">
            YouTubeAI Intelligence
          </h2>
          <p className="text-muted-foreground text-center mb-8">
            Videonuz henüz fikir aşamasındayken başarısını garantileyin.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-red-500/10">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Search className="h-5 w-5 text-red-500" />
              </div>
              <span className="text-sm font-medium">Derinlemesine SEO & Rakip Analizi</span>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-red-500/10">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-red-500" />
              </div>
              <span className="text-sm font-medium">Viral Kanca & Senaryo Mimarı</span>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-red-500/10">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Image className="h-5 w-5 text-red-500" />
              </div>
              <span className="text-sm font-medium">Yüksek Tıklamalı Thumbnail Fikirleri</span>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-red-500/10">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-red-500" />
              </div>
              <span className="text-sm font-medium">Trend & Hacim Tahminleri</span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Lightbulb className="h-4 w-4 text-blue-400 mt-0.5" />
            <p className="text-sm text-blue-200">
              İpucu: Arama yaparken 'Shorts' modunu seçerek dikey video trendlerini yakalayabilirsiniz.
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
