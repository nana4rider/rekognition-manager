import { authStatusResponseSchema, type AuthStatusResponse } from '@rekognition-manager/contracts';

export const OIDC_ENABLED_REQUEST_HEADER = 'x-rekognition-manager-oidc-enabled';

export async function getAuthStatus(): Promise<AuthStatusResponse> {
  const bffOrigin = process.env.BFF_ORIGIN ?? 'http://localhost:3001';
  const response = await fetch(new URL('/auth/status', bffOrigin), {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`BFFの認証状態を取得できませんでした (${response.status})`);
  }
  return authStatusResponseSchema.parse(await response.json());
}
