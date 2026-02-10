# Orriso-Style XAI Module — Complete Design Specification

## Overview
Type Hype X AI modülü, Orriso.com'un spatial canvas workspace tasarımını birebir takip edecek.
Orriso'nun UI dili, Type Hype'ın içerik üretim akışına uyarlanacak.

## LAYOUT STRUCTURE

### Page-Level Architecture
- **Background**: Warm gray-beige `#B5ADA6` ile blurred canvas ortam (NOT dark, NOT pure white)
- **Layout Model**: Floating panels over blurred background — absolute/fixed positioning
- **Z-Index Layer Stack** (bottom to top):
  1. Layer 0: Blurred warm background (`backdrop-filter: blur(40px)`)
  2. Layer 1: Side panels (sol: Persona kartları, sağ: Stil profili)
  3. Layer 2: Central content area (üretilen içerik gösterimi)
  4. Layer 3: Floating toolbars (content type, length, mode pills)
  5. Layer 4: Prompt input bar (glassmorphic, bottom-center)
  6. Layer 5: Top navigation (existing navbar korunacak)
  7. Layer 6: Utility panels (bottom-left: quick actions, bottom-right: recent/history)

### Critical: NO scrolling form layout. Elemanlar havada yüzecek.

## COLOR PALETTE

| Usage | Hex | Notes |
|-------|-----|-------|
| Page background | `#B5ADA6` | Warm medium gray-beige |
| Central artboard/canvas bg | `#0A0A0A` to `#111111` | Near-black (sonuç alanı) |
| Floating toolbar bg | `#3A3A3A` to `#4A4A4A` | Dark charcoal pills |
| Glassmorphic panels | `rgba(255,255,255,0.12)` | Translucent white |
| Glassmorphic border | `rgba(255,255,255,0.18)` | Faint white |
| Card backgrounds | Various warm tones | See persona cards |
| Text primary | `#FFFFFF` | On dark surfaces |
| Text secondary | `#9CA3AF` | Muted |
| Accent gradient | violet-to-fuchsia | Brand accent |

## GLASSMORPHISM SPEC

### Standard Glass Panel
```css
background: rgba(255, 255, 255, 0.12);
backdrop-filter: blur(40px);
-webkit-backdrop-filter: blur(40px);
border: 1px solid rgba(255, 255, 255, 0.18);
border-radius: 24px;
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1);
```

### Light Glass (toolbars)
```css
background: rgba(245, 242, 239, 0.9);
backdrop-filter: blur(12px);
border-radius: 50px;
border: 1px solid rgba(0, 0, 0, 0.08);
box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
```

## COMPONENT MAPPING: Orriso → Type Hype

| Orriso Component | Type Hype Equivalent | Position |
|---|---|---|
| Top Nav Bar | Existing TypeHype navbar | Top (keep as-is) |
| Canvas/Artboard (center) | Generated results display | Center |
| Prompt Bar (bottom-center) | Topic input + generate | Bottom center, floating |
| AI Agent Cards (bottom-left) | Persona cards (Saf, Otorite, Insider, Mentalist, Haber) | Bottom-left floating panel |
| Floating Toolbars (top-center) | Content type (Tweet/Alıntı/Yanıt/Makale), Mode (Klasik/APEX), Length | Top area, floating pills |
| Image Gallery (left sidebar) | Style profile / reference | Left side |
| Files Panel (bottom-right) | Recent generations / favorites mini panel | Bottom-right |
| Typography toolbar | Tone selector (Natural/Raw/Polished/Unhinged) | Floating near center |

## PROMPT BAR (Bottom Center) — Most Important Component

### Container
- Width: ~50% of viewport (min 480px, max 600px)
- Position: fixed bottom center, `bottom: 32px`
- Border-radius: 24px
- Full glassmorphism (blur 40px, rgba(255,255,255,0.12))
- **Rainbow gradient bottom border**: 2-3px height accent
  ```css
  border-image: linear-gradient(90deg, #4CAF50, #8BC34A, #FFEB3B, #FF9800, #F44336, #E91E63, #9C27B0, #2196F3, #00BCD4) 1;
  /* OR use ::after pseudo-element */
  ```

### Inner Layout
- **Top section**: Reference thumbnails (if image attached) — small rounded squares
- **Middle**: Textarea — white text, placeholder `#9CA3AF`, font-size 15px
- **Bottom row**: 
  - Left: `+` button, `⚡` (APEX toggle), `📎 Image`, `🎬 Video` buttons
  - Right: 🎤 voice, ↗ send button (gradient bg)
- **Character count**: "0/280 · Punch · 3 varyant" at bottom-left of input
- **Hint text**: "Enter ile üret · Shift+Enter satır" at bottom-right

### Send Button
- Circular, 40px diameter
- Background: gradient `from-violet-500 to-fuchsia-500`
- Icon: Arrow-right, white, 18px
- Hover: scale 1.05, brighter

## PERSONA CARDS (Bottom-Left Panel) — AI Agent Equivalent

### Panel Container
- Position: fixed bottom-left, `bottom: 32px, left: 32px`
- Size: ~250px × ~150px
- Glassmorphism (same as standard glass panel)
- Title: "Karakter" — white, 14px, font-weight 600

### Card Grid
- 2×2 grid (or 2×3 if 5 personas, last centered)
- Gap: 8px
- Card size: ~110px × 44px
- Border-radius: 12px

### Individual Card Colors (Orriso-style warm tones):
| Persona | Background Color | Emoji |
|---------|-----------------|-------|
| Saf | `#E88B9C` (warm pink) | 💗 |
| Otorite | `#D4A854` (warm amber/gold) | 👔 |
| Insider | `#5B8A5E` (forest green) | 🤫 |
| Mentalist | `#7B6BAA` (muted purple) | 🔮 |
| Haber | `#C45A4A` (warm red-orange) | 📢 |

- Selected state: brighter, slight scale(1.05), shadow
- Unselected: slightly transparent (opacity 0.7)

## FLOATING TOOLBARS (Top Area)

### Content Type Bar
- Position: top-center, below navbar ~20px
- Style: Dark charcoal pill (`#3A3A3A`, border-radius 50px)
- Items: Tweet | Alıntı | Yanıt | Makale
- Selected: white bg, black text
- Unselected: white/60 text
- Height: 44px, padding: 4px

### Mode + Length + Variants Bar
- Position: below content type bar, ~12px gap
- Style: Same dark pill
- Layout: [Klasik | ⚡ APEX] ··· [T Length ▾] ··· [− 3 +] ··· [⚙ Settings]
- Keyboard shortcut badges: Small `K` `A` letters in rounded squares beside items

### Tone Selector
- Floating pill, positioned right side of center area
- Same dark charcoal style
- Items: Natural | Raw | Polished | Unhinged

## CENTRAL CANVAS (Results Area)

### When Empty (EmptyState)
- Central artboard area with subtle dark surface
- Sparkle icon centered, violet glow
- "İçerik üretmeye hazır" text
- Subtle radial gradient behind icon

### When Results Exist
- Results display as floating cards within the canvas
- Each card: glassmorphism, white text
- Card actions (copy, favorite) appear on hover
- Cards can overlap/layer slightly for depth

## RIGHT PANEL (Style Profile / Reference)

### Panel Container  
- Position: fixed right, `right: 32px, top: 50%`
- Size: ~200px × variable
- Glassmorphism

### Content
- Active style profile thumbnail
- Profile name + source
- "Profil Seç" button
- Quick style stats

## BOTTOM-RIGHT PANEL (Recent/History)

### Panel Container
- Position: fixed bottom-right, `bottom: 32px, right: 32px`
- Size: ~260px × ~120px
- Glassmorphism

### Content
- "Son Üretimler" title
- 2 small thumbnail/text preview cards
- Click to expand/view

## TYPOGRAPHY

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Panel titles | System/Inter | 14px | 600 | #FFFFFF |
| Card text | System/Inter | 12-13px | 500 | #FFFFFF |
| Prompt input | System/Inter | 15px | 400 | #FFFFFF |
| Prompt placeholder | System/Inter | 15px | 400 | #9CA3AF |
| Toolbar items | System/Inter | 14px | 500 | #FFFFFF/60 |
| Toolbar selected | System/Inter | 14px | 600 | #000000 (on white bg) |
| Empty state heading | System/Inter | 20px | 600 | #FFFFFF/80 |
| Empty state body | System/Inter | 14px | 400 | #FFFFFF/40 |
| Keyboard shortcuts | Mono/System | 11px | 500 | #FFFFFF/40 |

## SPACING SYSTEM
- Base unit: 8px
- Panel padding: 16px
- Gap between floating elements: 12-16px
- Edge margin from viewport: 32px
- Card gap in grids: 8px
- Toolbar item padding: 12px 16px

## SHADOWS
- Floating panels: `0 8px 32px rgba(0, 0, 0, 0.25)`
- Toolbars: `0 4px 24px rgba(0, 0, 0, 0.15)`
- Inner highlight: `inset 0 1px 0 rgba(255, 255, 255, 0.1)`
- Send button: `0 4px 12px rgba(139, 92, 246, 0.4)`

## ANIMATIONS
- Panel hover: `transform: scale(1.02)` over 200ms
- Card select: `transform: scale(1.05)` over 150ms  
- Prompt bar focus: border opacity increase + slight glow
- Results enter: `opacity 0→1, translateY(20→0)` stagger 100ms
- Toolbar transitions: 200ms ease-out

## RESPONSIVE
- Viewport < 1200px: Side panels collapse to icons
- Viewport < 900px: Stack to mobile layout (prompt bar still bottom)
- Panels become drawers on mobile

## IMPLEMENTATION NOTES
- Use CSS `position: fixed` for floating panels (NOT flexbox column layout)
- Background: single div with gradient + blur
- Each panel is independent, draggable in future
- Keep existing auth, API calls, profile context from XAIModule
- All generation logic stays same, only UI changes
- Navbar (top) stays as-is, don't touch it
