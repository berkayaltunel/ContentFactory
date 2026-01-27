import { Linkedin, Building2, FileText, BarChart3, Users, Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LinkShareModule() {
  return (
    <div className="max-w-3xl" data-testid="linkshare-module">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-outfit text-4xl font-bold tracking-tight mb-2 text-blue-500">
          LinkShareAI Brand
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
              <Building2 className="h-5 w-5 text-blue-500" />
              <Input 
                placeholder="Konu gir..." 
                className="border-0 bg-transparent focus-visible:ring-0 p-0"
                data-testid="linkedin-search-input"
              />
            </div>
            <Button className="px-8 bg-white text-black hover:bg-gray-200" data-testid="linkedin-search-btn">
              Başla
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feature Card */}
      <Card className="bg-gradient-to-br from-blue-950/30 to-card border-blue-500/20 overflow-hidden">
        <CardContent className="p-8">
          <h2 className="font-outfit text-3xl font-bold text-blue-500 mb-2 text-center">
            LinkShareAI Brand
          </h2>
          <p className="text-muted-foreground text-center mb-8">
            Profesyonel otoritenizi inşa edin ve ağınızı büyütün.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-blue-500/10">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-500" />
              </div>
              <span className="text-sm font-medium">Kişisel Marka & Otorite Analizi</span>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-blue-500/10">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <span className="text-sm font-medium">Broetry Formatında Gönderi Yazımı</span>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-blue-500/10">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <span className="text-sm font-medium">İçerik Dengesi (Eğitici vs Satış) Kontrolü</span>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-blue-500/10">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <span className="text-sm font-medium">Sektör Liderleri (Top Voices) Analizi</span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Lightbulb className="h-4 w-4 text-blue-400 mt-0.5" />
            <p className="text-sm text-blue-200">
              İpucu: Hedef kitlenizi (örn: Kurucular, İK) belirterek dilin tonunu optimize edin.
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
