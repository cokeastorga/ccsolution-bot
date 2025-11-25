// src/lib/chatbot/engine.ts
import {
  buildMenuResumen,
  buscarProductoPorTexto,
  formatearDetalleProducto,
  sugerirProductosParaPersonas,
  formatearSugerenciasPorciones
} from '$lib/chatbot/catalog/productos';
import { buildImageUrl } from '$lib/chatbot/utils/images';
import { aiUnderstand, type AiNLUResult } from '$lib/chatbot/aiUnderstanding';

export type Channel = 'whatsapp' | 'web';

export type IntentId =
  | 'greeting'
  | 'smalltalk'
  | 'order_start'
  | 'order_status'
  | 'faq_hours'
  | 'faq_menu'
  | 'handoff_human'
  | 'goodbye'
  | 'fallback';

type SettingsMeta = {
  businessName?: string;
  hours?: {
    timezone?: string;
    weekdays?: string;
    saturday?: string;
    sunday?: string;
  };
  messages?: {
    welcome?: string;
    inactivity?: string;
    handoff?: string;
    closing?: string;
  };
};

export interface BotContext {
  conversationId: string;
  userId?: string;
  channel: Channel;
  text: string;
  locale?: 'es' | 'en';
  previousState?: string | null;
  metadata?: Record<string, unknown>;
}

export interface IntentMatch {
  id: IntentId;
  confidence: number; // 0–1
  reason: string;
}

export interface BotResponse {
  reply: string;
  intent: IntentMatch;
  nextState?: string | null;
  needsHuman?: boolean;
  meta?: Record<string, unknown>;
  media?: Array<{
    type: 'image';
    url: string;
    caption?: string;
  }>;
}

/**
 * Borrador de pedido.
 * NOTA: Usamos `| null` en producto para que Firestore no falle si lo limpiamos.
 */
type OrderDraft = {
  producto?: string | null;   // <--- CAMBIO IMPORTANTE: acepta null
  personas?: number;
  deliveryMode?: DeliveryMode;
  direccion?: string;
  sucursal?: string;
  fechaIso?: string;
  hora?: string;
  extras?: string;
  confirmado?: boolean;
};

/**
 * Normaliza texto para hacer matching más robusto.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Extrae cantidad de personas desde el texto.
 */
function extractPersonCount(text: string): number | null {
  const re = /(\d{1,3})\s*(personas?|prs|pax)?/gi;
  let match: RegExpExecArray | null;
  let best: number | null = null;

  while ((match = re.exec(text)) !== null) {
    const value = parseInt(match[1], 10);
    if (value > 0 && value <= 200) {
      best = value;
    }
  }

  return best;
}

/**
 * Extrae palabras tipo "chica", "mediana", "grande"
 */
type SizeKeyword = 'chico' | 'mediano' | 'grande';

function extractSizeKeyword(text: string): SizeKeyword | null {
  const n = normalize(text);

  if (n.includes('chico') || n.includes('chica') || n.includes('pequen')) {
    return 'chico';
  }
  if (n.includes('mediano') || n.includes('mediana')) {
    return 'mediano';
  }
  if (n.includes('grande') || n.includes('familiar')) {
    return 'grande';
  }

  return null;
}

/**
 * Intenta seleccionar un tamaño de producto según cantidad de personas.
 */
function selectTamanoPorPersonas(producto: any, personas: number | null) {
  if (!producto || !personas || !Array.isArray(producto.tamanos)) return null;

  let best: any = null;
  let bestDiff = Infinity;

  for (const t of producto.tamanos) {
    if (typeof t.personas !== 'number') continue;
    const diff = Math.abs(t.personas - personas);
    if (diff < bestDiff) {
      best = t;
      bestDiff = diff;
    }
  }

  return best;
}

/**
 * Deducción simple de modo de entrega.
 */
type DeliveryMode = 'retiro' | 'delivery';

function extractDeliveryMode(text: string): DeliveryMode | null {
  const n = normalize(text);

  if (
    n.includes('retiro') ||
    n.includes('retirar') ||
    n.includes('local') ||
    n.includes('tienda')
  ) {
    return 'retiro';
  }

  if (
    n.includes('delivery') ||
    n.includes('despacho') ||
    n.includes('envio') ||
    n.includes('enviar')
  ) {
    return 'delivery';
  }

  return null;
}

/**
 * Detección básica de fecha
 */
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre'
];

const DIAS = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'miércoles',
  'jueves',
  'viernes',
  'sabado',
  'sábado'
];

type DateInfo = {
  raw: string;
  iso?: string;
};

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function formatIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function extractDateInfo(text: string): DateInfo | null {
  const n = normalize(text);
  const base = startOfToday();

  if (n.includes('hoy')) {
    return { raw: 'hoy', iso: formatIso(base) };
  }

  if (n.includes('manana')) {
    return { raw: 'mañana', iso: formatIso(addDays(base, 1)) };
  }

  if (n.includes('pasado manana') || n.includes('pasado maniana')) {
    return { raw: 'pasado mañana', iso: formatIso(addDays(base, 2)) };
  }

  for (let i = 0; i < DIAS.length; i++) {
    const dia = DIAS[i];
    const diaNorm = normalize(dia);
    if (n.includes(diaNorm)) {
      const todayIdx = base.getDay();
      let diff = i - todayIdx;
      if (diff <= 0) diff += 7;
      const target = addDays(base, diff);
      return { raw: dia, iso: formatIso(target) };
    }
  }

  const dm = /(\d{1,2})\s+de\s+([a-záéíóú]+)/i.exec(n);
  if (dm) {
    const diaNum = parseInt(dm[1], 10);
    const mesStr = dm[2];
    const mesIdx = MESES.findIndex(
      (m) => normalize(m) === normalize(mesStr)
    );
    if (mesIdx >= 0 && diaNum >= 1 && diaNum <= 31) {
      const now = new Date();
      let year = now.getFullYear();
      const target = new Date(year, mesIdx, diaNum);

      if (target < base) {
        year += 1;
      }

      const fixed = new Date(year, mesIdx, diaNum);
      return {
        raw: `${diaNum} de ${MESES[mesIdx]}`,
        iso: formatIso(fixed)
      };
    }
  }

  return null;
}

function formatFechaLabel(info: DateInfo | null): string | null {
  if (!info) return null;
  if (info.iso) {
    const [y, m, d] = info.iso.split('-');
    return `${d}-${m}-${y} (${info.raw})`;
  }
  return info.raw;
}

function extractTime(text: string): string | null {
  const n = normalize(text);
  const match = /(\d{1,2})[:.](\d{2})/.exec(n);
  if (match) {
    const hh = parseInt(match[1], 10);
    const mm = match[2];
    if (hh >= 0 && hh <= 23) {
      const hhStr = hh.toString().padStart(2, '0');
      return `${hhStr}:${mm}`;
    }
  }
  return null;
}

/**
 * Fusiona el borrador previo con los slots devueltos por la IA
 */
function mergeOrderDraft(
  previous: OrderDraft | undefined,
  aiSlots: any,
  ctx: BotContext
): OrderDraft {
  const draft: OrderDraft = { ...(previous ?? {}) };

  if (aiSlots?.producto) {
    draft.producto = aiSlots.producto;
  }

  if (typeof aiSlots?.personas === 'number') {
    draft.personas = aiSlots.personas;
  } else if (!draft.personas) {
    const fromText = extractPersonCount(ctx.text);
    if (fromText) {
      draft.personas = fromText;
    }
  }

  if (aiSlots?.deliveryMode === 'retiro' || aiSlots?.deliveryMode === 'delivery') {
    draft.deliveryMode = aiSlots.deliveryMode;
  }

  if (aiSlots?.fechaIso) {
    draft.fechaIso = aiSlots.fechaIso;
  }

  const posibleHora = extractTime(ctx.text);
  if (posibleHora) {
    draft.hora = posibleHora;
  }

  const n = normalize(ctx.text);

  // Confirmación simple
  if (
    n.includes('esta bien') ||
    n.includes('está bien') ||
    n.includes('eso es lo que quiero') ||
    n.includes('si, esta bien') ||
    n.includes('sí, está bien') ||
    n.includes('ok') ||
    n.includes('si por favor')
  ) {
    draft.confirmado = true;
  }

  // Dirección
  if (!draft.direccion) {
    if (
      n.includes('av ') ||
      n.includes('avenida') ||
      n.includes('calle') ||
      n.includes('pasaje')
    ) {
      draft.direccion = ctx.text.trim();
    }
  }

  // Extras: velas / mensaje
  if (!draft.extras && (n.includes('vela') || n.includes('mensaje'))) {
    draft.extras = ctx.text.trim();
  }

  return draft;
}

function buildOrderSummary(draft: OrderDraft): string {
  const partes: string[] = [];

  if (draft.producto) {
    partes.push(`• Producto: *${draft.producto}*`);
  }
  if (draft.personas) {
    partes.push(`• Para: *${draft.personas}* personas`);
  }
  if (draft.deliveryMode === 'retiro') {
    partes.push('• Modalidad: *retiro en local*');
  } else if (draft.deliveryMode === 'delivery') {
    partes.push('• Modalidad: *delivery*');
  }
  if (draft.direccion) {
    partes.push(`• Dirección de referencia: *${draft.direccion}*`);
  }
  if (draft.sucursal) {
    partes.push(`• Sucursal sugerida: *${draft.sucursal}*`);
  }
  if (draft.fechaIso) {
    partes.push(`• Fecha: *${draft.fechaIso}*`);
  }
  if (draft.hora) {
    partes.push(`• Hora: *${draft.hora}*`);
  }
  if (draft.extras) {
    partes.push(`• Extras: *${draft.extras}*`);
  }

  return partes.join('\n');
}

/**
 * Construye una respuesta rica cuando detectamos un producto
 */
function buildProductoOrderResponse(
  producto: any,
  ctx: BotContext,
  intent: IntentMatch,
  lineBreak: string
): BotResponse {
  const aiSlots = (ctx.metadata as any)?.aiSlots as
    | {
        personas?: number;
        deliveryMode?: DeliveryMode;
        fechaIso?: string;
      }
    | undefined;

  const personas =
    aiSlots?.personas ?? extractPersonCount(ctx.text);

  const sizeKeyword = extractSizeKeyword(ctx.text);
  const deliveryMode =
    aiSlots?.deliveryMode ?? extractDeliveryMode(ctx.text);

  const dateInfoFromIa = aiSlots?.fechaIso
    ? { raw: 'según IA', iso: aiSlots.fechaIso }
    : null;

  const dateInfo = dateInfoFromIa ?? extractDateInfo(ctx.text);
  const fechaLabel = formatFechaLabel(dateInfo);

  const imageUrl = buildImageUrl(producto.imagen);
  let reply = formatearDetalleProducto(producto);

  const detalles: string[] = [];

  if (personas && Array.isArray(producto.tamanos) && producto.tamanos.length > 0) {
    const maxTamano = producto.tamanos.reduce(
      (max: any, t: any) =>
        typeof t.personas === 'number' && t.personas > (max?.personas ?? 0)
          ? t
          : max,
      null as any
    );

    if (maxTamano && typeof maxTamano.personas === 'number') {
      if (personas <= maxTamano.personas) {
        const tamano = selectTamanoPorPersonas(producto, personas);
        if (tamano) {
          detalles.push(
            `• Para *${personas}* personas te recomiendo el tamaño *${tamano.nombre ?? 'estándar'}* (aprox. ${tamano.personas} pors.).`
          );
          if (typeof tamano.precio === 'number') {
            detalles.push(
              `• Valor de referencia: *$${tamano.precio.toLocaleString('es-CL')}*`
            );
          }
        }
      } else {
        const tortasNecesarias = Math.ceil(personas / maxTamano.personas);
        detalles.push(
          `• Para *${personas}* personas no tenemos una sola torta tan grande, ` +
            `pero podemos ofrecerte *${tortasNecesarias}* tortas del tamaño más grande (${maxTamano.personas} personas aprox. cada una).`
        );
        if (typeof maxTamano.precio === 'number') {
          const total = tortasNecesarias * maxTamano.precio;
          detalles.push(
            `• Valor aproximado por esas ${tortasNecesarias} tortas: *$${total.toLocaleString(
              'es-CL'
            )}*`
          );
        }
      }
    }
  } else if (personas) {
    detalles.push(`• Para *${personas}* personas (sin tamaño específico en catálogo).`);
  }

  if (sizeKeyword) {
    if (sizeKeyword === 'chico') {
      detalles.push('• Tamaño deseado: *chico*');
    } else if (sizeKeyword === 'mediano') {
      detalles.push('• Tamaño deseado: *mediano*');
    } else if (sizeKeyword === 'grande') {
      detalles.push('• Tamaño deseado: *grande*');
    }
  }

  if (deliveryMode === 'retiro') {
    detalles.push('• Modalidad: *retiro en local*');
  } else if (deliveryMode === 'delivery') {
    detalles.push('• Modalidad: *delivery / despacho*');
  }

  if (fechaLabel) {
    detalles.push(`• Para el día: *${fechaLabel}*`);
  }

  if (detalles.length > 0) {
    reply +=
      lineBreak +
      lineBreak +
      `Con lo que me dices, esto es lo que entendí:` +
      lineBreak +
      detalles.join(lineBreak) +
      lineBreak +
      lineBreak +
      `¿Está bien así o quieres ajustar *personas, fecha o modalidad*?`;
  } else {
    reply +=
      lineBreak +
      lineBreak +
      `Para ayudarte mejor, dime:` +
      lineBreak +
      `• Para cuántas personas es la torta` +
      lineBreak +
      `• Para qué día la necesitas` +
      lineBreak +
      `• Si es para *retiro* o *delivery*`;
  }

  const meta: Record<string, unknown> = {
    ...((ctx.metadata ?? {}) as any),
    productoId: producto.id,
    channel: ctx.channel,
    personas: personas ?? undefined
  };

  return {
    reply,
    intent: {
      ...intent,
      id: 'order_start'
    },
    nextState: 'collecting_order_details',
    needsHuman: false,
    meta,
    media: [
      {
        type: 'image',
        url: imageUrl,
        caption: producto.nombre
      }
    ]
  };
}

export function detectIntent(
  text: string,
  previousState?: string | null
): IntentMatch {
  const normalized = normalize(text);

  const hasAny = (keywords: string[]) =>
    keywords.some((k) => normalized.includes(k));

  if (previousState === 'collecting_order_details') {
    if (hasAny(['confirmar', 'listo', 'ok', 'estaria bien', 'ya'])) {
      return {
        id: 'order_start',
        confidence: 0.95,
        reason: 'Confirmación dentro de flujo de pedido'
      };
    }

    return {
      id: 'order_start',
      confidence: 0.85,
      reason: 'Seguimos recogiendo detalles del pedido'
    };
  }

  if (
    hasAny([
      'hola',
      'buenas',
      'buen dia',
      'buenos dias',
      'buenas tardes',
      'buenas noches',
      'alo'
    ])
  ) {
    return {
      id: 'greeting',
      confidence: 0.9,
      reason: 'Saludo detectado por palabras clave'
    };
  }

  if (
    hasAny([
      'gracias',
      'muchas gracias',
      'chau',
      'adios',
      'nos vemos',
      'hasta luego',
      'vale gracias'
    ])
  ) {
    return {
      id: 'goodbye',
      confidence: 0.85,
      reason: 'Despedida detectada'
    };
  }

  if (
    hasAny([
      'pedido',
      'orden',
      'comprar',
      'encargar',
      'quiero un kuchen',
      'quiero una torta',
      'hacer un pedido',
      'quiero pedir',
      'quiero pedir una torta',
      'quisiera pedir',
      'necesito pedir',
      'quiero encargar',
      'quisiera encargar'
    ])
  ) {
    return {
      id: 'order_start',
      confidence: 0.92,
      reason: 'Intención de realizar pedido detectada'
    };
  }

  if (
    hasAny([
      'estado de mi pedido',
      'mi pedido',
      'cuando llega',
      'seguimiento',
      'tracking'
    ])
  ) {
    return {
      id: 'order_status',
      confidence: 0.9,
      reason: 'Consulta de estado de pedido detectada'
    };
  }

  if (
    hasAny([
      'horario',
      'horarios',
      'abren',
      'cierran',
      'a que hora',
      'atienden',
      'apertura',
      'cierre',
      'hasta que hora atienden'
    ])
  ) {
    return {
      id: 'faq_hours',
      confidence: 0.88,
      reason: 'Consulta de horarios detectada'
    };
  }

  const containsTortaPalabra =
    normalized.includes('torta') || normalized.includes('tortas');

  const containsPreguntaMenu = hasAny([
    'menu',
    'carta',
    'productos',
    'lista de precios',
    'catalogo',
    'catálogo',
    'lista',
    'variedades',
    'opciones',
    'catalogo de tortas',
    'catalogo de productos',
    'ver el menu',
    'ver el menú',
    'ver menu',
    'ver catálogo',
    'ver catalogo',
    'ver productos',
    'tortas disponibles',
    'tipos de tortas',
    'que tortas tienen',
    'que tortas hay',
    'que torta tienen',
    'que torta hay',
    'quiero ver las tortas',
    'ver las tortas',
    'mostrar tortas',
    'muestrame las tortas',
    'muéstrame las tortas'
  ]);

  if (
    containsPreguntaMenu ||
    (containsTortaPalabra &&
      hasAny(['que', 'ver', 'mostrar', 'muestrame', 'muéstrame', 'hay', 'tienen']))
  ) {
    return {
      id: 'faq_menu',
      confidence: 0.93,
      reason: 'Consulta de menú / tortas detectada'
    };
  }

  if (
    hasAny([
      'hablar con una persona',
      'hablar con humano',
      'asesor',
      'ejecutivo',
      'persona real',
      'atencion al cliente',
      'vendedor',
      'encargado',
      'dueño',
      'duenio'
    ])
  ) {
    return {
      id: 'handoff_human',
      confidence: 0.95,
      reason: 'Usuario solicita atención humana'
    };
  }

  if (hasAny(['como estas', 'que tal', 'quien eres', 'que haces'])) {
    return {
      id: 'smalltalk',
      confidence: 0.7,
      reason: 'Smalltalk detectado'
    };
  }

  return {
    id: 'fallback',
    confidence: 0.3,
    reason: 'No se encontraron patrones claros; se usa fallback'
  };
}

function buildOrderConversationReply(
  draft: OrderDraft,
  ctx: BotContext,
  intent: IntentMatch,
  lineBreak: string
): BotResponse {
  const settings = (((ctx.metadata ?? {}) as any).settings ??
    {}) as SettingsMeta;

  const businessName = settings.businessName ?? 'Delicias Porteñas';
  const aiReply =
    ((ctx.metadata ?? {}) as any).aiGeneratedReply as string | undefined;

  const producto = buscarProductoPorTexto(draft.producto || '');
  const baseMeta = { ...((ctx.metadata ?? {}) as any), orderDraft: draft };

  // ============================================================
  // 🛡️ VALIDACIÓN DE SEGURIDAD
  // ============================================================
  if (draft.producto && !producto) {
    // ✅ SOLUCIÓN: Usamos 'null' en vez de 'undefined'
    const draftCorregido = { ...draft, producto: null };
    const menu = buildMenuResumen(3);

    const reply = 
      `Mmm... lo siento 😅, pero no encuentro una torta llamada *"${draft.producto}"* en nuestro catálogo actual.` +
      lineBreak +
      lineBreak +
      `Aquí te dejo nuestras opciones disponibles:` +
      lineBreak +
      lineBreak +
      menu +
      lineBreak +
      lineBreak +
      `¿Te gustaría probar alguna de estas?`;

    return {
      reply,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: { ...baseMeta, orderDraft: draftCorregido }
    };
  }
  // ============================================================

  // 1) Si aún no sabemos qué producto
  if (!draft.producto) {
    if (draft.personas) {
      const sugerencias = sugerirProductosParaPersonas(draft.personas);
      const textoSugerencias = formatearSugerenciasPorciones(
        draft.personas,
        sugerencias
      );

      const intro =
        aiReply && aiReply.trim().length > 0
          ? aiReply + lineBreak + lineBreak
          : '';

      const reply =
        intro +
        textoSugerencias +
        lineBreak +
        lineBreak +
        `Si prefieres una torta específica, dime el nombre (por ejemplo: "Torta Alpina", "Torta Mil Hojas", "Torta Selva Negra").`;

      return {
        reply,
        intent,
        nextState: 'collecting_order_details',
        needsHuman: false,
        meta: { ...((ctx.metadata ?? {}) as any), orderDraft: draft }
      };
    }

    const replyBase =
      aiReply && aiReply.trim().length > 0
        ? aiReply
        : `¡Claro! 😊 Cuéntame qué torta te gustaría encargar.`;
    const reply =
      replyBase +
      lineBreak +
      `Por ejemplo: "Torta Alpina", "Torta Mil Hojas" o "Torta Trufa".`;

    return {
      reply,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: { ...((ctx.metadata ?? {}) as any), orderDraft: draft }
    };
  }

  // 2) Tenemos producto VALIDADO pero aún no personas
  if (!draft.personas) {
    if (producto) {
      const imageUrl = buildImageUrl(producto.imagen);
      const detalle = formatearDetalleProducto(producto);

      const replyIntro =
        aiReply && aiReply.trim().length > 0
          ? aiReply
          : `Perfecto, aquí tienes la información de *${producto.nombre}* 🍰`;

      const reply =
        replyIntro +
        lineBreak +
        lineBreak +
        detalle +
        lineBreak +
        lineBreak +
        `¿Para cuántas personas sería aproximadamente?`;

      return {
        reply,
        intent,
        nextState: 'collecting_order_details',
        needsHuman: false,
        meta: baseMeta,
        media: [
          {
            type: 'image',
            url: imageUrl,
            caption: producto.nombre
          }
        ]
      };
    }
    
    return {
      reply: `¿Para cuántas personas sería la torta?`,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: baseMeta
    };
  }

  // 3) Ya tenemos producto + personas -> sugerir tamaño y preguntar modalidad
  if (!draft.deliveryMode) {
    let sugerencia = '';
    if (producto && Array.isArray(producto.tamanos) && producto.tamanos.length > 0) {
      const personas = draft.personas!;
      const maxTamano = producto.tamanos.reduce(
        (max: any, t: any) =>
          typeof t.personas === 'number' && t.personas > (max?.personas ?? 0)
            ? t
            : max,
        null as any
      );

      if (maxTamano && typeof maxTamano.personas === 'number') {
        if (personas <= maxTamano.personas) {
          const tam = selectTamanoPorPersonas(producto, personas);
          if (tam) {
            sugerencia =
              lineBreak +
              `Para *${personas}* personas te recomiendo el tamaño *${
                tam.nombre ?? 'estándar'
              }* (aprox. ${tam.personas} pors.).` +
              (typeof tam.precio === 'number'
                ? lineBreak +
                  `Valor de referencia aprox.: *$${tam.precio.toLocaleString(
                    'es-CL'
                  )}*`
                : '');
          }
        } else {
          const tortasNecesarias = Math.ceil(personas / maxTamano.personas);
          const total =
            typeof maxTamano.precio === 'number'
              ? tortasNecesarias * maxTamano.precio
              : null;

          sugerencia =
            lineBreak +
            `Para *${personas}* personas no tenemos una sola torta tan grande, ` +
            `pero podemos ofrecerte *${tortasNecesarias}* tortas de *${
              producto.nombre
            }* tamaño grande (${maxTamano.personas} personas aprox. cada una).` +
            (total
              ? lineBreak +
                `Valor estimado por las ${tortasNecesarias} tortas: *$${total.toLocaleString(
                  'es-CL'
                )}*`
              : '');
        }
      }
    }

    const replyIntro =
      aiReply && aiReply.trim().length > 0
        ? aiReply
        : `Genial, *${draft.producto}* para *${draft.personas}* personas 🥳`;

    const reply =
      replyIntro +
      sugerencia +
      lineBreak +
      lineBreak +
      `¿La quieres para *retiro en local* o prefieres *delivery*?`;

    return {
      reply,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: baseMeta
    };
  }

  // 4) Si es retiro, pedir dirección
  if (draft.deliveryMode === 'retiro' && !draft.direccion) {
    const replyIntro =
      aiReply && aiReply.trim().length > 0
        ? aiReply
        : `Perfecto, *retiro en local* ✅`;

    const reply =
      replyIntro +
      lineBreak +
      `¿Me puedes contar en qué sector o dirección te encuentras (por ejemplo "Av Francia")? Así te recomiendo la sucursal más cercana.`;

    return {
      reply,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: baseMeta
    };
  }

  // 5) Si ya tenemos dirección pero no sucursal
  if (draft.deliveryMode === 'retiro' && draft.direccion && !draft.sucursal) {
    draft.sucursal = 'Sucursal Av. Francia ####';

    const replyIntro =
      aiReply && aiReply.trim().length > 0
        ? aiReply
        : `¡Perfecto! Gracias por la info 🗺️`;

    const reply =
      replyIntro +
      lineBreak +
      `La sucursal más cercana a *${draft.direccion}* es: *${draft.sucursal}*.` +
      lineBreak +
      `¿Para qué día y a qué hora te gustaría retirar la torta?`;

    return {
      reply,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: { ...baseMeta, orderDraft: draft }
    };
  }

  // 6) Fecha/hora
  if (!draft.fechaIso || !draft.hora) {
    const replyIntro =
      aiReply && aiReply.trim().length > 0
        ? aiReply
        : `Vamos afinando los detalles 🗓️`;

    const reply =
      replyIntro +
      lineBreak +
      `¿Para qué día y a qué hora necesitas tu *${draft.producto}*?` +
      lineBreak +
      `Por ejemplo: "para este viernes a las 14:00 hrs".`;

    return {
      reply,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: baseMeta
    };
  }

  // 7) Extras
  if (!draft.extras) {
    const replyIntro =
      aiReply && aiReply.trim().length > 0
        ? aiReply
        : `Anotado 🗓️ *${draft.fechaIso}* a las *${draft.hora}*.`;

    const reply =
      replyIntro +
      lineBreak +
      `¿Quieres agregar algo más? Por ejemplo: velas, mensaje en la torta ("Feliz Cumpleaños"), etc. 🎉`;

    return {
      reply,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: baseMeta
    };
  }

  // 8) Confirmación final
  if (!draft.confirmado) {
    const resumen = buildOrderSummary(draft);

    const replyIntro =
      aiReply && aiReply.trim().length > 0
        ? aiReply
        : `Perfecto, con lo que me has dicho este sería tu pedido:`;

    const reply =
      replyIntro +
      lineBreak +
      resumen +
      lineBreak +
      lineBreak +
      `¿Está bien así tal cual o quieres cambiar algo antes de enviarlo a una persona del equipo para confirmar? 🙂`;

    return {
      reply,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: baseMeta
    };
  }

  // 9) Ya confirmado → derivar a humano
  const resumen = buildOrderSummary(draft);

  const reply =
    `¡Excelente! 🙌` +
    lineBreak +
    `Voy a derivar tu pedido a una persona del equipo de ${businessName} para que lo revise y te contacte por este mismo número.` +
    lineBreak +
    lineBreak +
    `Resumen del pedido:` +
    lineBreak +
    resumen +
    lineBreak +
    lineBreak +
    `¡Muchas gracias por preferirnos! 💛`;

  return {
    reply,
    intent,
    nextState: 'handoff_requested',
    needsHuman: true,
    meta: baseMeta
  };
}

export function buildReply(intent: IntentMatch, ctx: BotContext): BotResponse {
  const isWhatsApp = ctx.channel === 'whatsapp';
  const settings = (((ctx.metadata ?? {}) as any).settings ?? {}) as SettingsMeta;
  const businessName = settings.businessName ?? 'Delicias Porteñas';
  const lineBreak = isWhatsApp ? '\n' : '\n';

  let reply = '';
  let nextState: string | null = ctx.previousState ?? null;
  let needsHuman = false;

  switch (intent.id) {
    case 'greeting': {
      reply = settings.messages?.welcome ??
        `¡Hola! 👋 Soy Edu, el asistente virtual de ${businessName}.\nPuedo ayudarte a hacer pedidos y consultar productos.`;
      nextState = 'idle';
      break;
    }
    case 'smalltalk': {
      reply = `Estoy aquí para ayudarte con tus pedidos y consultas 😊\nSi quieres, puedes decirme: "Quiero hacer un pedido".`;
      nextState = 'idle';
      break;
    }
    case 'order_start': {
      const producto = buscarProductoPorTexto(ctx.text);
      if (producto) {
        return buildProductoOrderResponse(producto, ctx, intent, lineBreak);
      }
      reply = `Perfecto, iniciemos tu pedido 🧁\n¿Qué te gustaría pedir? (ej: "Torta Alpina", "Torta Mil Hojas").`; 
      nextState = 'collecting_order_details';
      break;
    }
    case 'order_status': {
      reply = `Para revisar el estado de tu pedido necesito algún dato de referencia 🧾`;
      nextState = 'awaiting_order_reference';
      break;
    }
    case 'faq_hours': {
      const h = settings.hours ?? {};
      reply = `Horarios de ${businessName}:\nL-V: ${h.weekdays}\nSáb: ${h.saturday}\n${h.sunday}`;
      nextState = ctx.previousState ?? 'idle';
      break;
    }
    case 'faq_menu': {
      const resumen = buildMenuResumen(4);
      reply = `Te comparto nuestras tortas 🍰\n\n${resumen}\n\nDime cuál te interesa cotizar.`;
      nextState = ctx.previousState ?? 'idle';
      break;
    }
    case 'handoff_human': {
      reply = settings.messages?.handoff ?? `Derivo tu consulta a una persona del equipo 👤.`;
      nextState = 'handoff_requested';
      needsHuman = true;
      break;
    }
    case 'goodbye': {
      reply = settings.messages?.closing ?? `¡Gracias! Si necesitas algo más, aquí estaré.`;
      nextState = 'ended';
      break;
    }
    case 'fallback':
    default: {
      const producto = buscarProductoPorTexto(ctx.text);
      if (producto) {
        return buildProductoOrderResponse(producto, ctx, intent, lineBreak);
      }
      reply = `No entendí bien 🤔. ¿Podrías decirme, por ejemplo: "Quiero hacer un pedido"?`;
      nextState = ctx.previousState ?? 'idle';
      break;
    }
  }

  return {
    reply,
    intent,
    nextState,
    needsHuman,
    meta: {
      channel: ctx.channel,
      locale: ctx.locale ?? 'es',
      previousState: ctx.previousState ?? null
    }
  };
}

export async function processMessage(ctx: BotContext): Promise<BotResponse> {
  const ruleIntent = detectIntent(ctx.text, ctx.previousState);
  const simpleIntents: IntentId[] = ['greeting', 'goodbye', 'faq_hours'];

  if (ruleIntent.confidence >= 0.85 && simpleIntents.includes(ruleIntent.id)) {
    return buildReply(ruleIntent, ctx);
  }

  let aiResult: AiNLUResult | null = null;
  try {
    aiResult = await aiUnderstand(ctx, ruleIntent.id);
  } catch (err) {
    console.error('❌ Error en aiUnderstand:', err);
  }

  if (aiResult && aiResult.intentId) {
    if (aiResult.slots?.producto) {
      aiResult.intentId = 'order_start';
      aiResult.confidence = 0.99;
    }

    const intent: IntentMatch = {
      id: aiResult.intentId,
      confidence: aiResult.confidence ?? 0.9,
      reason: `IA NLU`
    };

    const previousDraft = ((ctx.metadata ?? {}) as any).orderDraft as OrderDraft | undefined;
    const mergedDraft = mergeOrderDraft(previousDraft, aiResult.slots, ctx);

    const enhancedCtx: BotContext = {
      ...ctx,
      metadata: {
        ...(ctx.metadata ?? {}),
        aiSlots: aiResult.slots,
        aiNeedsHuman: aiResult.needsHuman ?? false,
        aiGeneratedReply: aiResult.generatedReply,
        orderDraft: mergedDraft
      }
    };

    const lineBreak = enhancedCtx.channel === 'whatsapp' ? '\n' : '\n';

    if (intent.id === 'order_start' || enhancedCtx.previousState === 'collecting_order_details') {
      return buildOrderConversationReply(mergedDraft, enhancedCtx, intent, lineBreak);
    }

    const response = buildReply(intent, enhancedCtx);
    if (aiResult.needsHuman) {
      response.needsHuman = true;
      response.nextState = 'handoff_requested';
    }
    return response;
  }

  return buildReply(ruleIntent, ctx);
}