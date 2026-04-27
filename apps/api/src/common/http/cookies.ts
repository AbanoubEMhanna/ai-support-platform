import type { Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  authCookieOptions,
} from '@ai-support-platform/shared';

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(
    ACCESS_TOKEN_COOKIE,
    tokens.accessToken,
    authCookieOptions('access', isProduction),
  );
  res.cookie(
    REFRESH_TOKEN_COOKIE,
    tokens.refreshToken,
    authCookieOptions('refresh', isProduction),
  );
}

export function clearAuthCookies(res: Response) {
  const isProduction = process.env.NODE_ENV === 'production';
  const accessOpts = authCookieOptions('access', isProduction);
  const refreshOpts = authCookieOptions('refresh', isProduction);
  res.clearCookie(ACCESS_TOKEN_COOKIE, {
    httpOnly: accessOpts.httpOnly,
    sameSite: accessOpts.sameSite,
    secure: accessOpts.secure,
    path: accessOpts.path,
  });
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: refreshOpts.httpOnly,
    sameSite: refreshOpts.sameSite,
    secure: refreshOpts.secure,
    path: refreshOpts.path,
  });
}
