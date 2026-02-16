/**
 * @squadscript/server
 *
 * Auth service — JWT sign/verify and password hashing.
 *
 * @module
 */

import type { DrizzleDB } from '../../../db/index.js';
import { UserRepository } from '../../../db/repositories/user.repo.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me-32-chars-min';
const JWT_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

export interface JWTPayload {
  readonly id: string;
  readonly username: string;
  readonly role: string;
  readonly iat: number;
  readonly exp: number;
}

function base64UrlEncode(data: string): string {
  return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(data: string): string {
  const padded = data.replace(/-/g, '+').replace(/_/g, '/');
  return atob(padded);
}

export class AuthService {
  /**
   * Sign a JWT token.
   */
  static signJWT(payload: { id: string; username: string; role: string }): string {
    const now = Math.floor(Date.now() / 1000);
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));

    const claims: JWTPayload = {
      ...payload,
      iat: now,
      exp: now + JWT_EXPIRY_SECONDS,
    };
    const body = base64UrlEncode(JSON.stringify(claims));

    const data = `${header}.${body}`;
    const encoder = new TextEncoder();
    const hmac = new Bun.CryptoHasher('sha256', encoder.encode(JWT_SECRET));
    hmac.update(encoder.encode(data));
    const signature = base64UrlEncode(
      String.fromCharCode(...new Uint8Array(hmac.digest())),
    );

    return `${data}.${signature}`;
  }

  /**
   * Verify a JWT token and return the payload, or null if invalid.
   */
  static verifyJWT(token: string): JWTPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [header, body, signature] = parts as [string, string, string];
      const data = `${header}.${body}`;

      // Verify signature
      const encoder = new TextEncoder();
      const hmac = new Bun.CryptoHasher('sha256', encoder.encode(JWT_SECRET));
      hmac.update(encoder.encode(data));
      const expectedSignature = base64UrlEncode(
        String.fromCharCode(...new Uint8Array(hmac.digest())),
      );

      if (signature !== expectedSignature) return null;

      // Decode payload
      const payload = JSON.parse(base64UrlDecode(body)) as JWTPayload;

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) return null;

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Hash a password using Bun.password.
   */
  static async hashPassword(password: string): Promise<string> {
    return Bun.password.hash(password, { algorithm: 'bcrypt', cost: 12 });
  }

  /**
   * Verify a password against a hash.
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
  }

  /**
   * Authenticate a user by username and password.
   */
  static async authenticate(
    db: DrizzleDB,
    username: string,
    password: string,
  ): Promise<{ token: string; expiresAt: string; user: JWTPayload } | null> {
    const userRepo = new UserRepository(db);
    const user = await userRepo.findByUsername(username);

    if (!user) return null;

    const valid = await AuthService.verifyPassword(password, user.password);
    if (!valid) return null;

    const token = AuthService.signJWT({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    const payload = AuthService.verifyJWT(token)!;

    return {
      token,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      user: payload,
    };
  }

  /**
   * Ensure at least one admin user exists. Creates a default admin if none exist.
   */
  static async ensureDefaultAdmin(db: DrizzleDB): Promise<void> {
    const userRepo = new UserRepository(db);
    const count = await userRepo.count();

    if (count === 0) {
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? 'admin';
      const hash = await AuthService.hashPassword(defaultPassword);
      await userRepo.create({
        username: 'admin',
        password: hash,
        role: 'admin',
      });
    }
  }
}
