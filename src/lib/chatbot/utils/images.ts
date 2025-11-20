// src/lib/chatbot/utils/images.ts
import { env as publicEnv } from '$env/dynamic/public';

export function buildImageUrl(relativePath: string): string {
  const base =
    (publicEnv.PUBLIC_APP_URL ?? 'https://ccsolutions-bot.vercel.app')
      .replace(/\/$/, '');

  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  return `${base}${path}`;
}
