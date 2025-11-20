// src/lib/chatbot/catalog/productos.ts

import type { Producto } from '$lib/chatbot/data/productos';
import { productos as productosBase } from '$lib/chatbot/data/productos';

export type CategoriaChatbot = Producto['categoria'];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Solo productos disponibles
export const productosChatbot: Producto[] = productosBase.filter(
  (p) => p.disponible
);

// Agrupar por categoría
export function getProductosPorCategoria(cat: CategoriaChatbot): Producto[] {
  return productosChatbot.filter((p) => p.categoria === cat);
}

// Formatear CLP
const clp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});

// Texto corto de tamaños (para mostrar en FAQ menú)
function formatearTamanosCorto(p: Producto): string {
  if (!p.tamanos?.length) {
    if (p.rindePersonas) {
      return `${clp.format(p.precio)} aprox. ${p.rindePersonas} personas`;
    }
    return clp.format(p.precio);
  }

  const primero = p.tamanos[0];
  return `${primero.nombre.split('/')[0].trim()} desde ${clp.format(
    primero.precio
  )}`;
}

// 🧠 Resumen de menú para la intención faq_menu
export function buildMenuResumen(limitPerCategory = 4): string {
  const categorias: CategoriaChatbot[] = [
    'Bizcocho',
    'Hojarasca',
    'Porciones',
    'Temporada'
  ];

  const bloques: string[] = [];

  for (const cat of categorias) {
    const lista = getProductosPorCategoria(cat).slice(0, limitPerCategory);
    if (!lista.length) continue;

    const titulo =
      cat === 'Bizcocho'
        ? 'Tortas de bizcocho'
        : cat === 'Hojarasca'
        ? 'Tortas de hojarasca / mil hojas'
        : cat === 'Porciones'
        ? 'Porciones individuales'
        : 'Tortas de temporada / especiales';

    const lineas = lista.map(
      (p) => `• ${p.nombre} – ${formatearTamanosCorto(p)}`
    );

    bloques.push(`🍰 ${titulo}\n${lineas.join('\n')}`);
  }

  return bloques.join('\n\n');
}

// 🔍 Buscar 1 producto por texto del usuario
export function buscarProductoPorTexto(texto: string): Producto | null {
  const n = normalize(texto);

  // 1) por nombre
  let candidato =
    productosChatbot.find((p) => normalize(p.nombre) === n) ||
    productosChatbot.find((p) => normalize(p.nombre).includes(n));

  if (candidato) return candidato;

  // 2) por slug
  candidato =
    productosChatbot.find((p) => normalize(p.slug) === n) ||
    productosChatbot.find((p) => normalize(p.slug).includes(n));

  return candidato ?? null;
}

// 📄 Ficha detallada para WhatsApp
export function formatearDetalleProducto(p: Producto): string {
  const base =
    `*${p.nombre}*` +
    `\n${p.descripcion}` +
    (p.rindePersonas
      ? `\nRinde aprox. *${p.rindePersonas} personas*.`
      : '') +
    (p.diametroCm ? `\nDiámetro aprox.: *${p.diametroCm} cm*.` : '');

  let tamanosTxt = '';
  if (p.tamanos?.length) {
    const lineas = p.tamanos.map(
      (t) => `• ${t.nombre}: ${clp.format(t.precio)}`
    );
    tamanosTxt = `\n\n*Tamaños disponibles:*\n${lineas.join('\n')}`;
  } else {
    tamanosTxt = `\n\nPrecio: ${clp.format(p.precio)}`;
  }

  let addonsTxt = '';
  if (p.addons?.length) {
    const lineas = p.addons.map(
      (a) => `• ${a.nombre}: ${clp.format(a.precio)}`
    );
    addonsTxt = `\n\n*Extras opcionales:*\n${lineas.join('\n')}`;
  }

  return `${base}${tamanosTxt}${addonsTxt}\n\nSi quieres, dime para cuántas personas y la fecha, y seguimos con tu pedido.`;
}
