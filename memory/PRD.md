# ContentFactory PRD

## Original Problem Statement
Create a complete content generation platform called "ContentFactory" with a modern, sleek design similar to ContentOS. Turkish language UI with:
- Left sidebar navigation (6 modules)
- X AI module fully functional (Tweet, Quote, Reply, Article tabs)
- Other modules as placeholders
- Dark/Light mode support
- OpenAI integration for content generation

## User Personas
- Content creators
- Social media managers
- Digital marketers
- Influencers needing AI-powered content

## Core Requirements (Static)
- Turkish language UI
- Dark mode default
- Module-specific color themes
- OpenAI GPT integration
- No authentication (for now)
- No credit system

## What's Been Implemented (Jan 27, 2025)

### Frontend
- ✅ SidebarLayout with navigation for 6 modules
- ✅ ThemeProvider with Dark/Light mode toggle
- ✅ X AI Module (fully functional):
  - Tweet tab: Klasik/APEX modes, length selector, variant counter, persona/tone/language chips
  - Quote tab: URL input, tweet preview, generation
  - Reply tab: URL input, reply modes (Support/Challenge/Question/Expand/Joke)
  - Article tab: Title, topic, length, style, reference links
- ✅ YouTubeAI placeholder page
- ✅ InstaFlow AI placeholder page
- ✅ TikTrend AI placeholder page
- ✅ LinkShareAI placeholder page
- ✅ Blog Architect placeholder page
- ✅ Settings modal
- ✅ Module-specific accent colors

### Backend
- ✅ FastAPI server with /api prefix
- ✅ POST /api/generate/tweet
- ✅ POST /api/generate/quote
- ✅ POST /api/generate/reply
- ✅ POST /api/generate/article
- ✅ GET /api/generations/history
- ✅ GET /api/health
- ✅ MongoDB integration for saving generations

## Prioritized Backlog

### P0 (Critical)
- [ ] User adds OPENAI_API_KEY to /app/backend/.env

### P1 (Next Phase)
- [ ] YouTubeAI module full implementation
- [ ] InstaFlow AI module full implementation
- [ ] TikTrend AI module full implementation
- [ ] LinkShareAI module full implementation
- [ ] Blog Architect module full implementation

### P2 (Future)
- [ ] User authentication (JWT or Google OAuth)
- [ ] Credit system for tracking usage
- [ ] Generation history page
- [ ] Export/download generated content
- [ ] Scheduled posts feature
- [ ] Team collaboration

## Next Tasks
1. User to add OPENAI_API_KEY
2. Test content generation with real API
3. Implement YouTubeAI module (SEO analysis, script generation)
4. Implement remaining modules one by one
