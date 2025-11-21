// src/lib/chatbot/utils/images.ts
import { env as publicEnv } from '$env/dynamic/public';

export function buildImageUrl(relativePath: string): string {
  // Base de la app
  const base =
    publicEnv.PUBLIC_APP_URL?.replace(/\/$/, '') ??
    'https://ccsolutions-bot.vercel.app'; // dominio correcto

  // Normalizar ruta interna
  const path = relativePath.startsWith('/')
    ? relativePath
    : `/${relativePath}`;

  // Construir URL final
  return `${base}${path}`;
}
