import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Twitter, Youtube, Instagram, Linkedin, PenTool,
  ArrowRight, Zap, Target, Users, ChevronDown, Globe,
  BarChart3, Palette, MessageSquare, Video, BookOpen,
  Check, Star, Monitor, Link2, Mic, FileText, Layers,
  TrendingUp, Hash, Flame, type, Brain, Eye, Shield,
  Clock, Copy, Send, ChevronRight, Plus, X as XIcon,
  Mail
} from 'lucide-react';

/* ═══════════════════════════════════════════
   ANIMATIONS
   ═══════════════════════════════════════════ */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const slideLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: 'easeOut' } }
};

const slideRight = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: 'easeOut' } }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } }
};

const staggerSlow = {
  visible: { transition: { staggerChildren: 0.12 } }
};

/* Animated counter hook */
function useCounter(end, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView && startOnView) return;
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end, duration, startOnView]);

  return [count, ref];
}

/* ═══════════════════════════════════════════
   BADGE
   ═══════════════════════════════════════════ */
function Badge({ children }) {
  return (
    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[13px] font-medium bg-gray-50 text-gray-500 border border-gray-200/80">
      {children}
    </span>
  );
}

/* ═══════════════════════════════════════════
   1. NAVBAR
   PitchBot: Logo left, nav center, login + CTA right
   ═══════════════════════════════════════════ */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-100'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-[64px] flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-[18px] font-bold text-gray-900 tracking-tight">TypeHype</span>
        </Link>

        {/* Center nav */}
        <div className="hidden md:flex items-center gap-8">
          {['Features', 'Platforms', 'Style Lab', 'FAQ'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(' ', '-')}`}
              className="text-[14px] text-gray-500 hover:text-gray-900 transition-colors duration-200"
            >
              {item}
            </a>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-[14px] text-gray-500 hover:text-gray-900 transition-colors">
            Log in
          </Link>
          <Link
            to="/login"
            className="text-[14px] px-5 py-2 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition-all duration-200 hover:shadow-lg hover:shadow-gray-900/10"
          >
            Get started
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

/* ═══════════════════════════════════════════
   2. HERO
   PitchBot: Social proof → Big heading → CTA → Dashboard mockup
   Background: Soft pastel mesh gradients
   ═══════════════════════════════════════════ */
function Hero() {
  return (
    <section className="relative pt-[120px] pb-8 overflow-hidden">
      {/* Mesh gradient background - matching PitchBot's warm peach + cool cyan */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 left-[10%] w-[500px] h-[500px] bg-orange-200/50 rounded-full blur-[120px]" />
        <div className="absolute -top-10 right-[10%] w-[450px] h-[450px] bg-cyan-200/40 rounded-full blur-[120px]" />
        <div className="absolute top-40 left-[40%] w-[300px] h-[300px] bg-purple-200/20 rounded-full blur-[100px]" />
        {/* Subtle base tint */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50/0 via-gray-50/0 to-white" />
      </div>

      <motion.div
        className="max-w-[1200px] mx-auto text-center px-6"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {/* Social proof pill */}
        <motion.div variants={fadeUp} className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
            <div className="flex -space-x-2">
              {[
                { bg: 'bg-orange-400', letter: 'B' },
                { bg: 'bg-purple-400', letter: 'S' },
                { bg: 'bg-cyan-400', letter: 'A' },
              ].map((a, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-full ${a.bg} border-2 border-white flex items-center justify-center text-white text-[11px] font-bold`}
                >
                  {a.letter}
                </div>
              ))}
            </div>
            <span className="text-[13px] text-gray-600 font-medium">500+ creators joined</span>
          </div>
        </motion.div>

        {/* Main heading - large display font like PitchBot */}
        <motion.h1
          variants={fadeUp}
          className="text-[52px] md:text-[72px] lg:text-[80px] font-bold text-gray-900 leading-[1.05] tracking-[-0.02em]"
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          Type it.
          <br />
          <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
            Hype it.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={fadeUp}
          className="mt-6 text-[17px] md:text-[19px] text-gray-400 max-w-[520px] mx-auto leading-[1.6]"
        >
          AI-powered content engine that turns your ideas into scroll-stopping posts across every platform.
        </motion.p>

        {/* CTA */}
        <motion.div variants={fadeUp} className="mt-8">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gray-900 text-white rounded-full text-[15px] font-medium hover:bg-gray-800 transition-all duration-200 shadow-xl shadow-gray-900/15 hover:shadow-2xl hover:shadow-gray-900/20 hover:-translate-y-0.5"
          >
            Start Creating
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* ─── Dashboard Mockup (PitchBot chat interface style) ─── */}
        <motion.div variants={scaleIn} className="mt-16 relative max-w-[800px] mx-auto">
          {/* Glow behind card */}
          <div className="absolute -inset-4 bg-gradient-to-b from-orange-100/30 via-purple-100/20 to-transparent rounded-3xl blur-2xl -z-10" />

          <div className="bg-white rounded-[20px] shadow-2xl shadow-gray-200/50 border border-gray-100/80 overflow-hidden">
            <div className="flex">
              {/* Left sidebar (icon-only, dark) */}
              <div className="hidden sm:flex flex-col items-center w-[56px] bg-gray-50 border-r border-gray-100 py-5 gap-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                {[Plus, Twitter, Hash, Palette, BookOpen, Clock].map((Icon, i) => (
                  <div
                    key={i}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      i === 1 ? 'bg-white shadow-sm text-gray-700' : 'text-gray-300 hover:text-gray-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                ))}
                {/* Spacer + avatar */}
                <div className="mt-auto">
                  <div className="w-9 h-9 rounded-xl bg-gray-200 flex items-center justify-center text-gray-500 text-[11px] font-bold">
                    B
                  </div>
                </div>
              </div>

              {/* Main content area */}
              <div className="flex-1 p-5 sm:p-6">
                {/* Greeting */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-[16px] font-semibold text-gray-900">Hey Creator!</div>
                    <div className="text-[13px] text-gray-400">What should we write today?</div>
                  </div>
                </div>

                {/* 2x2 Feature cards (PitchBot's Add files / Translate / Audio / Images) */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    {
                      title: 'Write Tweets',
                      desc: 'Viral tweets with 5 AI personas and 4 tones.',
                      icon: <Twitter className="w-5 h-5 text-sky-500" />,
                      extra: <Send className="w-4 h-4 text-sky-300 absolute top-3 right-3" />,
                      bg: 'bg-sky-50/80',
                    },
                    {
                      title: 'Clone Style',
                      desc: 'Analyze any account\'s writing DNA.',
                      icon: <Palette className="w-5 h-5 text-purple-500" />,
                      extra: <div className="absolute top-3 right-3 text-[20px] font-bold text-purple-200">Aa</div>,
                      bg: 'bg-purple-50/80',
                    },
                    {
                      title: 'Video Scripts',
                      desc: 'Turn ideas into Reels & TikTok scripts.',
                      icon: <Video className="w-5 h-5 text-blue-500" />,
                      extra: <Mic className="w-4 h-4 text-blue-300 absolute bottom-3 right-3" />,
                      bg: 'bg-blue-50/80',
                    },
                    {
                      title: 'Blog Articles',
                      desc: 'SEO-optimized long-form content.',
                      icon: <FileText className="w-5 h-5 text-emerald-500" />,
                      extra: <Plus className="w-5 h-5 text-emerald-300 absolute top-3 right-3" />,
                      bg: 'bg-emerald-50/80',
                    },
                  ].map((card, i) => (
                    <div
                      key={i}
                      className={`${card.bg} rounded-2xl p-4 relative overflow-hidden group cursor-default hover:shadow-md transition-shadow duration-200`}
                    >
                      <div className="text-[14px] font-semibold text-gray-800 mb-1">{card.title}</div>
                      <div className="text-[12px] text-gray-400 leading-[1.4] pr-6">{card.desc}</div>
                      {card.extra}
                    </div>
                  ))}
                </div>

                {/* Input bar */}
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                  <span className="text-[13px] text-gray-300 flex-1">Ask me anything...</span>
                  <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center">
                    <ArrowRight className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   3. THREE PILLARS
   PitchBot: Icon circle + bold title + small desc, 3 columns
   ═══════════════════════════════════════════ */
function Pillars() {
  const items = [
    {
      icon: <Zap className="w-5 h-5" />,
      iconBg: 'bg-orange-50 text-orange-500',
      title: 'Lightning Fast',
      desc: 'Generate viral content in seconds with AI-powered personas and smart tones.',
    },
    {
      icon: <Target className="w-5 h-5" />,
      iconBg: 'bg-purple-50 text-purple-500',
      title: 'Style Precision',
      desc: "Clone any creator's writing style from 100 tweets. 9-dimension deep analysis.",
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      iconBg: 'bg-emerald-50 text-emerald-500',
      title: 'Multi-Platform',
      desc: 'One engine for X, Instagram, TikTok, LinkedIn, YouTube, and Blog content.',
    },
  ];

  return (
    <section className="py-20 px-6">
      <motion.div
        className="max-w-[1000px] mx-auto grid md:grid-cols-3 gap-10"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={stagger}
      >
        {items.map((item, i) => (
          <motion.div key={i} variants={fadeUp} className="text-center">
            <div className={`w-14 h-14 ${item.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
              {item.icon}
            </div>
            <h3 className="text-[17px] font-bold text-gray-900 mb-2">{item.title}</h3>
            <p className="text-[14px] text-gray-400 leading-[1.6] max-w-[280px] mx-auto">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   4. TECHNOLOGY (PitchBot Image 2 top)
   Badge → Big heading → Left features + highlighted card → Right mockup
   ═══════════════════════════════════════════ */
function Technology() {
  const features = [
    { icon: <Palette className="w-[18px] h-[18px]" />, text: 'Pick from 5 AI personas with unique writing DNA' },
    { icon: <MessageSquare className="w-[18px] h-[18px]" />, text: '4 tones: Natural, Raw, Polished, Unhinged' },
    { icon: <Sparkles className="w-[18px] h-[18px]" />, text: 'APEX mode for maximum viral potential' },
    { icon: <Globe className="w-[18px] h-[18px]" />, text: 'Knowledge modes: Insider, Contrarian, Hidden, Expert' },
  ];

  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <Badge>Technology</Badge>
          <h2 className="mt-5 text-[38px] md:text-[48px] font-bold text-gray-900 leading-[1.1] tracking-[-0.02em]">
            Your Content,<br />Supercharged
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-14 items-center">
          {/* Left: Feature list */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerSlow}
            className="space-y-5"
          >
            {features.map((f, i) => (
              <motion.div
                key={i}
                variants={slideLeft}
                className="flex items-start gap-4"
              >
                <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
                  {f.icon}
                </div>
                <p className="text-[15px] text-gray-500 leading-[1.6] pt-2">{f.text}</p>
              </motion.div>
            ))}

            {/* Highlighted card (PitchBot's yellow card) */}
            <motion.div
              variants={slideLeft}
              className="bg-[#FFF9DB] border border-yellow-200/60 rounded-2xl p-5 mt-2"
            >
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-yellow-700" />
                <span className="text-[15px] font-semibold text-gray-900">Style Cloning</span>
              </div>
              <p className="text-[13px] text-gray-500 leading-[1.6]">
                Paste any Twitter handle. We scrape 100 tweets, analyze writing patterns
                across 9 dimensions, and create a unique style profile you can write with.
              </p>
            </motion.div>
          </motion.div>

          {/* Right: Chat-style mockup (PitchBot's WhatsApp conversation UI) */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={slideRight}
          >
            <div className="bg-white rounded-[20px] shadow-xl shadow-gray-200/40 border border-gray-100 p-6 relative">
              {/* Floating icons */}
              <motion.div
                className="absolute -top-3 -right-3 w-11 h-11 bg-white rounded-xl shadow-lg shadow-orange-200/40 flex items-center justify-center"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Twitter className="w-5 h-5 text-sky-500" />
              </motion.div>

              {/* Conversation */}
              <div className="space-y-3">
                {/* User message */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-[11px] font-bold shrink-0">B</div>
                  <div className="bg-gray-50 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[80%]">
                    <p className="text-[13px] text-gray-600">Write a tweet about AI replacing jobs</p>
                  </div>
                </div>

                {/* Persona selector */}
                <div className="ml-11 bg-gray-50 rounded-xl p-3">
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">Persona</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { name: 'Authority', active: true },
                      { name: 'Insider', active: false },
                      { name: 'Mentalist', active: false },
                      { name: 'Pure', active: false },
                    ].map((p) => (
                      <span
                        key={p.name}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${
                          p.active
                            ? 'bg-gray-900 text-white'
                            : 'bg-white text-gray-400 border border-gray-100'
                        }`}
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* AI response */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-purple-500 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-purple-50 rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]">
                    <p className="text-[13px] text-gray-700 leading-[1.6] italic">
                      "AI isn't replacing jobs. It's replacing people who refuse to learn AI. The ones who adapt? They'll manage teams of AI agents. Choose your side."
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      <span className="text-[11px] text-gray-400">Authority × Raw</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating WhatsApp-style bottom icon */}
              <motion.div
                className="absolute -bottom-3 right-8 w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full shadow-lg flex items-center justify-center"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              >
                <Flame className="w-4 h-4 text-white" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   5. STATS (PitchBot Image 2 bottom)
   Mountain/sunset gradient bg + glassmorphism cards
   ═══════════════════════════════════════════ */
function Stats() {
  const [count1, ref1] = useCounter(10, 1500);
  const [count2, ref2] = useCounter(5, 1200);
  const [count3, ref3] = useCounter(95, 1800);

  const stats = [
    { value: `${count1}K+`, label: 'Contents Generated', icon: <Monitor className="w-6 h-6" />, ref: ref1 },
    { value: count2.toString(), label: 'AI Personas', icon: <Users className="w-6 h-6" />, ref: ref2 },
    { value: `${count3}%`, label: 'User Satisfaction', icon: <Link2 className="w-6 h-6" />, ref: ref3 },
  ];

  return (
    <section className="relative py-28 px-6 overflow-hidden">
      {/* Mountain/sunset gradient (PitchBot's foggy landscape) */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-orange-50/60 to-purple-100/40" />
        <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-gray-700/20 via-gray-500/10 to-transparent" />
        {/* Cloud layers */}
        <div className="absolute bottom-[30%] left-0 right-0 h-24 bg-gradient-to-t from-white/60 to-transparent blur-sm" />
        <div className="absolute bottom-[20%] left-0 right-0 h-32 bg-gradient-to-t from-white/40 to-transparent blur-md" />
      </div>

      <motion.div
        className="max-w-[1000px] mx-auto text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
      >
        <motion.div variants={fadeUp}>
          <Badge>Numbers</Badge>
        </motion.div>
        <motion.h2
          variants={fadeUp}
          className="mt-5 text-[38px] md:text-[48px] font-bold text-gray-900 leading-[1.1] tracking-[-0.02em]"
        >
          Reliable, Fast,<br />and Proven
        </motion.h2>

        {/* Glassmorphism stat cards */}
        <motion.div
          className="grid md:grid-cols-3 gap-5 mt-14 max-w-[700px] mx-auto"
          variants={stagger}
        >
          {stats.map((s, i) => (
            <motion.div
              key={i}
              ref={s.ref}
              variants={fadeUp}
              className="bg-white/30 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-lg shadow-gray-200/20"
            >
              <div className="w-12 h-12 bg-white/60 rounded-xl flex items-center justify-center mx-auto mb-4 text-gray-400">
                {s.icon}
              </div>
              <div className="text-[40px] font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent leading-tight">
                {s.value}
              </div>
              <div className="text-[13px] text-gray-500 mt-1">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   6. SERVICE / BENTO GRID (PitchBot Image 3 top)
   Badge → Heading → 6 mixed-size bento cards
   ═══════════════════════════════════════════ */
function BentoGrid() {
  return (
    <section id="platforms" className="py-24 px-6 bg-white">
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <Badge>Platforms</Badge>
          <h2 className="mt-5 text-[38px] md:text-[48px] font-bold text-gray-900 leading-[1.1] tracking-[-0.02em]">
            Every tool you need,<br />one platform
          </h2>
          <p className="mt-4 text-[15px] text-gray-400 max-w-[500px] mx-auto">
            Create optimized content for every major platform from a single, powerful dashboard.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          className="grid grid-cols-3 md:grid-cols-6 gap-4 auto-rows-[180px]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
        >
          {/* Card 1: Tall left - 5 AI Personas (spans 2 rows, 2 cols) */}
          <motion.div
            variants={fadeUp}
            className="col-span-3 md:col-span-2 row-span-2 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white relative overflow-hidden group cursor-default"
          >
            <div className="relative z-10">
              <div className="text-[13px] text-gray-400 mb-3">AI Personas</div>
              <h3 className="text-[22px] font-bold leading-tight mb-4">5 Unique<br />Writing Voices</h3>
              <div className="space-y-2">
                {[
                  { name: 'Authority', emoji: '👔', desc: 'Expert & commanding' },
                  { name: 'Insider', emoji: '🔍', desc: 'Industry secrets' },
                  { name: 'Mentalist', emoji: '🧠', desc: 'Psychological hooks' },
                  { name: 'Pure', emoji: '✨', desc: 'Authentic & simple' },
                  { name: 'News', emoji: '📰', desc: 'Breaking updates' },
                ].map((p) => (
                  <div key={p.name} className="flex items-center gap-2.5 bg-white/10 rounded-xl px-3 py-2">
                    <span className="text-[14px]">{p.emoji}</span>
                    <div>
                      <span className="text-[12px] font-medium">{p.name}</span>
                      <span className="text-[11px] text-gray-400 ml-2">{p.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Decorative gradient */}
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-orange-500/20 to-transparent rounded-tl-full" />
          </motion.div>

          {/* Card 2: Tone selector (spans 2 cols) */}
          <motion.div
            variants={fadeUp}
            className="col-span-3 md:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-3">Select Tone</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Natural', icon: '🌿', active: false },
                { name: 'Raw', icon: '🔥', active: true },
                { name: 'Polished', icon: '💎', active: false },
                { name: 'Unhinged', icon: '🤪', active: false },
              ].map((t) => (
                <div
                  key={t.name}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium ${
                    t.active
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  <span>{t.icon}</span> {t.name}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Card 3: Daily conversations stat (spans 2 cols) */}
          <motion.div
            variants={fadeUp}
            className="col-span-3 md:col-span-2 bg-gray-50 rounded-2xl p-5 flex flex-col items-center justify-center text-center"
          >
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5 text-sky-500" />
            </div>
            <div className="text-[32px] font-bold text-gray-900">1M+</div>
            <div className="text-[13px] text-gray-400">Words Generated</div>
          </motion.div>

          {/* Card 4: APEX mode (spans 2 cols) */}
          <motion.div
            variants={fadeUp}
            className="col-span-3 md:col-span-2 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-100/60 relative overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-[14px] font-bold text-gray-900">APEX Mode</span>
            </div>
            <div className="space-y-2">
              {['Maximum viral potential', 'Advanced hook patterns', 'Engagement optimized'].map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-[12px] text-gray-600">{t}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Card 5: All Platforms (spans 2 cols) */}
          <motion.div
            variants={fadeUp}
            className="col-span-3 md:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
          >
            <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-3">All Platforms</div>
            <div className="text-[14px] font-bold text-gray-900 mb-3">6 Platforms, One Click</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: <Twitter className="w-4 h-4" />, bg: 'bg-sky-50 text-sky-500' },
                { icon: <Instagram className="w-4 h-4" />, bg: 'bg-pink-50 text-pink-500' },
                { icon: <Video className="w-4 h-4" />, bg: 'bg-gray-100 text-gray-700' },
                { icon: <Linkedin className="w-4 h-4" />, bg: 'bg-blue-50 text-blue-600' },
                { icon: <Youtube className="w-4 h-4" />, bg: 'bg-red-50 text-red-500' },
                { icon: <BookOpen className="w-4 h-4" />, bg: 'bg-emerald-50 text-emerald-500' },
              ].map((p, i) => (
                <div key={i} className={`w-10 h-10 ${p.bg} rounded-xl flex items-center justify-center mx-auto`}>
                  {p.icon}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   7. STYLE LAB
   PitchBot-style split layout
   ═══════════════════════════════════════════ */
function StyleLab() {
  const dimensions = [
    { name: 'Vocabulary', score: 72 },
    { name: 'Sentence Flow', score: 65 },
    { name: 'Humor Level', score: 95 },
    { name: 'Emoji Usage', score: 78 },
    { name: 'Engagement', score: 97 },
    { name: 'Provocativeness', score: 92 },
  ];

  return (
    <section id="style-lab" className="py-24 px-6">
      <div className="max-w-[1100px] mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left: Style analysis visual */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={scaleIn}
          >
            <div className="bg-white rounded-[20px] shadow-xl shadow-gray-200/40 border border-gray-100 p-6">
              {/* Profile header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-white text-[13px] font-bold">
                  EM
                </div>
                <div className="flex-1">
                  <div className="text-[14px] font-semibold text-gray-900">@elonmusk</div>
                  <div className="text-[12px] text-gray-400">Style Profile Active</div>
                </div>
                <div className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[11px] font-medium flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Analyzed
                </div>
              </div>

              {/* Dimension bars */}
              <div className="space-y-3.5">
                {dimensions.map((d) => (
                  <div key={d.name} className="flex items-center gap-3">
                    <span className="text-[12px] text-gray-400 w-[100px] shrink-0">{d.name}</span>
                    <div className="flex-1 h-[6px] bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-orange-400 to-purple-500 rounded-full"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${d.score}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-[12px] font-semibold text-gray-600 w-[32px] text-right">{d.score}%</span>
                  </div>
                ))}
              </div>

              {/* Insight card */}
              <div className="mt-6 p-4 bg-purple-50/60 rounded-xl border border-purple-100/60">
                <p className="text-[12px] text-purple-600 leading-[1.6]">
                  💡 High engagement with provocative humor. Short, punchy sentences. Best suited for Raw and Unhinged tones.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right: Text content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerSlow}
          >
            <motion.div variants={fadeUp}>
              <Badge>Style Lab</Badge>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="mt-5 text-[38px] md:text-[48px] font-bold text-gray-900 leading-[1.1] tracking-[-0.02em]"
            >
              Clone Any<br />Writing Style
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mt-5 text-[15px] text-gray-400 leading-[1.7] max-w-[420px]"
            >
              Paste a Twitter handle. We analyze 100 tweets across 9 dimensions and create
              a unique style DNA. Write new content that sounds exactly like them.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 space-y-4">
              {[
                'Scrape & analyze 100 recent tweets',
                '9-dimension writing style profiling',
                'Generate content matching any style',
                'Mix styles with different personas & tones',
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-50 rounded-full flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-green-500" />
                  </div>
                  <span className="text-[14px] text-gray-500">{text}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   8. FAQ (PitchBot Image 3 bottom)
   Left: Big heading + Contact us button
   Right: Accordion with +/× icons
   ═══════════════════════════════════════════ */
function FAQ() {
  const [open, setOpen] = useState(1);
  const items = [
    {
      q: 'What is Type Hype?',
      a: 'Type Hype is an AI-powered content creation platform that helps creators generate viral social media content using 5 distinct AI personas, 4 tones, and advanced style cloning technology.'
    },
    {
      q: 'How does Style Cloning work?',
      a: "Paste any Twitter handle and we'll scrape their last 100 tweets. Our AI analyzes writing patterns across 9 dimensions (vocabulary, humor, sentence structure, etc.) to create a unique style profile you can generate content with."
    },
    {
      q: 'Which platforms are supported?',
      a: 'Currently X/Twitter (full support with Tweet, Quote, Reply, Thread, Article), plus Instagram captions, TikTok scripts, LinkedIn posts, YouTube descriptions, and Blog articles.'
    },
    {
      q: 'What are AI Personas?',
      a: 'Five distinct writing characters: Pure (authentic & simple), Authority (expert & commanding), Insider (industry secrets), Mentalist (psychological hooks), and News (breaking updates). Each writes with a unique voice and strategy.'
    },
    {
      q: 'Is it free to use?',
      a: 'We offer a free tier with limited generations per day. Pro plan unlocks unlimited content generation, all personas, full Style Lab access, APEX mode, and priority access to new features.'
    },
  ];

  return (
    <section id="faq" className="py-24 px-6">
      <div className="max-w-[1000px] mx-auto">
        <div className="grid md:grid-cols-5 gap-12">
          {/* Left */}
          <motion.div
            className="md:col-span-2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerSlow}
          >
            <motion.h2
              variants={fadeUp}
              className="text-[36px] md:text-[42px] font-bold text-gray-900 leading-[1.1] tracking-[-0.01em]"
            >
              Frequently<br />Asked<br />Questions
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-[14px] text-gray-400">
              Find answers to common questions.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-6">
              <a
                href="mailto:hello@typehype.io"
                className="inline-flex items-center px-5 py-2.5 bg-gray-900 text-white rounded-full text-[13px] font-medium hover:bg-gray-800 transition-all duration-200"
              >
                Contact us
              </a>
            </motion.div>
          </motion.div>

          {/* Right: Accordion */}
          <motion.div
            className="md:col-span-3 space-y-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            {items.map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="bg-gray-50/80 border border-gray-100 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpen(open === i ? -1 : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-[14px] font-medium text-gray-800 pr-4">{item.q}</span>
                  <div className="w-7 h-7 bg-white rounded-lg border border-gray-100 flex items-center justify-center shrink-0">
                    {open === i ? (
                      <XIcon className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </div>
                </button>
                <AnimatePresence>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 -mt-1">
                        <p className="text-[13px] text-gray-500 leading-[1.7]">{item.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   9. TESTIMONIALS + CTA (PitchBot Image 4)
   Sunset gradient bg + glass orb + floating quote cards
   ═══════════════════════════════════════════ */
function TestimonialsCTA() {
  const testimonials = [
    {
      text: 'Type Hype transformed how I create content. 10x faster with better engagement.',
      name: 'Alex Chen',
      role: 'Content Creator',
      pos: 'top-[15%] left-[5%] md:left-[8%]',
    },
    {
      text: 'The style cloning is insane. It captured my writing voice perfectly.',
      name: 'Sarah Kim',
      role: 'Tech Blogger',
      pos: 'top-[8%] right-[5%] md:right-[8%]',
    },
    {
      text: 'We use Type Hype to generate tweets for our entire marketing team weekly.',
      name: 'David Park',
      role: 'Marketing Lead',
      pos: 'top-[45%] left-[2%] md:left-[5%]',
    },
    {
      text: 'APEX mode is a game changer. Every post gets significantly more engagement.',
      name: 'Emma Liu',
      role: 'Growth Hacker',
      pos: 'top-[42%] right-[2%] md:right-[5%]',
    },
  ];

  return (
    <section className="relative overflow-hidden">
      {/* Sunset/foggy gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-orange-100/50 to-purple-200/40" />
        <div className="absolute bottom-[40%] left-0 right-0 h-[200px] bg-gradient-to-t from-orange-200/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[50%] bg-gradient-to-t from-amber-100/40 via-orange-100/30 to-transparent" />
      </div>

      {/* Testimonials area with orb */}
      <div className="relative pt-16 pb-4 max-w-[1100px] mx-auto px-6 min-h-[500px]">
        {/* Glass orb (center) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-[140px] h-[140px] md:w-[180px] md:h-[180px] rounded-full relative">
            {/* Orb body */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(ellipse at 35% 30%, rgba(180,220,255,0.8), rgba(100,160,220,0.4) 50%, rgba(60,120,200,0.2) 70%, transparent 100%)',
                boxShadow: '0 0 60px rgba(100,160,220,0.3), inset 0 0 40px rgba(200,230,255,0.3)',
              }}
            />
            {/* Highlight */}
            <div
              className="absolute top-[15%] left-[20%] w-[35%] h-[25%] rounded-full"
              style={{
                background: 'radial-gradient(ellipse, rgba(255,255,255,0.8), transparent)',
                filter: 'blur(4px)',
              }}
            />
          </div>
        </div>

        {/* Floating testimonial cards */}
        {testimonials.map((t, i) => (
          <motion.div
            key={i}
            className={`absolute ${t.pos} z-20 max-w-[280px] md:max-w-[300px]`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.15 }}
          >
            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-4 border border-white/70 shadow-lg shadow-gray-200/20">
              <p className="text-[12px] text-gray-600 leading-[1.6] mb-3">"{t.text}"</p>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-[10px] font-bold">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-gray-800">{t.name}</div>
                  <div className="text-[10px] text-gray-400">{t.role}</div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA section */}
      <motion.div
        className="relative z-30 text-center pb-24 px-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
      >
        <motion.h2
          variants={fadeUp}
          className="text-[38px] md:text-[52px] font-bold text-gray-900 leading-[1.1] tracking-[-0.02em]"
        >
          Join the Hype
        </motion.h2>
        <motion.div
          variants={fadeUp}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-[480px] mx-auto"
        >
          <input
            type="email"
            placeholder="Your email address"
            className="w-full sm:flex-1 px-5 py-3 rounded-full border border-gray-200 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 transition-all"
          />
          <button className="w-full sm:w-auto px-7 py-3 bg-gray-900 text-white rounded-full text-[14px] font-medium hover:bg-gray-800 transition-all duration-200 hover:shadow-lg hover:shadow-gray-900/15 shrink-0">
            Get Early Access
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   10. FOOTER (PitchBot Image 4 bottom)
   Logo + 4 column links + social icons + Contact us button
   ═══════════════════════════════════════════ */
function Footer() {
  const columns = [
    { title: 'Product', links: ['Features', 'Platforms', 'Style Lab', 'Pricing'] },
    { title: 'Personas', links: ['Authority', 'Insider', 'Mentalist', 'Pure', 'News'] },
    { title: 'Technology', links: ['APEX Mode', 'Style Cloning', 'Trend Engine'] },
    { title: 'Resources', links: ['Blog', 'Changelog', 'Documentation', 'API'] },
  ];

  return (
    <footer className="bg-white border-t border-gray-100 py-14 px-6">
      <div className="max-w-[1100px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-7 gap-8">
          {/* Logo */}
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-[17px] font-bold text-gray-900">TypeHype</span>
            </div>
            <p className="text-[12px] text-gray-400">© 2026 TypeHype AI.<br />All rights reserved.</p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <div className="text-[13px] font-semibold text-gray-900 mb-4">{col.title}</div>
              <div className="space-y-2.5">
                {col.links.map((link) => (
                  <div key={link} className="text-[13px] text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
                    {link}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Social + CTA */}
          <div>
            <div className="flex gap-3 mb-4">
              {[Twitter, Instagram, Linkedin].map((Icon, i) => (
                <div key={i} className="w-9 h-9 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
              ))}
            </div>
            <a
              href="mailto:hello@typehype.io"
              className="inline-flex items-center px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-[12px] font-medium hover:bg-gray-100 transition-colors"
            >
              Contact us
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center text-[12px] text-gray-400">
          <span>Built with AI, for creators.</span>
          <div className="flex gap-6 mt-2 sm:mt-0">
            <span className="hover:text-gray-600 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-gray-600 cursor-pointer">Terms</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />
      <Hero />
      <Pillars />
      <Technology />
      <Stats />
      <BentoGrid />
      <StyleLab />
      <FAQ />
      <TestimonialsCTA />
      <Footer />
    </div>
  );
}
