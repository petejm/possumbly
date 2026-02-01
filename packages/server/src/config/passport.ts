import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { nanoid } from 'nanoid';
import { userQueries, User } from '../db/schema.js';

// Helper to find or create user
function findOrCreateUser(
  provider: 'google' | 'github' | 'discord',
  providerId: string,
  email: string | null,
  name: string | null,
  avatarUrl: string | null
): User {
  let user = userQueries.findByProviderId(provider, providerId);

  if (!user) {
    const id = nanoid();
    const now = Date.now();
    userQueries.create(id, email, name, avatarUrl, provider, providerId, now);
    user = userQueries.findById(id)!;
  }

  return user;
}

export function configurePassport() {
  const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:3000';

  // Serialize user to session
  passport.serializeUser((user, done) => {
    done(null, (user as User).id);
  });

  // Deserialize user from session
  passport.deserializeUser((id: string, done) => {
    try {
      const user = userQueries.findById(id);
      done(null, user || null);
    } catch (err) {
      done(err, null);
    }
  });

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${PUBLIC_URL}/auth/google/callback`,
        },
        (_accessToken, _refreshToken, profile, done) => {
          try {
            const user = findOrCreateUser(
              'google',
              profile.id,
              profile.emails?.[0]?.value || null,
              profile.displayName || null,
              profile.photos?.[0]?.value || null
            );
            done(null, user);
          } catch (err) {
            done(err as Error, undefined);
          }
        }
      )
    );
    console.log('Google OAuth strategy configured');
    console.log(`  Callback URL: ${PUBLIC_URL}/auth/google/callback`);
  } else {
    console.log('Google OAuth not configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)');
  }

  // GitHub OAuth Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: `${PUBLIC_URL}/auth/github/callback`,
        },
        (
          _accessToken: string,
          _refreshToken: string,
          profile: { id: string; displayName?: string; username?: string; emails?: Array<{ value: string }>; photos?: Array<{ value: string }> },
          done: (error: Error | null, user?: User) => void
        ) => {
          try {
            const user = findOrCreateUser(
              'github',
              profile.id,
              profile.emails?.[0]?.value || null,
              profile.displayName || profile.username || null,
              profile.photos?.[0]?.value || null
            );
            done(null, user);
          } catch (err) {
            done(err as Error, undefined);
          }
        }
      )
    );
    console.log('GitHub OAuth strategy configured');
  }

  // Discord OAuth Strategy
  if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
    passport.use(
      new DiscordStrategy(
        {
          clientID: process.env.DISCORD_CLIENT_ID,
          clientSecret: process.env.DISCORD_CLIENT_SECRET,
          callbackURL: `${PUBLIC_URL}/auth/discord/callback`,
          scope: ['identify', 'email'],
        },
        (_accessToken, _refreshToken, profile, done) => {
          try {
            const avatarUrl = profile.avatar
              ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
              : null;
            const user = findOrCreateUser(
              'discord',
              profile.id,
              profile.email || null,
              profile.username || null,
              avatarUrl
            );
            done(null, user);
          } catch (err) {
            done(err as Error, undefined);
          }
        }
      )
    );
    console.log('Discord OAuth strategy configured');
  }
}

export default passport;
