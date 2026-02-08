import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Sparkles, 
  Twitter, 
  Youtube, 
  Instagram, 
  Linkedin, 
  ArrowRight,
  Zap,
  Target,
  TrendingUp,
  Users,
  ChevronRight
} from 'lucide-react';

const features = [
  {
    icon: Twitter,
    title: 'X AI',
    description: 'Viral tweet, thread ve article üretin',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
  },
  {
    icon: Youtube,
    title: 'YouTubeAI',
    description: 'SEO analizi ve senaryo yazımı',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  {
    icon: Instagram,
    title: 'InstaFlow AI',
    description: 'Reels senaryoları ve carousel kurguları',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
  {
    icon: Linkedin,
    title: 'LinkShareAI',
    description: 'Profesyonel içerik ve marka analizi',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
];

const stats = [
  { value: '10K+', label: 'Üretilen İçerik' },
  { value: '500+', label: 'Aktif Kullanıcı' },
  { value: '95%', label: 'Memnuniyet' },
  { value: '24/7', label: 'AI Desteği' },
];

export default function LandingPage() {
  const { isAuthenticated, isConfigured } = useAuth();

  return (
    <div className="min-h-screen bg-background" data-testid="landing-page">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-black" />
            </div>
            <span className="font-outfit text-xl font-bold">ContentFactory</span>
          </Link>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button data-testid="dashboard-btn">
                  Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" data-testid="login-btn">Giriş Yap</Button>
                </Link>
                <Link to="/login">
                  <Button data-testid="signup-btn">
                    Ücretsiz Başla
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary mb-6">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-sm">AI destekli içerik üretimi</span>
          </div>
          
          <h1 className="font-outfit text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Viral İçerik Üretmek
            <br />
            <span className="bg-gradient-to-r from-sky-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              Artık Şans Değil
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            AI destekli içerik fabrikası ile Twitter, YouTube, Instagram ve LinkedIn için 
            viral içerikler üretin. Saniyeler içinde profesyonel içerikler oluşturun.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={isAuthenticated ? "/dashboard" : "/login"}>
              <Button size="lg" className="h-14 px-8 text-lg" data-testid="hero-cta">
                <Sparkles className="mr-2 h-5 w-5" />
                Hemen Başla
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
                Demo İzle
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="font-outfit text-4xl font-bold mb-1">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-outfit text-4xl font-bold mb-4">
              Tüm Platformlar İçin AI İçerik
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Tek bir platform, sınırsız içerik. Her sosyal medya platformu için 
              optimize edilmiş içerikler üretin.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index}
                  className="p-6 rounded-2xl border border-border bg-card hover:border-primary/20 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className={`h-12 w-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4`}>
                    <Icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="font-outfit text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-outfit text-4xl font-bold mb-4">Nasıl Çalışır?</h2>
            <p className="text-muted-foreground text-lg">3 adımda viral içerik</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-sky-500/10 flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-sky-400" />
              </div>
              <h3 className="font-outfit text-xl font-semibold mb-2">1. Konuyu Belirle</h3>
              <p className="text-muted-foreground">
                Tweet, video veya makale konunuzu yazın
              </p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="font-outfit text-xl font-semibold mb-2">2. AI Üretsin</h3>
              <p className="text-muted-foreground">
                Persona, ton ve uzunluk seçin, AI içeriği üretsin
              </p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="font-outfit text-xl font-semibold mb-2">3. Paylaş</h3>
              <p className="text-muted-foreground">
                Kopyala veya direkt Twitter'a gönder
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-sky-500/10 via-purple-500/10 to-pink-500/10 border border-primary/10">
            <h2 className="font-outfit text-4xl font-bold mb-4">
              İçerik Üretmeye Başlayın
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Ücretsiz hesap oluşturun ve hemen viral içerikler üretmeye başlayın.
            </p>
            <Link to={isAuthenticated ? "/dashboard" : "/login"}>
              <Button size="lg" className="h-14 px-8 text-lg">
                <Users className="mr-2 h-5 w-5" />
                Ücretsiz Hesap Oluştur
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span className="font-outfit font-semibold">ContentFactory</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 ContentFactory. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>
    </div>
  );
}
