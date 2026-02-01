# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Possumbly** is a self-hosted meme creation platform with OAuth authentication, invite-code access control, and a full-featured canvas-based meme editor.

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Database**: SQLite via sql.js (WebAssembly-based, no native dependencies)
- **Auth**: Passport.js (Google, GitHub, Discord OAuth)
- **Meme Editor**: Konva.js (React-Konva)
- **Security**: Helmet.js, express-rate-limit
- **Deployment**: Docker

## Commands

### Development
```bash
npm install              # Install all dependencies
npm run dev              # Start both server and web in dev mode
npm run dev:server       # Start only the backend server
npm run dev:web          # Start only the frontend
```

### Build & Production
```bash
npm run build            # Build both packages
npm run start            # Start production server
```

### Linting & Formatting
```bash
npm run lint             # Run ESLint on all packages
npm run format           # Format code with Prettier
npm run format:check     # Check formatting without changes
```

### Docker
```bash
docker build -t possumbly .                    # Build production image
docker-compose up                               # Run with docker-compose
docker-compose -f docker-compose.dev.yml up    # Run development container
```

### Utility Scripts
```bash
npx tsx scripts/import-templates.ts    # Import meme templates from imgflip
npx tsx scripts/check-db.ts            # Check database contents
```

## Project Structure

```
/
├── packages/
│   ├── server/                    # Express backend
│   │   ├── src/
│   │   │   ├── index.ts           # Server entry point
│   │   │   ├── db/schema.ts       # SQLite schema & queries (sql.js)
│   │   │   ├── config/passport.ts # OAuth strategies
│   │   │   ├── middleware/auth.ts # Auth guards (isAuthenticated, hasInvite, isAdmin)
│   │   │   └── routes/
│   │   │       ├── auth.ts        # OAuth routes (/auth/*)
│   │   │       ├── admin.ts       # Admin API (/api/admin/*)
│   │   │       ├── invites.ts     # Invite codes (/api/invites/*)
│   │   │       ├── templates.ts   # Templates CRUD (/api/templates/*)
│   │   │       └── memes.ts       # Memes CRUD (/api/memes/*)
│   │   └── data/                  # SQLite database & uploads (gitignored)
│   │
│   └── web/                       # React frontend
│       └── src/
│           ├── App.tsx            # Router setup with protected routes
│           ├── contexts/AuthContext.tsx  # Auth state management
│           ├── lib/api.ts         # API client with typed endpoints
│           ├── pages/
│           │   ├── Login.tsx      # OAuth login buttons
│           │   ├── RedeemInvite.tsx # Invite code entry + bootstrap
│           │   ├── Templates.tsx  # Template gallery with upload
│           │   ├── Editor.tsx     # Konva.js meme editor
│           │   ├── MyMemes.tsx    # User's saved memes
│           │   └── Admin.tsx      # Admin panel (invites, users, stats)
│           └── components/
│               └── Layout.tsx     # Navigation header
│
├── scripts/
│   ├── import-templates.ts        # Scrape & import templates from imgflip
│   └── check-db.ts                # Database inspection utility
│
├── docker/
├── Dockerfile                     # Production multi-stage build
├── Dockerfile.dev                 # Development with hot reload
├── docker-compose.yml             # Production compose config
├── docker-compose.dev.yml         # Development compose config
└── package.json                   # Workspace root
```

## Key Patterns & Architecture

### Authentication Flow
1. User clicks OAuth button → redirects to provider
2. Provider callback → Passport creates/finds user in DB
3. If `invite_redeemed = false` → redirect to `/redeem-invite`
4. User enters invite code → `invite_redeemed = true` → access granted
5. First user can click "Become Admin" to bootstrap (only works if no admins exist)

### Authorization Middleware
- `isAuthenticated` - Requires valid session
- `hasInvite` - Requires authenticated + invite redeemed (or admin)
- `isAdmin` - Requires admin role

### Database (sql.js)
- In-memory SQLite with periodic saves to disk
- Auto-save every 30 seconds + on process exit
- Located at `packages/server/data/possumbly.db`
- Tables: `users`, `invite_codes`, `templates`, `memes`

### File Storage
- Templates: `packages/server/data/uploads/templates/`
- Memes: `packages/server/data/uploads/memes/`
- Served via `/uploads/*` (requires authentication)

### Meme Editor (Konva.js)
- Canvas-based with drag/resize/rotate
- Stores editor state as JSON: `{ textBoxes: [...] }`
- Each textbox: id, text, x, y, width, fontSize, fontFamily, fill, stroke, strokeWidth, align, rotation
- Exports to PNG via `stage.toDataURL()`

## Security Implementation

### Rate Limiting
- Global: 1000 req/15min
- Auth: 20 req/15min
- Invite redeem: 10 req/hour

### Headers (Helmet)
- CSP, X-Content-Type-Options, X-Frame-Options, HSTS

### Input Validation
- All IDs: `/^[a-zA-Z0-9_-]+$/`
- Template names: HTML entity escaped, 100 char limit
- Editor state: Structure validated, 100KB max, 50 textboxes max
- File uploads: MIME + extension whitelist, Sharp validation

### Session Security
- httpOnly, secure (prod), sameSite: strict (prod)
- 7-day expiry
- Custom cookie name

## Environment Variables

**Required for production:**
- `SESSION_SECRET` - Random string for session encryption (REQUIRED in prod)
- `PUBLIC_URL` - Public URL of the app (for OAuth callbacks)

**OAuth (at least one required):**
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`

**Optional:**
- `PORT` - Server port (default: 3000)
- `DATABASE_PATH` - SQLite path (default: ./data/possumbly.db)
- `UPLOADS_PATH` - Upload directory (default: ./data/uploads)
- `NODE_ENV` - Set to "production" for secure cookies

## First-Time Setup

1. Copy `.env.example` to `.env`
2. Configure OAuth credentials with at least one provider
3. Set `SESSION_SECRET` to a random string
4. Run `npm install && npm run dev`
5. Visit http://localhost:5173 and authenticate
6. Click "Become Admin" on the invite code page (first user only)
7. Generate invite codes in Admin panel for other users

## Common Issues

### "Database not found"
- The server creates its database at `packages/server/data/possumbly.db`
- Scripts use `./data/possumbly.db` by default
- Ensure paths match or copy database to correct location

### Templates not showing
- Check database has templates: `npx tsx scripts/check-db.ts`
- Verify images exist in `packages/server/data/uploads/templates/`

### OAuth callback errors
- Ensure `PUBLIC_URL` matches your OAuth app's authorized redirect URI
- Callback format: `{PUBLIC_URL}/auth/{provider}/callback`

### Text disappears when dragging
- Fixed: drag handlers now properly account for canvas scaling
