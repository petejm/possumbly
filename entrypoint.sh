#!/bin/sh
set -e

# Validate required environment variables
if [ -z "$SESSION_SECRET" ]; then
  echo "ERROR: SESSION_SECRET environment variable is required"
  echo "Generate one with: openssl rand -base64 32"
  exit 1
fi

if [ "$SESSION_SECRET" = "change-this-to-a-random-string" ]; then
  echo "ERROR: SESSION_SECRET must be changed from the default value"
  echo "Generate one with: openssl rand -base64 32"
  exit 1
fi

if [ -z "$PUBLIC_URL" ]; then
  echo "ERROR: PUBLIC_URL environment variable is required"
  echo "Example: https://memes.yourdomain.com"
  exit 1
fi

# Check that at least one OAuth provider is configured
if [ -z "$GOOGLE_CLIENT_ID" ] && [ -z "$GITHUB_CLIENT_ID" ] && [ -z "$DISCORD_CLIENT_ID" ]; then
  echo "WARNING: No OAuth provider configured. Users will not be able to log in."
  echo "Configure at least one of: GOOGLE_CLIENT_ID, GITHUB_CLIENT_ID, or DISCORD_CLIENT_ID"
fi

# Ensure data directories exist with proper permissions
mkdir -p /data/uploads/templates /data/uploads/memes 2>/dev/null || true

echo "Starting Possumbly..."
exec "$@"
