# Japanese Vocabulary SRS Platform — Full Rebuild Implementation Plan

## Overview

A complete rebuild of the existing Django/SQLite application into a modern, decoupled full-stack platform. The new system is **strictly vocabulary memorization** using AI + SRS — not a general Japanese learning course.

**Target workspace:** `c:\Users\user\Desktop\co`

---

## Tech Stack Decision

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | **Next.js 14 (App Router) + TypeScript** | SSR, file-based routing, API routes |
| Styling | **Tailwind CSS + Shadcn/UI** | Rapid, consistent component system |
| Animations | **Framer Motion** | Gamified micro-animations |
| Backend | **Node.js + Express.js (TypeScript)** | REST API, middleware, flexibility |
| Database | **PostgreSQL + Prisma ORM** | Relational, type-safe, migration-friendly |
| Auth | **JWT (access + refresh tokens)** | Stateless, role-based |
| Jobs | **node-cron** | Weekly league processing |
| LLM | **Google Gemini API** | AI Chatbot for vocabulary practice |
| TTS | **Microsoft Edge TTS (edge-tts via HTTP)** | Free, high-quality Japanese voices |
| Package Mgr | **pnpm** workspaces monorepo | Shared types between frontend/backend |

---

## Project Structure

```
c:\Users\user\Desktop\co\
├── packages/
│   └── shared/           # Shared TypeScript types & constants
├── apps/
│   ├── backend/          # Express.js API server
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── services/
│   │   │   ├── jobs/       # node-cron weekly league job
│   │   │   └── prisma/     # schema.prisma + seed.ts
│   │   └── package.json
│   └── frontend/         # Next.js app
│       ├── app/
│       │   ├── (auth)/     # Login, Register pages
│       │   ├── dashboard/
│       │   ├── dictionary/
│       │   ├── games/
│       │   ├── profile/
│       │   ├── leaderboard/
│       │   ├── chat/
│       │   ├── tools/      # Pomodoro, Alifbo
│       │   └── admin/      # Admin panel
│       └── package.json
└── package.json           # pnpm workspace root
```

---

## Database Schema (Prisma)

### Core Tables
- **Users** — id, username, email, password_hash, role (USER/ADMIN), created_at
- **Profiles** — 1:1 with User; streak, last_login_date, coins, xp, league (BRONZE→DIAMOND), daily_test_count, daily_match_count, daily_write_count, last_game_date
- **Books** — id, title, description, image_url, created_at
- **Topics** — id, name, book_id (nullable FK → global topics)
- **Words** — id, japanese_word, hiragana, meaning, example_sentence, example_translation, author_id (FK → User)

### Junction & Progress Tables
- **WordTopics** — word_id, topic_id (M:M)
- **SavedWords** — user_id, word_id, saved_at
- **SavedBooks** — user_id, book_id, saved_at
- **UserWordProgress** — user_id, word_id, xp (0-4), level (1-5), next_review_date, last_reviewed_at

### Gamification Tables
- **WeeklyStats** — user_id, start_date, end_date, words_learned, games_played, correct_answers, total_questions, coins_earned, xp_earned
- **Badges** — id, name, description, icon, color, badge_type (STREAK/WORDS/GAMES/etc.), threshold
- **UserBadges** — user_id, badge_id, earned_at
- **LeagueLog** — id, processed_at, week_start, promotions_count, demotions_count, details_json
- **GameSessions** — id, user_id, word_ids (JSON), game_type, created_at, completed (anti-cheat)
- **SiteConfiguration** — id, key, value (key-value store for admin settings)

---

## API Routes Architecture

### Auth Routes (`/api/auth`)
- `POST /register` — Create user + profile
- `POST /login` — Returns JWT access + refresh tokens; triggers streak logic
- `POST /refresh` — Refresh access token
- `GET /me` — Current user + profile

### Vocabulary Routes (`/api`)
- `GET /books` — List all books (paginated)
- `POST /books` — [ADMIN] Create book
- `GET /books/:id/topics` — Topics in a book
- `GET /topics` — All global topics
- `GET /words` — Paginated + searchable word list (query: search, topic, book)
- `POST /words` — [ADMIN] Create word
- `POST /words/:id/save` — Toggle save/unsave word
- `GET /words/:id` — Word detail
- `GET /users/me/saved-words` — User's personal dictionary

### Game Routes (`/api/games`)
- `GET /session` — Generate game session (returns session_id + words, stores in DB)
- `POST /submit` — Submit answers; backend scores, updates SRS + WeeklyStats, awards badges; returns XP/coins earned

### Admin Routes (`/api/admin`)
- `GET/PUT /config` — Site configuration (LLM key, etc.)
- `POST /upload/words` — Bulk CSV/Excel upload (global)
- `POST /upload/book-words` — Bulk upload tied to specific book+topic
- `GET /users` — List users
- `PUT /users/:id/role` — Promote/demote user role
- `GET /stats` — Platform-wide statistics

### Utility Routes (`/api`)
- `POST /chat` — Streams Gemini LLM response (vocabulary-constrained system prompt)
- `GET /tts?text=...&lang=ja` — Returns audio buffer from Edge TTS
- `GET /leaderboard` — Current week league rankings
- `GET /users/me/badges` — User's earned badges
- `GET /users/me/progress` — SRS due-today words, level breakdown

---

## Core Business Logic

### Streak & Daily Reset (on login)
```
1. Get profile.last_login_date
2. If yesterday → streak++ 
3. If today → no change
4. If older/null → streak = 1 (reset)
5. If last_game_date != today → reset daily_*_count to 0
6. Save profile
```

### SRS Engine (on game submit)
```
For each word in session:
  if correct:
    progress.xp++
    if progress.xp >= threshold → progress.level++, progress.xp = 0
    next_review = now + SRS_INTERVALS[level]
  else:
    progress.level = max(1, level - 1)
    progress.xp = 0
    next_review = now (immediate review)

SRS_INTERVALS = [1min, 1day, 3days, 7days, 14days] (levels 1-5)
```

### Anti-Cheat Game Flow
```
1. Client: GET /api/games/session?type=test&topic_id=X&limit=20
2. Server: Picks words, stores GameSession{id, user_id, word_ids, game_type}
3. Client: Plays game locally with received words
4. Client: POST /api/games/submit {session_id, answers: [{word_id, answer}]}
5. Server: Validates session belongs to user, is not completed, grades answers
6. Server: Marks session completed, updates SRS, WeeklyStats, badges
7. Server: Returns {xp_earned, coins_earned, accuracy, badges_earned, srs_updates}
```

### Weekly League Cron Job (Every Monday 00:00)
```
1. Lock processing (check LeagueLog for this week)
2. For each league tier (BRONZE → DIAMOND):
   a. Fetch all users in this league with WeeklyStats for this week
   b. Sort by (coins_earned + xp_earned * 2)
   c. Top 20% → promote to next league
   d. Bottom 20% (min league = BRONZE) → demote
3. Create new WeeklyStats records for next week
4. Write LeagueLog entry
```

### Badge Evaluation (after game/save actions)
Badge types with thresholds checked dynamically:
- STREAK_X (streak >= threshold)
- WORDS_SAVED_X (saved words count >= threshold)
- GAMES_PLAYED_X (total games >= threshold)
- PERFECT_GAME (100% accuracy in session)
- MASTER_WORDS_X (words at level 5 >= threshold)

---

## Frontend Pages

### Layout & Navigation
- Persistent NavBar with: Home, Dictionary, Games, Profile, Leaderboard, Chat, Tools
- NavBar shows: coin balance 🪙, current streak 🔥, user avatar
- Dark mode by default (deep space theme to match Space Shooter aesthetic)

### Pages
| Route | Page |
|---|---|
| `/` | Landing / Dashboard (stats, quick-start, streak) |
| `/auth/login` | Login form |
| `/auth/register` | Register form |
| `/dictionary` | Browse Books grid |
| `/dictionary/[bookId]` | Topics in book |
| `/dictionary/words` | Paginated word list with search + save toggle + TTS |
| `/games` | Game hub (4 game cards) |
| `/games/test` | Multiple Choice (Setup → Play → Results) |
| `/games/match` | Matching Pairs (Setup → Play → Results) |
| `/games/write` | Typing Practice (Setup → Play → Results) |
| `/games/shooter` | Space Shooter (direct play) |
| `/profile` | User stats, badge showcase, SRS breakdown |
| `/leaderboard` | League rankings table |
| `/chat` | AI Chatbot bubble interface |
| `/tools/pomodoro` | Pomodoro timer |
| `/tools/alifbo` | Hiragana/Katakana reference grid |
| `/admin` | Admin dashboard |
| `/admin/upload` | Bulk CSV/Excel upload tool |
| `/admin/config` | Site configuration editor |
| `/admin/users` | User management |

---

## Gamification & Visual Design

### Color Theme (Dark Mode)
- Background: `#0a0a1a` (deep space)
- Primary: `#6d28d9` (violet)
- Accent: `#f59e0b` (amber/gold for coins)
- Success: `#10b981` (emerald)
- Danger: `#ef4444` (red)
- League colors: Bronze `#cd7f32`, Silver `#c0c0c0`, Gold `#ffd700`, Platinum `#e5e4e2`, Diamond `#b9f2ff`

### Animations (Framer Motion)
- XP bar filling animation on game result
- Coin shower particle effect on completion
- Card flip animation for Matching game
- Space Shooter: canvas-based with requestAnimationFrame
- Streak flame pulsing animation in NavBar
- Badge unlock modal with scale + glow effect

---

## Implementation Phases

### Phase 1 — Backend Foundation
- [x] Init monorepo (pnpm workspaces)
- [x] Initialize Express.js backend with TypeScript
- [x] Set up Prisma schema + PostgreSQL connection
- [x] Run migrations, create seed (admin user + default badges)
- [x] JWT auth middleware (access + refresh tokens)
- [x] Role-based middleware (requireAuth, requireAdmin)

### Phase 2 — Core APIs
- [x] Auth routes (register, login, refresh, /me)
- [x] Books, Topics, Words CRUD routes
- [x] Save/Unsave word functionality
- [x] User profile & progress routes

### Phase 3 — Gamification Engine
- [x] Game session generation endpoint (anti-cheat)
- [x] Game submission + SRS scoring endpoint
- [x] Badge evaluation service
- [x] Weekly stats update logic
- [x] node-cron weekly league job

### Phase 4 — Admin Panel
- [x] Admin routes (users, config, stats)
- [x] CSV/Excel parser (multer + xlsx library)
- [x] Bulk word upload (global)
- [x] Bulk book-word upload

### Phase 5 — Utility Services
- [x] Gemini AI chat endpoint (streaming, vocabulary-locked system prompt)
- [x] Edge TTS endpoint

### Phase 6 — Frontend Shell
- [x] Next.js init + Tailwind + Shadcn setup
- [x] Global layout (NavBar, Footer)
- [x] Auth context + JWT storage (httpOnly cookie approach)
- [x] Dashboard page

### Phase 7 — Dictionary UI
- [x] Books grid page
- [x] Topic list page
- [x] Word list page (search, pagination, save, TTS)

### Phase 8 — Games UI
- [x] Game hub page
- [x] Multiple Choice game (3-step flow)
- [x] Matching Pairs game (3-step flow)
- [x] Typing game (3-step flow)
- [x] Space Shooter game (canvas)

### Phase 9 — Profile, Leaderboard, Tools
- [x] Profile page (stats, badges, SRS progress)
- [x] Leaderboard page (league filter, weekly rankings)
- [x] AI Chat page (SSE streaming, TTS button)
- [x] Pomodoro timer
- [x] Alifbo/Kana reference grid

### Phase 10 — Admin UI
- [x] Admin dashboard (platform stats, league distribution)
- [x] User management table (search, promote/demote, delete)
- [x] Bulk upload interface (drag-and-drop, 207 multi-status display)
- [x] Site configuration editor (known keys, sensitive toggle, add custom)

---

## Open Questions

> [!IMPORTANT]
> **Database Host**: Do you have a local PostgreSQL instance running, or should I use Docker Compose to spin one up? If Docker, I will include a `docker-compose.yml`.

> [!IMPORTANT]
> **Google Gemini API Key**: Do you have a Gemini API key ready? If not, I can stub the endpoint and make it configurable via the Admin panel (it already is per the schema design). The AI chat will still work once you provide the key.

> [!IMPORTANT]
> **Port / Deployment**: Should the app run locally only for now? I'll default to `backend: 4000`, `frontend: 3000`.

> [!WARNING]
> **Existing Django data**: Should we include a migration/import script to pull word data from your existing SQLite database into the new PostgreSQL schema? This would allow you to preserve all your current vocabulary without re-importing.

> [!NOTE]
> **Space Shooter**: This will be rebuilt as a Canvas-based game. The existing Python/Django views for this game will be replaced with a fully client-side JavaScript canvas implementation linked to the secure backend scoring API.

---

## Verification Plan

### Automated
- `prisma migrate dev` — validates schema integrity
- Backend startup health check endpoint `GET /api/health`
- Test game session → submit flow with Postman/curl

### Browser Testing
- Auth flow (register → login → dashboard)
- Dictionary browse → save word
- Game setup → play → results → profile XP update
- Admin upload CSV → words appear in dictionary
- AI Chat sends/receives messages
