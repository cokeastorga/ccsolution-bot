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

// ============================
// 1. LISTA BASE Y CATEGORÍAS
// ============================

// Solo productos disponibles
export const productosChatbot: Producto[] = productosBase.filter(
  (p) => p.disponible
);

// Agrupar por categoría
export function getProductosPorCategoria(
  cat: CategoriaChatbot
): Producto[] {
  return productosChatbot.filter((p) => p.categoria === cat);
}

// ============================
// 2. FORMATEO MONEDA Y MENÚ
// ============================

const clp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});

// Texto corto de tamaños (para mostrar en el FAQ / menú)
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

// ============================
// 3. BÚSQUEDA POR TEXTO
// ============================

const STOP_WORDS = [
  'torta', 'tortas', 'pastel', 'kuchen', 'pie',
  'de', 'con', 'el', 'la', 'los', 'las', 'un', 'una', 'del',
  'quiero', 'pedir', 'comprar', 'necesito', 'hay', 'tienen', 'hola', 'buenas',
  'para', 'personas', 'pax', 'prs'
];

export function buscarProductoPorTexto(texto: string): Producto | null {
  const n = normalize(texto);
  if (!n) return null;

  // 1) Intento exacto por nombre
  let candidato =
    productosChatbot.find((p) => normalize(p.nombre) === n) ?? null;
  if (candidato) return candidato;

  // 2) includes por nombre directo
  candidato =
    productosChatbot.find((p) => normalize(p.nombre).includes(n)) ?? null;
  if (candidato) return candidato;

  // 3) por slug exacto
  candidato =
    productosChatbot.find((p) => normalize(p.slug) === n) ?? null;
  if (candidato) return candidato;

  // 4) Búsqueda "fuzzy" inteligente por tokens
  const tokens = n.split(/\s+/).filter((t) => 
    t.length >= 3 && !STOP_WORDS.includes(t)
  );
  
  if (!tokens.length) return null;

  let mejor: { p: Producto; score: number } | null = null;

  for (const p of productosChatbot) {
    const nombreNorm = normalize(p.nombre);
    const descNorm = normalize(p.descripcion);
    const slugNorm = normalize(p.slug);
    
    const target = `${nombreNorm} ${descNorm} ${slugNorm}`;
    let score = 0;

    for (const t of tokens) {
      if (target.includes(t)) {
        score += 2;
        if (nombreNorm.includes(t)) score += 3;
      } 
      else if (levenshteinDistance(t, nombreNorm) <= 2) {
        score += 1;
      }
    }

    if (score > 0) {
      if (!mejor || score > mejor.score) {
        mejor = { p, score };
      }
    }
  }

  if (!mejor || mejor.score < 2) return null;
  return mejor.p;
}

function levenshteinDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 3) return 100;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, 
        dp[i][j - 1] + 1, 
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

// ============================
// 4. FICHA DETALLADA PRODUCTO
// ============================

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

// =====================================================
// 5. LÓGICA DE PORCIONES (Y LA FUNCIÓN QUE FALTABA)
// =====================================================

export type VarianteProducto = {
  producto: Producto;
  tamanoId?: string;
  nombreTamano: string;
  precio: number;
  personasMin: number;
  personasMax: number;
};

export type SugerenciaPorciones = {
  variantes: Array<{
    variante: VarianteProducto;
    cantidad: number;
  }>;
  totalPersonasMin: number;
  totalPersonasMax: number;
  totalPrecio: number;
};

function extraerRangoPersonasDesdeNombre(
  nombre: string
): { min: number; max: number } | null {
  const clean = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  let m = clean.match(/(\d+)\s*[-–a]\s*(\d+)\s*p/);
  if (m) {
    const min = Number(m[1]);
    const max = Number(m[2]);
    if (min > 0 && max >= min) {
      return { min, max };
    }
  }
  m = clean.match(/hasta\s+(\d+)\s*p/);
  if (m) {
    const max = Number(m[1]);
    if (max > 0) {
      return { min: Math.max(1, max - 4), max };
    }
  }
  m = clean.match(/(\d+)\s*p/);
  if (m) {
    const n = Number(m[1]);
    if (n > 0) {
      return { min: n - 2, max: n + 2 };
    }
  }
  return null;
}

export function buildVariantesProductos(): VarianteProducto[] {
  const variantes: VarianteProducto[] = [];

  for (const p of productosChatbot) {
    if (p.tamanos?.length) {
      for (const t of p.tamanos) {
        const rango = extraerRangoPersonasDesdeNombre(t.nombre);
        let personasMin = 0;
        let personasMax = 0;

        if (rango) {
          personasMin = rango.min;
          personasMax = rango.max;
        } else if (typeof p.rindePersonas === 'number') {
          personasMin = Math.max(1, Math.round(p.rindePersonas * 0.8));
          personasMax = Math.round(p.rindePersonas * 1.1);
        } else {
          personasMin = 8;
          personasMax = 12;
        }

        variantes.push({
          producto: p,
          tamanoId: t.id,
          nombreTamano: t.nombre,
          precio: t.precio,
          personasMin,
          personasMax
        });
      }
    } else {
      if (!p.rindePersonas) continue;
      const personasMin = Math.max(1, Math.round(p.rindePersonas * 0.8));
      const personasMax = Math.round(p.rindePersonas * 1.1);

      variantes.push({
        producto: p,
        tamanoId: undefined,
        nombreTamano: `${p.rindePersonas} personas aprox.`,
        precio: p.precio,
        personasMin,
        personasMax
      });
    }
  }
  return variantes;
}

export function sugerirProductosParaPersonas(
  personasSolicitadas: number,
  maxResultados = 3
): SugerenciaPorciones[] {
  if (!Number.isFinite(personasSolicitadas) || personasSolicitadas <= 0) {
    return [];
  }

  const variantes = buildVariantesProductos();
  const sugerencias: SugerenciaPorciones[] = [];

  for (const variante of variantes) {
    if (variante.personasMax <= 0) continue;
    const cantidad = Math.ceil(personasSolicitadas / variante.personasMax);
    const totalMin = variante.personasMin * cantidad;
    const totalMax = variante.personasMax * cantidad;

    if (totalMax < personasSolicitadas) continue;

    const totalPrecio = variante.precio * cantidad;

    sugerencias.push({
      variantes: [{ variante, cantidad }],
      totalPersonasMin: totalMin,
      totalPersonasMax: totalMax,
      totalPrecio
    });
  }

  sugerencias.sort((a, b) => {
    const sobranteA = a.totalPersonasMin - personasSolicitadas;
    const sobranteB = b.totalPersonasMin - personasSolicitadas;
    if (sobranteA !== sobranteB) return sobranteA - sobranteB;
    return a.totalPrecio - b.totalPrecio;
  });

  return sugerencias.slice(0, maxResultados);
}

export function formatearSugerenciasPorciones(
  personasSolicitadas: number,
  sugerencias: SugerenciaPorciones[]
): string {
  if (!sugerencias.length) {
    return `No tengo una combinación clara de tortas para *${personasSolicitadas}* personas. Te recomiendo hablar con una persona del equipo para que te asesore mejor 🧁`;
  }

  const partes: string[] = [];
  partes.push(
    `No tengo una sola torta exacta para *${personasSolicitadas}* personas, pero estas opciones se ajustan bastante:`
  );
  partes.push('');

  sugerencias.forEach((sug, idx) => {
    const lineaProductos = sug.variantes
      .map(({ variante, cantidad }) => {
        const baseNombre = `${variante.producto.nombre} - ${variante.nombreTamano}`;
        if (cantidad === 1) return baseNombre;
        return `${cantidad}× ${baseNombre}`;
      })
      .join(' + ');

    const rangoTxt = `${sug.totalPersonasMin}–${sug.totalPersonasMax} personas aprox.`;
    const precioTxt = clp.format(sug.totalPrecio);

    partes.push(
      `${idx + 1}. ${lineaProductos}\n   → Rinde: ${rangoTxt}\n   → Total aprox.: ${precioTxt}`
    );
  });

  partes.push(
    '\nSi te gusta alguna opción, dime el número (1, 2, 3...) o escríbeme qué prefieres y seguimos con el pedido.'
  );

  return partes.join('\n');
}

// ✅ ESTA ES LA FUNCIÓN QUE FALTABA
export function selectTamanoPorPersonas(producto: Producto, personas: number | null): { nombre: string; precio: number } | null {
  if (!personas || personas <= 0) return null;

  // Usamos la lógica de variantes que ya construimos para buscar el mejor match dentro de ESTE producto
  const variantes = buildVariantesProductos().filter(v => v.producto.id === producto.id);
  
  if (!variantes.length) return null;

  let best = null;
  let minDiff = Infinity;

  for (const v of variantes) {
    // Usamos el promedio entre min y max como "tamaño ideal"
    const avg = (v.personasMin + v.personasMax) / 2;
    const diff = Math.abs(avg - personas);
    
    if (diff < minDiff) {
      minDiff = diff;
      best = v;
    }
  }

  if (best) {
    return { nombre: best.nombreTamano, precio: best.precio };
  }
  
  return null;
}