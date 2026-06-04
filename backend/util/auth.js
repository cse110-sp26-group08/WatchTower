/* eslint-env node */

import { SignJWT, jwtVerify } from 'jose';

export const COOKIE_NAME = 'watchtower_token';

function secretKey(secret) {
  return new TextEncoder().encode(secret);
}

/**
 * Sign a JWT with the given payload and secret.
 * @param {object} payload
 * @param {string} secret
 * @returns {Promise<string>}
 */
export async function signJwt(payload, secret) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey(secret));
}

/**
 * Verify a JWT and return its payload, or null if invalid/expired.
 * @param {string} token
 * @param {string} secret
 * @returns {Promise<object|null>}
 */
export async function verifyJwt(token, secret) {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret));
    return payload;
  } catch {
    return null;
  }
}

/**
 * Parse a Cookie header string into a key-value map.
 * @param {string} cookieHeader
 * @returns {Record<string, string>}
 */
export function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map(pair => {
      const idx = pair.indexOf('=');
      if (idx < 0) return [pair.trim(), ''];
      return [pair.slice(0, idx).trim(), pair.slice(idx + 1).trim()];
    })
  );
}
