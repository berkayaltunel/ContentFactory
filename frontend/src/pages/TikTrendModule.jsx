import { Music2, Play, Mic, Target, Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function TikTrendModule() {
  return (
    <div className="max-w-3xl" data-testid="tiktrend-module">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-outfit text-4xl font-bold tracking-tight mb-2 gradient-text-tiktok">
          TIKTREND PULSE
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
              <Music2 className="h-5 w-5 text-cyan-400" />
              <Input 
                placeholder="Konu gir..." 
                className="border-0 bg-transparent focus-visible:ring-0 p-0"
                data-testid="tiktok-search-input"
              />
            </div>
            <Button className="px-8 bg-white text-black hover:bg-gray-200" data-testid="tiktok-search-btn">
              Başla
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feature Card */}
      <Card className="bg-gradient-to-br from-cyan-950/30 to-pink-950/20 border-cyan-500/20 overflow-hidden">
        <CardContent className="p-8">
          <h2 className="font-outfit text-3xl font-bold gradient-text-tiktok mb-2 text-center">
            TikTrend Pulse AI
          </h2>
          <p className="text-muted-foreground text-center mb-8">
            Gen Z'nin hızına yetişin. Trendleri yakalayın, akımı yönetin.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-cyan-500/10">
              <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Music2 className="h-5 w-5 text-cyan-400" />
              </div>
              <span className="text-sm font-medium">Trend Ses & Müzik Önerileri</span>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-cyan-500/10">
              <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Play className="h-5 w-5 text-cyan-400" />
              </div>
              <span className="text-sm font-medium">Saniye Saniye Video Senaryosu</span>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-cyan-500/10">
              <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Mic className="h-5 w-5 text-cyan-400" />
              </div>
              <span className="text-sm font-medium">Dahili Teleprompter ile Kayıt İmkanı</span>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-cyan-500/10">
              <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-cyan-400" />
              </div>
              <span className="text-sm font-medium">Görsel Kanca (Visual Hook) Tasarımı</span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <Lightbulb className="h-4 w-4 text-cyan-400 mt-0.5" />
            <p className="text-sm text-cyan-200">
              İpucu: 'Vibe' seçiciyi kullanarak videonuzun tonunu (Komedi, Eğitim, Estetik) belirleyin.
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
