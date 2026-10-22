import crypto from 'crypto';

const AUTHOR_EMAIL = (process.env.AUTHOR_EMAIL || 'daniel.poludyonny@gmail.com').toLowerCase();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '436412031999-4ba6ochv7pcmqkuh59h6sdlqean3vs0j.apps.googleusercontent.com';
const SESSION_SECRET = process.env.APP_SECRET_TOKEN || 'author_studio_session_secret_2026';

// In-memory cache for verified Google ID tokens
const tokenCache = new Map<string, { email: string; name: string; picture: string; expiresAt: number }>();

export interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
}

export class AuthService {
  /**
   * Create a long-lived 30-day Author Session Token
   * This guarantees the author stays logged in across days/reloads without Google ID token expiration!
   */
  static createSessionToken(user: GoogleUser): string {
    const payload = JSON.stringify({
      email: user.email.toLowerCase(),
      name: user.name,
      picture: user.picture || '',
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
    return Buffer.from(`${payload}.${hmac}`).toString('base64');
  }

  /**
   * Verify long-lived 30-day session token
   */
  static verifySessionToken(token: string): GoogleUser | null {
    if (!token) return null;
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const parts = decoded.split('.');
      if (parts.length !== 2) return null;
      const [payloadStr, hmac] = parts;
      const expectedHmac = crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('hex');
      if (hmac !== expectedHmac) return null;

      const data = JSON.parse(payloadStr);
      if (Date.now() > data.exp) return null; // Expired
      if (data.email.toLowerCase() !== AUTHOR_EMAIL) return null; // Not author

      return {
        email: data.email,
        name: data.name,
        picture: data.picture
      };
    } catch {
      return null;
    }
  }

  static async verifyGoogleToken(idToken: string): Promise<GoogleUser | null> {
    if (!idToken) return null;

    // Check cache
    const now = Date.now();
    const cached = tokenCache.get(idToken);
    if (cached && cached.expiresAt > now) {
      if (cached.email.toLowerCase() === AUTHOR_EMAIL) {
        return { email: cached.email, name: cached.name, picture: cached.picture };
      }
      return null;
    }

    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      if (!response.ok) {
        console.warn('[AuthService] Google token verification failed:', response.statusText);
        return null;
      }

      const payload: any = await response.json();

      // Verify audience and email verification
      if (payload.aud !== GOOGLE_CLIENT_ID) {
        console.warn(`[AuthService] Token audience mismatch: ${payload.aud} !== ${GOOGLE_CLIENT_ID}`);
        return null;
      }

      if (payload.email_verified !== 'true' && payload.email_verified !== true) {
        console.warn('[AuthService] Email is not verified by Google');
        return null;
      }

      const userEmail = (payload.email || '').toLowerCase();
      const userName = payload.name || 'Author';
      const userPicture = payload.picture || '';

      // Cache for 45 minutes
      tokenCache.set(idToken, {
        email: userEmail,
        name: userName,
        picture: userPicture,
        expiresAt: now + 45 * 60 * 1000
      });

      // Strict check: Only author is allowed
      if (userEmail === AUTHOR_EMAIL) {
        return { email: userEmail, name: userName, picture: userPicture };
      } else {
        console.warn(`[AuthService] Unauthorized user attempted access: ${userEmail}`);
        return null;
      }
    } catch (err: any) {
      console.error('[AuthService] Error verifying Google token:', err.message);
      return null;
    }
  }

  static getAuthorEmail(): string {
    return AUTHOR_EMAIL;
  }
}
