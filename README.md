# Possumbly

A self-hosted meme creation platform with OAuth authentication, invite-code access control, and a full-featured meme editor.

## Features

- **OAuth Authentication** - Sign in with Google, GitHub, or Discord
- **Invite-Only Access** - Control who can use the platform with invite codes
- **Template Gallery** - Browse and upload meme templates
- **Canvas Meme Editor** - Drag, resize, rotate text with customizable fonts, colors, and strokes
- **Save & Download** - Save memes to your account or download as PNG
- **Admin Panel** - Manage users, generate invite codes, view stats
- **Security Hardened** - Rate limiting, input validation, secure headers

## Screenshots

The app includes:
- Login page with OAuth provider buttons
- Template gallery with upload support
- Full-featured meme editor with text controls
- My Memes gallery to view/edit saved memes
- Admin panel for user and invite management

## Quick Start

### Prerequisites

- Node.js 18+
- OAuth credentials from at least one provider (Google, GitHub, or Discord)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/possumbly.git
   cd possumbly
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your OAuth credentials:
   ```env
   SESSION_SECRET=your-random-secret-here
   PUBLIC_URL=http://localhost:5173

   # At least one OAuth provider
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open http://localhost:5173

7. Sign in and click "Become Admin" (first user only)

8. Generate invite codes in the Admin panel for other users

## OAuth Setup

### Google
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `http://localhost:5173/auth/google/callback`
4. Copy Client ID and Secret to `.env`

### GitHub
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set callback URL: `http://localhost:5173/auth/github/callback`
4. Copy Client ID and Secret to `.env`

### Discord
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to OAuth2 and add redirect: `http://localhost:5173/auth/discord/callback`
4. Copy Client ID and Secret to `.env`

## Docker Deployment

### Production

```bash
# Build the image
docker build -t possumbly .

# Run with docker-compose
docker-compose up -d
```

### Environment Variables for Docker

```yaml
environment:
  - NODE_ENV=production
  - SESSION_SECRET=your-secure-random-string
  - PUBLIC_URL=https://possumbly.yourdomain.com
  - GOOGLE_CLIENT_ID=...
  - GOOGLE_CLIENT_SECRET=...
```

### Volume Mounts

The container stores data in `/data`:
- `/data/possumbly.db` - SQLite database
- `/data/uploads/templates/` - Template images
- `/data/uploads/memes/` - Generated memes

## Project Structure

```
possumbly/
├── packages/
│   ├── server/          # Express + TypeScript backend
│   └── web/             # React + Vite + Tailwind frontend
├── scripts/             # Utility scripts
├── Dockerfile           # Production build
└── docker-compose.yml   # Production deployment
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js, Express, TypeScript |
| Frontend | React, Vite, TypeScript, Tailwind CSS |
| Database | SQLite (sql.js) |
| Auth | Passport.js |
| Editor | Konva.js |
| Security | Helmet, express-rate-limit |
| Deployment | Docker |

## Security Features

- **Rate Limiting** - Prevents brute force and DoS attacks
- **Security Headers** - CSP, X-Frame-Options, HSTS via Helmet
- **Input Validation** - All user input validated and sanitized
- **File Validation** - Uploaded images verified with Sharp
- **Secure Sessions** - httpOnly, secure, sameSite cookies
- **Protected Uploads** - File access requires authentication

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/github` - Initiate GitHub OAuth
- `GET /auth/discord` - Initiate Discord OAuth
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Log out

### Templates
- `GET /api/templates` - List all templates
- `GET /api/templates/:id` - Get template by ID
- `POST /api/templates` - Upload template (multipart/form-data)
- `DELETE /api/templates/:id` - Delete template

### Memes
- `GET /api/memes` - List user's memes
- `GET /api/memes/:id` - Get meme by ID
- `POST /api/memes` - Create meme
- `PUT /api/memes/:id` - Update meme
- `POST /api/memes/:id/render` - Save rendered image
- `DELETE /api/memes/:id` - Delete meme

### Invites (Admin)
- `GET /api/invites` - List all invite codes
- `POST /api/invites` - Generate new invite code
- `POST /api/invites/redeem` - Redeem invite code
- `DELETE /api/invites/:id` - Delete invite code

### Admin
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id/role` - Update user role
- `GET /api/admin/stats` - Get platform stats
- `POST /api/admin/bootstrap` - Become first admin

## Development

```bash
# Install dependencies
npm install

# Start development servers (backend + frontend)
npm run dev

# Run only backend
npm run dev:server

# Run only frontend
npm run dev:web

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

## Import Templates

Pre-populate with popular meme templates:

```bash
npx tsx scripts/import-templates.ts
```

This downloads ~40 classic templates from imgflip.

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
