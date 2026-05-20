<div align="center">

# 🎯 Bulls & Cows
### A competitive real-time gaming platform

[![CI](https://github.com/lazycoder-git/bulls-and-cows/actions/workflows/ci.yml/badge.svg)](https://github.com/lazycoder-git/bulls-and-cows/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-white?logo=fastify&logoColor=black)](https://fastify.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Play the classic number guessing game against real opponents — with ELO ratings, daily puzzles, tournaments, and live multiplayer.**

[Live Demo](#) · [Report Bug](https://github.com/lazycoder-git/bulls-and-cows/issues) · [Request Feature](https://github.com/lazycoder-git/bulls-and-cows/issues)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎮 **Solo Play** | Practice against the AI at your own pace |
| ⚔️ **Real-Time Multiplayer** | Challenge opponents live via WebSocket rooms |
| 🏆 **ELO Rating System** | Competitive matchmaking with dynamic rank labels (Novice → Legend) |
| 🧩 **Daily Puzzles** | Wordle-style puzzle that resets every day — track your streak |
| 🎯 **One-Shot Puzzles** | Short burst challenges for quick sessions |
| 🏅 **Tournaments** | Round-robin bracket tournaments with scheduling |
| 📊 **Leaderboard** | Global rankings backed by Redis sorted sets |
| 👤 **Google OAuth** | Seamless sign-in with profile, stats, and rating history |
| 🔒 **Secure API** | Helmet, rate limiting, JWT auth, CORS whitelist |

---

## 🏗️ Architecture

```
BnC/
├── apps/
│   ├── web/              # Next.js 15 frontend (App Router)
│   │   ├── src/app/      # 16 routes: play, puzzles, rooms, tournaments…
│   │   ├── src/components/
│   │   └── src/lib/      # API client, socket client, state hooks
│   │
│   └── server/           # Fastify 5 backend API + WebSocket
│       ├── src/modules/  # auth │ game │ user │ leaderboard │ puzzle │ admin │ tournament │ multiplayer
│       ├── src/config/   # Redis (Upstash)
│       └── prisma/       # PostgreSQL schema (Neon)
│
├── packages/
│   └── shared/           # Types, game engine, ELO calculator — shared between apps
│
└── .github/workflows/    # CI/CD (typecheck → build → deploy)
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, TypeScript, Vanilla CSS |
| **Backend** | Fastify 5, Socket.IO, TypeScript |
| **Database** | PostgreSQL via [Neon](https://neon.tech) (serverless) |
| **Cache / Realtime** | Redis via [Upstash](https://upstash.com) (serverless) |
| **Auth** | NextAuth.js (Google OAuth) + Fastify JWT |
| **ORM** | Prisma 6 |
| **Monorepo** | pnpm workspaces + Turborepo |
| **CI/CD** | GitHub Actions → Vercel + Railway |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/installation)
- A [Neon](https://neon.tech) account (free PostgreSQL)
- An [Upstash](https://upstash.com) account (free Redis)
- A [Google Cloud](https://console.cloud.google.com/) project with OAuth credentials

### 1. Clone & Install

```bash
git clone https://github.com/lazycoder-git/bulls-and-cows.git
cd bulls-and-cows
pnpm install
```

### 2. Configure Environment

**Backend** — copy and fill in `apps/server/.env`:

```env
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379
JWT_SECRET=your-64-char-random-string
JWT_EXPIRES_IN=7d
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

**Frontend** — copy and fill in `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-32-char-random-string
```

### 3. Push Database Schema

```bash
cd apps/server
pnpm prisma db push
```

### 4. Run Locally

```bash
# Terminal 1 — Backend (port 4000)
cd apps/server && pnpm dev

# Terminal 2 — Frontend (port 3000)
cd apps/web && pnpm dev
```

Open **http://localhost:3000** 🎉

---

## 🔄 CI/CD Pipeline

Every push triggers a GitHub Actions workflow:

```
push to main / PR
       │
       ▼
  TypeScript Check  ──── fails? → ❌ blocked
  (server + web)
       │
       ▼
   Build Test       ──── fails? → ❌ blocked
  (server + web)
       │
       ▼
  ┌────┴────┐
  ▼         ▼
Railway   Vercel
(server)  (web)
```

### Required GitHub Secrets

Set these in **Settings → Secrets → Actions**:

| Secret | Description |
|--------|-------------|
| `RAILWAY_TOKEN` | From [railway.app](https://railway.app) → Account → Tokens |
| `VERCEL_TOKEN` | From [vercel.com](https://vercel.com) → Settings → Tokens |
| `VERCEL_ORG_ID` | From `vercel env ls` or Vercel dashboard |
| `VERCEL_PROJECT_ID` | From your Vercel project settings |
| `NEXT_PUBLIC_API_URL` | Production backend URL |
| `NEXT_PUBLIC_WS_URL` | Production WebSocket URL |
| `NEXTAUTH_SECRET` | Production NextAuth secret |
| `NEXTAUTH_URL` | Production frontend URL |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

---

## 🌐 Deployment

### Frontend → Vercel (recommended)
1. Connect your GitHub repo at [vercel.com/new](https://vercel.com/new)
2. Set **Root Directory** to `apps/web`
3. Add all `NEXT_PUBLIC_*`, `NEXTAUTH_*`, and `GOOGLE_*` environment variables
4. Deploy — Vercel auto-deploys on every push to `main`

### Backend → Railway (recommended)
1. Create a new project at [railway.app](https://railway.app)
2. Connect your GitHub repo
3. Add all server environment variables (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, etc.)
4. Railway reads `railway.json` and deploys automatically

---

## 🎮 Game Rules

**Bulls & Cows** is a code-breaking number game:

1. A secret **4-digit number** is chosen (all digits unique, no leading zero)
2. You make guesses — each guess returns:
   - 🐂 **Bulls** — correct digit in the correct position
   - 🐄 **Cows** — correct digit in the wrong position
3. Guess `4 Bulls` to win!

**Example:**
```
Secret:  1 3 7 2
Guess:   1 4 2 3
Result:  1 Bull (1), 2 Cows (3, 2)
```

---

## 📡 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | ─ | Server health check |
| `POST` | `/api/auth/token` | ─ | Exchange NextAuth userId for JWT |
| `POST` | `/api/games/solo` | ✅ | Start a solo game |
| `POST` | `/api/games/guess` | ✅ | Submit a guess |
| `POST` | `/api/games/room` | ✅ | Create a multiplayer room |
| `POST` | `/api/games/room/:code/join` | ✅ | Join a room |
| `GET` | `/api/leaderboard` | ─ | Global rankings |
| `GET` | `/api/leaderboard/me` | ✅ | Your rank and stats |
| `GET` | `/api/puzzle/daily` | ✅ | Today's daily puzzle |
| `GET` | `/api/users/me` | ✅ | Your profile |

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push and open a PR: `git push origin feat/amazing-feature`

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ❤️ using Next.js, Fastify, Neon, and Upstash

</div>
