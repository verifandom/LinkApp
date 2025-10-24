/**
 * In-memory session store for OAuth sessions
 * In production, use Redis or a database
 */

interface Session {
  tokens: {
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
  };
  type: string;
  createdAt: number;
  channelId?: string;
  channelName?: string;
}

class SessionStore {
  private sessions = new Map<string, Session>();

  set(sessionId: string, session: Session): void {
    this.sessions.set(sessionId, session);
  }

  get(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Clean up expired sessions (older than 1 hour)
   */
  cleanupExpiredSessions(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.createdAt > maxAge) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

// Global session store instance
export const sessionStore = new SessionStore();

// Cleanup expired sessions every minute
setInterval(() => {
  sessionStore.cleanupExpiredSessions();
}, 60000);
