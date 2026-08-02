# VocabJP / EduJP

Japanese vocabulary learning platform — spaced repetition, games, leagues and an
AI practice partner. Interface language: Uzbek.

| Package | Stack | Notes |
| --- | --- | --- |
| `apps/backend` | Express + Prisma + PostgreSQL | REST API, Telegram bot, cron jobs |
| `apps/frontend` | Next.js 14 (App Router) + Tailwind | main web app |
| `apps/mobile` | Expo 54 + React Native 0.81 | EasyNihongo |
| `apps/mobile2` | Expo Router | VocabCards (early scaffold) |
| `packages/shared` | TypeScript types | shared API contracts |

## Setup

```bash
pnpm install
docker compose up -d
cp apps/backend/.env.example apps/backend/.env   # then fill in the values
pnpm --filter backend db:migrate
pnpm --filter backend db:seed
```

Run the apps:

```bash
pnpm dev:backend
pnpm dev:frontend
pnpm dev:mobile
```

## Deployment

Credentials live in `.env.deploy` (gitignored — copy `.env.deploy.example`).
Never hardcode server passwords, bot tokens or API keys in scripts.

```bash
pnpm deploy
```

Run a one-off command on the server:

```bash
pnpm remote "pm2 logs vocabjp-backend --lines 100 --nostream"
```

## Monorepo notes

### React versions are pinned at the root — do not remove

The root `package.json` pins `react` and `react-dom` to **18.3.1**.

`.npmrc` uses `node-linker=hoisted` (React Native's native build scripts need a
flat `node_modules`), so only one version of each package can sit at the root.
The web apps need React 18 while React Native 0.81 needs React 19. Without the
pin, pnpm hoisted `react@19` (from mobile) next to `react-dom@18` (from the
frontend), and `next build` crashed with
`Cannot read properties of null (reading 'useRef')` while prerendering the
`/404` and `/500` pages.

With the pin, the root holds a matching React 18 pair and `apps/mobile` gets its
own nested `react@19.1.0`, which Metro resolves correctly.

### Answer grading is duplicated on purpose

`apps/backend/src/utils/answerCheck.ts`, `apps/frontend/lib/answerCheck.ts` and
`apps/mobile/src/utils/answerCheck.ts` are identical copies. The games show
instant feedback before submitting, so the client must reach the same verdict as
the server. Change all three together.
