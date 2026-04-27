export type AuthCookieKind = 'access' | 'refresh';

export type AuthCookieOptions = {
  httpOnly: true;
  sameSite: 'lax' | 'strict' | 'none';
  secure: boolean;
  path: string;
  maxAge?: number;
};

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function authCookieOptions(
  kind: AuthCookieKind,
  isProduction: boolean,
): AuthCookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge:
      kind === 'access' ? ACCESS_TOKEN_MAX_AGE_MS : REFRESH_TOKEN_MAX_AGE_MS,
  };
}

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
