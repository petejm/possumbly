# Deploying Possumbly on Unraid

This guide covers deploying Possumbly as a Docker container on Unraid.

## Prerequisites

- Unraid 6.9 or later
- Docker enabled in Unraid
- At least one OAuth provider configured (Google, GitHub, or Discord)

## Quick Start

### 1. Create App Data Directory

SSH into your Unraid server or use the terminal:

```bash
mkdir -p /mnt/user/appdata/possumbly/data/uploads/templates
mkdir -p /mnt/user/appdata/possumbly/data/uploads/memes
```

### 2. Generate Session Secret

Generate a secure random session secret:

```bash
openssl rand -base64 32
```

Save this value - you'll need it for configuration.

### 3. Configure OAuth Provider

Choose at least one OAuth provider and create credentials:

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to APIs & Services > Credentials
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URI: `https://your-domain.com/auth/google/callback`
6. Copy Client ID and Client Secret

#### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create new OAuth App
3. Set Authorization callback URL: `https://your-domain.com/auth/github/callback`
4. Copy Client ID and Client Secret

#### Discord OAuth
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create new Application
3. Go to OAuth2 section
4. Add redirect: `https://your-domain.com/auth/discord/callback`
5. Copy Client ID and Client Secret

### 4. Add Container in Unraid

#### Using Docker Compose (Recommended)

Create `/mnt/user/appdata/possumbly/docker-compose.yml`:

```yaml
version: '3.8'

services:
  possumbly:
    image: ghcr.io/petejm/possumbly:latest  # Or build locally
    container_name: possumbly
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - /mnt/user/appdata/possumbly/data:/data
    environment:
      - NODE_ENV=production
      - PORT=3000
      - SESSION_SECRET=YOUR_GENERATED_SECRET_HERE
      - DATABASE_PATH=/data/possumbly.db
      - UPLOADS_PATH=/data/uploads
      - PUBLIC_URL=https://memes.yourdomain.com
      # Google OAuth (optional)
      - GOOGLE_CLIENT_ID=your-google-client-id
      - GOOGLE_CLIENT_SECRET=your-google-client-secret
      # GitHub OAuth (optional)
      - GITHUB_CLIENT_ID=your-github-client-id
      - GITHUB_CLIENT_SECRET=your-github-client-secret
      # Discord OAuth (optional)
      - DISCORD_CLIENT_ID=your-discord-client-id
      - DISCORD_CLIENT_SECRET=your-discord-client-secret
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

Then run:
```bash
cd /mnt/user/appdata/possumbly
docker-compose up -d
```

#### Using Unraid Docker UI

1. Go to Docker tab in Unraid
2. Click "Add Container"
3. Configure:

| Field | Value |
|-------|-------|
| Name | possumbly |
| Repository | `ghcr.io/petejm/possumbly:latest` |
| Network Type | Bridge |
| Port Mapping | Host: 3000, Container: 3000 |

**Volumes:**
| Container Path | Host Path | Mode |
|----------------|-----------|------|
| /data | /mnt/user/appdata/possumbly/data | rw |

**Environment Variables:**
| Name | Value |
|------|-------|
| NODE_ENV | production |
| SESSION_SECRET | (your generated secret) |
| PUBLIC_URL | https://memes.yourdomain.com |
| GOOGLE_CLIENT_ID | (your client id) |
| GOOGLE_CLIENT_SECRET | (your client secret) |

### 5. Configure Reverse Proxy

If using Nginx Proxy Manager or Traefik, configure HTTPS proxy to port 3000.

Example Nginx configuration:
```nginx
server {
    listen 443 ssl http2;
    server_name memes.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://192.168.1.x:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## First-Time Setup

1. Access the application at your configured URL
2. Log in with your OAuth provider
3. On the invite code page, click "Become Admin" (only works for first user)
4. Generate invite codes for other users in the Admin panel

## Backup & Restore

### Backup

The entire application state is in `/mnt/user/appdata/possumbly/data/`:
- `possumbly.db` - SQLite database (users, memes, invites)
- `uploads/templates/` - Meme template images
- `uploads/memes/` - Generated meme images

To backup:
```bash
# Stop container first
docker stop possumbly

# Create backup
tar -czvf possumbly-backup-$(date +%Y%m%d).tar.gz /mnt/user/appdata/possumbly/data/

# Restart container
docker start possumbly
```

### Restore

```bash
# Stop container
docker stop possumbly

# Restore from backup
tar -xzvf possumbly-backup-YYYYMMDD.tar.gz -C /

# Start container
docker start possumbly
```

## Resource Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 0.5 cores | 1-2 cores |
| RAM | 256 MB | 512 MB - 1 GB |
| Storage | 1 GB | 10+ GB (depends on meme storage) |

## Troubleshooting

### Container won't start

Check logs:
```bash
docker logs possumbly
```

Common issues:
- **SESSION_SECRET not set**: Generate and add a session secret
- **PUBLIC_URL not set**: Set your public URL for OAuth callbacks
- **No OAuth provider**: Configure at least one OAuth provider

### OAuth callback errors

Ensure:
1. PUBLIC_URL matches your domain exactly (including https://)
2. OAuth provider redirect URIs include `{PUBLIC_URL}/auth/{provider}/callback`
3. If behind reverse proxy, X-Forwarded-Proto header is set

### Database locked errors

SQLite can have locking issues under heavy load. The application handles this gracefully, but if persistent:
1. Ensure only one container instance is running
2. Check disk I/O performance
3. Consider SSD for appdata

### Images not loading

Check:
1. Upload directory permissions
2. Volume mount is correct
3. Template files exist in `/data/uploads/templates/`

## Security Considerations

1. **Always use HTTPS** in production
2. **Generate strong SESSION_SECRET** (32+ random bytes)
3. **Keep OAuth credentials secret** - never commit to git
4. **Regular backups** - protect against data loss
5. **Update regularly** - pull latest container images
6. **Limit access** - use Unraid's access controls

## Updating

```bash
# Pull latest image
docker pull ghcr.io/petejm/possumbly:latest

# Recreate container
docker-compose down
docker-compose up -d

# Or via Unraid UI: Actions > Force Update
```

## Building Locally

If you want to build the image locally instead of using a pre-built image:

```bash
cd /mnt/user/appdata/possumbly
git clone https://github.com/petejm/possumbly.git source
cd source
docker build -t possumbly:local .
```

Then use `possumbly:local` as the image in your configuration.

## Support

- GitHub Issues: https://github.com/petejm/possumbly/issues
- Check logs: `docker logs possumbly`
