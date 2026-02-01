# Security Documentation

This document describes the security measures implemented in Possumbly.

## Authentication & Authorization

### OAuth Providers
- Google, GitHub, and Discord OAuth via Passport.js
- No password storage - authentication delegated to trusted providers
- Session-based authentication with secure cookie settings

### Session Security
| Setting | Development | Production |
|---------|-------------|------------|
| Cookie Name | `possumbly.sid` | `possumbly.sid` |
| httpOnly | `true` | `true` |
| secure | `false` | `true` |
| sameSite | `lax` | `strict` |
| maxAge | 7 days | 7 days |

### Authorization Levels
1. **Unauthenticated** - Can only access login page
2. **Authenticated (no invite)** - Can only access invite redemption
3. **Authenticated (with invite)** - Full access to templates and memes
4. **Admin** - Full access + user management + invite generation

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Global | 1000 requests | 15 minutes |
| Auth routes | 20 requests | 15 minutes |
| Invite redemption | 10 requests | 1 hour |

Rate limiting is implemented using `express-rate-limit` and returns HTTP 429 when exceeded.

## Security Headers

Implemented via Helmet.js:

```
Content-Security-Policy:
  default-src 'self';
  style-src 'self' 'unsafe-inline';
  script-src 'self';
  img-src 'self' data: blob:;
  connect-src 'self';
  font-src 'self';
  object-src 'none';
  frame-src 'none'

X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0 (disabled, CSP is preferred)
Strict-Transport-Security: max-age=15552000; includeSubDomains
```

## Input Validation

### ID Parameters
All ID parameters (template, meme, user, invite) are validated against:
```regex
/^[a-zA-Z0-9_-]+$/
```

### Template Names
- Maximum length: 100 characters
- HTML entities escaped: `& < > " '`

### Invite Codes
- Format: 12 hexadecimal characters (uppercase)
- Validated before database lookup
- Same error message for "not found" and "already used" (prevents enumeration)

### Editor State
- Must be a valid object with `textBoxes` array
- Maximum 50 text boxes
- Maximum 1000 characters per text box
- Total size limit: 100KB
- Numeric fields validated as numbers

## File Upload Security

### Template Uploads
1. **MIME Type Whitelist**: Only `image/jpeg`, `image/png`, `image/gif`, `image/webp`
2. **Extension Validation**: Secondary check on file extension
3. **Server-Generated Filename**: Extension derived from MIME type, not user input
4. **Image Validation**: Sharp library verifies file is actually an image
5. **Dimension Limits**: Maximum 4096x4096 pixels
6. **Size Limit**: 10MB maximum

### Meme Rendering
1. **Base64 Validation**: Regex validates data URI format
2. **Size Limit**: ~10MB decoded (15MB base64)
3. **Image Verification**: Sharp validates the decoded buffer is a real image
4. **Dimension Check**: Maximum 4096x4096 pixels

### File Serving
- `/uploads/*` requires authentication
- `X-Content-Type-Options: nosniff` header on all served files
- Files served with `Content-Disposition: inline`

## Path Traversal Prevention

1. Filenames are server-generated using `nanoid()` (alphanumeric only)
2. Before file operations, filenames are validated against:
   ```regex
   /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|gif|webp)$/
   ```
3. All file paths constructed using `path.join()` with validated components

## Error Handling

- Internal errors logged to console but not exposed to clients
- Generic error messages returned: "An unexpected error occurred"
- Stack traces never sent to client
- Health endpoint doesn't expose server information

## Environment Security

### Required in Production
- `SESSION_SECRET` - Server refuses to start without it in production
- Logs warning in development if using default secret

### Sensitive Data
- OAuth secrets stored in environment variables only
- No secrets in source code or git history
- `.env` file gitignored

## Database Security

- SQLite with parameterized queries (sql.js)
- No raw SQL string concatenation
- Database file stored outside web root

## CSRF Protection

- `SameSite=strict` cookies in production prevent CSRF
- State-changing operations require authenticated session
- No cookie-based auth for API (session-based only)

## Recommendations for Production

1. **Always set `NODE_ENV=production`** - Enables secure cookie settings
2. **Use HTTPS** - Required for secure cookies
3. **Strong SESSION_SECRET** - Use cryptographically random string (32+ bytes)
4. **Reverse Proxy** - Put behind nginx/Cloudflare for additional protection
5. **Regular Updates** - Keep dependencies updated for security patches
6. **Backup Database** - Regular backups of SQLite database
7. **Monitor Logs** - Watch for rate limit triggers and errors

## Security Checklist

- [x] OAuth authentication (no password storage)
- [x] Session security (httpOnly, secure, sameSite)
- [x] Rate limiting (global + per-endpoint)
- [x] Security headers (Helmet.js)
- [x] Input validation (IDs, names, editor state)
- [x] File upload validation (MIME, extension, Sharp)
- [x] Path traversal prevention
- [x] Error message sanitization
- [x] Protected file serving
- [x] Environment variable secrets
- [x] SQL injection prevention (parameterized queries)
- [x] XSS prevention (HTML escaping, CSP)

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly by contacting the maintainers directly rather than opening a public issue.
