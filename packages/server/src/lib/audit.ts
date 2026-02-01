import { Request } from 'express';
import { nanoid } from 'nanoid';
import { auditQueries, AuditAction, User } from '../db/schema.js';

/**
 * Get client IP address from request, handling proxies
 */
function getClientIp(req: Request): string | null {
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || null;
}

/**
 * Get user agent from request
 */
function getUserAgent(req: Request): string | null {
  const ua = req.get('user-agent');
  // Truncate to 500 chars to prevent abuse
  return ua ? ua.substring(0, 500) : null;
}

/**
 * Log an audit event
 */
export function audit(
  action: AuditAction,
  options: {
    req?: Request;
    userId?: string | null;
    resourceType?: string | null;
    resourceId?: string | null;
    details?: Record<string, unknown> | null;
    success?: boolean;
  } = {}
) {
  const { req, userId, resourceType, resourceId, details, success = true } = options;

  // Get user ID from request if not provided
  let effectiveUserId = userId;
  if (effectiveUserId === undefined && req?.user) {
    effectiveUserId = (req.user as User).id;
  }

  auditQueries.create(nanoid(), action, {
    userId: effectiveUserId,
    resourceType,
    resourceId,
    details,
    ipAddress: req ? getClientIp(req) : null,
    userAgent: req ? getUserAgent(req) : null,
    success,
  });
}

/**
 * Log authentication events
 */
export const authAudit = {
  login: (req: Request, userId: string, provider: string) => {
    audit('auth.login', {
      req,
      userId,
      details: { provider },
    });
  },

  logout: (req: Request) => {
    audit('auth.logout', { req });
  },

  loginFailed: (req: Request, reason: string, provider?: string) => {
    audit('auth.login_failed', {
      req,
      details: { reason, provider },
      success: false,
    });
  },
};

/**
 * Log user management events
 */
export const userAudit = {
  created: (req: Request | undefined, userId: string, provider: string) => {
    audit('user.created', {
      req,
      userId,
      resourceType: 'user',
      resourceId: userId,
      details: { provider },
    });
  },

  roleChanged: (req: Request, targetUserId: string, oldRole: string, newRole: string) => {
    audit('user.role_changed', {
      req,
      resourceType: 'user',
      resourceId: targetUserId,
      details: { oldRole, newRole },
    });
  },

  inviteRedeemed: (req: Request, inviteCode: string) => {
    audit('user.invite_redeemed', {
      req,
      details: { inviteCodePrefix: inviteCode.substring(0, 4) + '...' },
    });
  },
};

/**
 * Log invite code events
 */
export const inviteAudit = {
  created: (req: Request, inviteId: string) => {
    audit('invite.created', {
      req,
      resourceType: 'invite',
      resourceId: inviteId,
    });
  },

  deleted: (req: Request, inviteId: string) => {
    audit('invite.deleted', {
      req,
      resourceType: 'invite',
      resourceId: inviteId,
    });
  },

  redeemFailed: (req: Request, reason: string) => {
    audit('invite.redeem_failed', {
      req,
      details: { reason },
      success: false,
    });
  },
};

/**
 * Log template events
 */
export const templateAudit = {
  created: (req: Request, templateId: string, name: string) => {
    audit('template.created', {
      req,
      resourceType: 'template',
      resourceId: templateId,
      details: { name },
    });
  },

  deleted: (req: Request, templateId: string) => {
    audit('template.deleted', {
      req,
      resourceType: 'template',
      resourceId: templateId,
    });
  },
};

/**
 * Log meme events
 */
export const memeAudit = {
  created: (req: Request, memeId: string, templateId: string) => {
    audit('meme.created', {
      req,
      resourceType: 'meme',
      resourceId: memeId,
      details: { templateId },
    });
  },

  updated: (req: Request, memeId: string) => {
    audit('meme.updated', {
      req,
      resourceType: 'meme',
      resourceId: memeId,
    });
  },

  deleted: (req: Request, memeId: string) => {
    audit('meme.deleted', {
      req,
      resourceType: 'meme',
      resourceId: memeId,
    });
  },

  visibilityChanged: (req: Request, memeId: string, isPublic: boolean) => {
    audit('meme.visibility_changed', {
      req,
      resourceType: 'meme',
      resourceId: memeId,
      details: { isPublic },
    });
  },
};

/**
 * Log vote events
 */
export const voteAudit = {
  cast: (req: Request, memeId: string, voteType: number) => {
    audit('vote.cast', {
      req,
      resourceType: 'meme',
      resourceId: memeId,
      details: { voteType: voteType === 1 ? 'upvote' : 'downvote' },
    });
  },

  removed: (req: Request, memeId: string) => {
    audit('vote.removed', {
      req,
      resourceType: 'meme',
      resourceId: memeId,
    });
  },
};

/**
 * Log admin events
 */
export const adminAudit = {
  bootstrap: (req: Request, userId: string) => {
    audit('admin.bootstrap', {
      req,
      userId,
      resourceType: 'user',
      resourceId: userId,
      details: { message: 'First admin created via bootstrap' },
    });
  },
};

/**
 * Log access denied events
 */
export const accessAudit = {
  denied: (req: Request, resource: string, reason: string) => {
    audit('access.denied', {
      req,
      details: { resource, reason },
      success: false,
    });
  },
};
