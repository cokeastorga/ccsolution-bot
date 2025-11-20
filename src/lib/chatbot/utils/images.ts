// src/lib/chatbot/utils/images.ts
import { PUBLIC_APP_URL } from '$env/static/public';

/**
 * Construye la URL absoluta de una imagen estática
 * a partir de su ruta relativa (la que tienes en Producto.imagen).
 *
 * Ej:
 *   'tortas/bizcocho/tortaAlpina2.webp'
 * -> 'https://tudominio.cl/tortas/bizcocho/tortaAlpina2.webp'
 */
export function buildImageUrl(relativePath: string): string {
  // URL base del sitio donde corre la app con static/
  const base = (PUBLIC_APP_URL ?? 'https://ccsolutions-bot.vercel.app').replace(/\/$/, ''); // sin slash final
  
  // Asegurar que el path comience con /
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  
  return `${base}${path}`;
}
