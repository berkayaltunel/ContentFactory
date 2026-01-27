import { FileText, PenTool, Search, BookOpen, Share2, Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function BlogArchitectModule() {
  return (
    <div className="max-w-3xl" data-testid="blog-module">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-outfit text-4xl font-bold tracking-tight mb-2 text-orange-500">
          Blog Architect
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
              <FileText className="h-5 w-5 text-orange-500" />
              <Input 
                placeholder="Blog konusu gir..." 
                className="border-0 bg-transparent focus-visible:ring-0 p-0"
                data-testid="blog-search-input"
              />
            </div>
            <Button className="px-8 bg-white text-black hover:bg-gray-200" data-testid="blog-search-btn">
              Başla
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feature Card */}
      <Card className="bg-gradient-to-br from-orange-950/30 to-card border-orange-500/20 overflow-hidden">
        <CardContent className="p-8">
          <h2 className="font-outfit text-3xl font-bold text-orange-500 mb-2 text-center">
            Blog Architect AI
          </h2>
          <p className="text-muted-foreground text-center mb-8">
            SEO dostu, okuyucu çeken blog içerikleri oluşturun.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-orange-500/10">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <PenTool className="h-5 w-5 text-orange-500" />
              </div>
              <span className="text-sm font-medium">AI Destekli Blog Yazımı</span>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-orange-500/10">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Search className="h-5 w-5 text-orange-500" />
              </div>
              <span className="text-sm font-medium">SEO Optimizasyon Önerileri</span>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-orange-500/10">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-orange-500" />
              </div>
              <span className="text-sm font-medium">Konu & Başlık Fikirleri</span>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-orange-500/10">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Share2 className="h-5 w-5 text-orange-500" />
              </div>
              <span className="text-sm font-medium">Sosyal Medya Repurpose</span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <Lightbulb className="h-4 w-4 text-orange-400 mt-0.5" />
            <p className="text-sm text-orange-200">
              İpucu: Uzun blog yazılarınızı otomatik olarak sosyal medya postlarına dönüştürün.
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
