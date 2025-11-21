// src/lib/chatbot/engine.ts
import {
  buildMenuResumen,
  buscarProductoPorTexto,
  formatearDetalleProducto
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
  /** Mensaje principal que debería ver el usuario */
  reply: string;
  /** Intención detectada */
  intent: IntentMatch;
  /** Nuevo estado conversacional sugerido */
  nextState?: string | null;
  /** Si el bot recomienda pasar a humano */
  needsHuman?: boolean;
  /** Datos extra para logs */
  meta?: Record<string, unknown>;

  /** Medios (por ej. imágenes) a enviar junto con el mensaje */
  media?: Array<{
    type: 'image';
    url: string;
    caption?: string;
  }>;
}

/**
 * Borrador de pedido que vamos rellenando paso a paso.
 */
type OrderDraft = {
  producto?: string; // "torta trufa", "torta alpina"
  personas?: number; // 12
  deliveryMode?: DeliveryMode; // 'retiro' | 'delivery'
  direccion?: string; // "Av Francia 1234"
  sucursal?: string; // "Sucursal Av Francia ####"
  fechaIso?: string; // "2025-11-21"
  hora?: string; // "14:00"
  extras?: string; // "velas, mensaje..."
  confirmado?: boolean; // true cuando el cliente dice "sí, está bien"
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
 * Soporta cosas como:
 * - "para 20 personas"
 * - "quiero una torta de 15"
 */
function extractPersonCount(text: string): number | null {
  const re = /(\d{1,3})\s*(personas?|prs|pax)?/gi;
  let match: RegExpExecArray | null;
  let best: number | null = null;

  while ((match = re.exec(text)) !== null) {
    const value = parseInt(match[1], 10);
    // Filtramos cosas ridículas (años tipo 2025)
    if (value > 0 && value <= 100) {
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
 * Asume producto.tamanos = [{ personas: number, precio: number, ... }]
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
 * Detección básica de fecha:
 * - hoy
 * - mañana
 * - pasado mañana
 * - lunes/martes/...
 * - "25 de febrero"
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

  // hoy / mañana / pasado mañana
  if (n.includes('hoy')) {
    return { raw: 'hoy', iso: formatIso(base) };
  }

  if (n.includes('manana')) {
    return { raw: 'mañana', iso: formatIso(addDays(base, 1)) };
  }

  if (n.includes('pasado manana') || n.includes('pasado maniana')) {
    return { raw: 'pasado mañana', iso: formatIso(addDays(base, 2)) };
  }

  // Días de la semana
  for (let i = 0; i < DIAS.length; i++) {
    const dia = DIAS[i];
    const diaNorm = normalize(dia);
    if (n.includes(diaNorm)) {
      const todayIdx = base.getDay(); // 0 domingo – 6 sábado
      let diff = i - todayIdx;
      if (diff <= 0) diff += 7; // próximo día de la semana
      const target = addDays(base, diff);
      return { raw: dia, iso: formatIso(target) };
    }
  }

  // "25 de febrero"
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

      // si la fecha ya pasó este año, asumimos próximo año
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

/**
 * Extrae una hora simple tipo "14:00" o "9:30".
 */
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
 * Fusiona el borrador previo con los slots devueltos por la IA + texto actual.
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
    n.includes('sí, está bien')
  ) {
    draft.confirmado = true;
  }

  // Dirección: intento simple
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

/**
 * Construye un resumen de pedido legible.
 */
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
 * Construye una respuesta rica cuando detectamos un producto (torta)
 * por las reglas (sin flujo guiado).
 */
function buildProductoOrderResponse(
  producto: any,
  ctx: BotContext,
  intent: IntentMatch,
  locale: 'es' | 'en',
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

  const tamanoSeleccionado = selectTamanoPorPersonas(producto, personas);

  const detalles: string[] = [];

  if (personas) {
    detalles.push(`• Para *${personas}* personas`);
  }

  if (tamanoSeleccionado && typeof tamanoSeleccionado.precio === 'number') {
    detalles.push(
      `• Valor de referencia: *$${tamanoSeleccionado.precio.toLocaleString(
        'es-CL'
      )}*`
    );
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
    locale,
    personas: personas ?? undefined,
    sizeKeyword: sizeKeyword ?? undefined,
    deliveryMode: deliveryMode ?? undefined,
    fechaRaw: dateInfo?.raw ?? undefined,
    fechaIso: dateInfo?.iso ?? undefined,
    tamanoSugeridoPersonas: tamanoSeleccionado?.personas ?? undefined,
    tamanoSugeridoPrecio: tamanoSeleccionado?.precio ?? undefined
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

/**
 * Regla simple de detección de intención basada en keywords.
 */
export function detectIntent(
  text: string,
  previousState?: string | null
): IntentMatch {
  const normalized = normalize(text);

  const hasAny = (keywords: string[]) =>
    keywords.some((k) => normalized.includes(k));

  // Si ya venimos en un flujo de pedido, favorecemos seguir en ese contexto
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

  // Greeting
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

  // Despedida
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

  // Pedido / orden
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

  // Estado de pedido
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

  // Horarios
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

  // 🔥 Menú / carta / productos / "tortas que tienen"
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

  // Hablar con humano
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

  // Smalltalk genérica
  if (hasAny(['como estas', 'que tal', 'quien eres', 'que haces'])) {
    return {
      id: 'smalltalk',
      confidence: 0.7,
      reason: 'Smalltalk detectado'
    };
  }

  // Fallback
  return {
    id: 'fallback',
    confidence: 0.3,
    reason: 'No se encontraron patrones claros; se usa fallback'
  };
}

/**
 * Flujo guiado de conversación de pedido.
 */
function buildOrderConversationReply(
  draft: OrderDraft,
  ctx: BotContext,
  intent: IntentMatch,
  lineBreak: string
): BotResponse {
  const settings = (((ctx.metadata ?? {}) as any).settings ??
    {}) as SettingsMeta;

  const businessName = settings.businessName ?? 'Delicias Porteñas';

  // 1) Si aún no sabemos qué producto
  if (!draft.producto) {
    return {
      reply:
        `¡Claro! 😊 Cuéntame qué torta te gustaría encargar.` +
        lineBreak +
        `Por ejemplo: "Torta Alpina", "Torta Mil Hojas" o "Torta Trufa".`,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: { ...((ctx.metadata ?? {}) as any), orderDraft: draft }
    };
  }

  // 2) Preguntar cantidad de personas
  if (!draft.personas) {
    return {
      reply:
        `Perfecto, entonces: *${draft.producto}* 🍰` +
        lineBreak +
        `¿Para cuántas personas sería aproximadamente?`,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: { ...((ctx.metadata ?? {}) as any), orderDraft: draft }
    };
  }

  // 3) Preguntar modalidad
  if (!draft.deliveryMode) {
    return {
      reply:
        `Genial, *${draft.producto}* para *${draft.personas}* personas 🥳` +
        lineBreak +
        `¿La quieres para *retiro en local* o prefieres *delivery*?`,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: { ...((ctx.metadata ?? {}) as any), orderDraft: draft }
    };
  }

  // 4) Si es retiro, pedir dirección para recomendar sucursal
  if (draft.deliveryMode === 'retiro' && !draft.direccion) {
    return {
      reply:
        `Perfecto, *retiro en local* ✅` +
        lineBreak +
        `¿Me puedes contar en qué sector o dirección te encuentras (por ejemplo "Av Francia")? Así te recomiendo la sucursal más cercana.`,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: { ...((ctx.metadata ?? {}) as any), orderDraft: draft }
    };
  }

  // 5) Si ya tenemos dirección pero no sucursal, sugerimos una (por ahora fija)
  if (draft.deliveryMode === 'retiro' && draft.direccion && !draft.sucursal) {
    draft.sucursal = 'Sucursal Av. Francia ####';

    return {
      reply:
        `¡Perfecto! Gracias por la info 🗺️` +
        lineBreak +
        `La sucursal más cercana a *${draft.direccion}* es: *${draft.sucursal}*.` +
        lineBreak +
        `¿Para qué día y a qué hora te gustaría retirar la torta?`,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: { ...((ctx.metadata ?? {}) as any), orderDraft: draft }
    };
  }

  // 6) Fecha/hora
  if (!draft.fechaIso || !draft.hora) {
    return {
      reply:
        `¿Para qué día y a qué hora necesitas tu *${draft.producto}*?` +
        lineBreak +
        `Por ejemplo: "para este viernes a las 14:00 hrs".`,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: { ...((ctx.metadata ?? {}) as any), orderDraft: draft }
    };
  }

  // 7) Extras
  if (!draft.extras) {
    return {
      reply:
        `Anotado 🗓️ *${draft.fechaIso}* a las *${draft.hora}*.` +
        lineBreak +
        `¿Quieres agregar algo más? Por ejemplo: velas, mensaje en la torta ("Feliz Cumpleaños Gemini"), etc. 🎉`,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: { ...((ctx.metadata ?? {}) as any), orderDraft: draft }
    };
  }

  // 8) Confirmación final
  if (!draft.confirmado) {
    const resumen = buildOrderSummary(draft);
    return {
      reply:
        `Perfecto, con lo que me has dicho este sería tu pedido:` +
        lineBreak +
        resumen +
        lineBreak +
        lineBreak +
        `¿Está bien así tal cual o quieres cambiar algo antes de enviarlo a una persona del equipo para confirmar? 🙂`,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: { ...((ctx.metadata ?? {}) as any), orderDraft: draft }
    };
  }

  // 9) Ya confirmado → derivar a humano
  const resumen = buildOrderSummary(draft);
  return {
    reply:
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
      `¡Muchas gracias por preferirnos! 💛`,
    intent,
    nextState: 'handoff_requested',
    needsHuman: true,
    meta: { ...((ctx.metadata ?? {}) as any), orderDraft: draft }
  };
}

/**
 * Construye el texto de respuesta según la intención y el contexto.
 */
export function buildReply(intent: IntentMatch, ctx: BotContext): BotResponse {
  const locale = ctx.locale ?? 'es';
  const isWhatsApp = ctx.channel === 'whatsapp';

  const settings = (((ctx.metadata ?? {}) as any).settings ??
    {}) as SettingsMeta;

  const businessName = settings.businessName ?? 'Delicias Porteñas';

  const lineBreak = isWhatsApp ? '\n' : '\n';

  let reply = '';
  let nextState: string | null = ctx.previousState ?? null;
  let needsHuman = false;

  switch (intent.id) {
    case 'greeting': {
      if (settings.messages?.welcome) {
        reply = settings.messages.welcome;
      } else {
        reply =
          `¡Hola! 👋 Soy Edu, el asistente virtual de ${businessName}.` +
          lineBreak +
          `Me encantan las facturitas y los paseos por la Costanera.` +
          lineBreak +
          `Puedo ayudarte a:` +
          lineBreak +
          `• Hacer un pedido` +
          lineBreak +
          `• Consultar horarios o productos` +
          lineBreak +
          `• Derivarte con una persona del equipo` +
          lineBreak +
          `Respóndeme de forma natural, estoy configurado para brindar una atención personalizada.`;
      }
      nextState = 'idle';
      break;
    }

    case 'smalltalk': {
      reply =
        `Estoy aquí para ayudarte con tus pedidos y consultas 😊` +
        lineBreak +
        `Si quieres, puedes decirme por ejemplo: "Quiero hacer un pedido" o "¿Cuáles son los horarios?"`;
      nextState = 'idle';
      break;
    }

    case 'order_start': {
      const producto = buscarProductoPorTexto(ctx.text);

      if (producto) {
        return buildProductoOrderResponse(producto, ctx, intent, locale, lineBreak);
      }

      reply =
        `Perfecto, iniciemos tu pedido 🧁` +
        lineBreak +
        `¿Qué te gustaría pedir? Puedes decir algo como:` +
        lineBreak +
        `• "Torta Selva Negra para 20 personas"` +
        lineBreak +
        `• "Torta Mil Hojas para el viernes"` +
        lineBreak +
        `• "Torta de Frambuesa para 12 personas"` +
        lineBreak +
        `Y dime también si es para *retiro* y en qué *sucursal*.`; 
      nextState = 'collecting_order_details';
      break;
    }

    case 'order_status': {
      reply =
        `Para revisar el estado de tu pedido necesito algún dato de referencia 🧾` +
        lineBreak +
        `Por ejemplo: número de pedido, nombre y fecha aproximada en que lo hiciste.`;
      nextState = 'awaiting_order_reference';
      break;
    }

    case 'faq_hours': {
      const h = settings.hours ?? {};
      reply =
        `Te cuento los horarios de ${businessName}:` +
        lineBreak +
        `🕒 Lunes a viernes: ${h.weekdays ?? '08:00 – 19:00'}` +
        lineBreak +
        `🕒 Sábados: ${h.saturday ?? '10:00 – 19:00'}` +
        lineBreak +
        `${
          h.sunday ??
          'Domingos y festivos: según disponibilidad (puedes consultar por aquí).'
        }`;
      nextState = ctx.previousState ?? 'idle';
      break;
    }

    case 'faq_menu': {
      const resumen = buildMenuResumen(4);

      reply =
        `Te comparto un resumen de nuestras tortas y productos de ${businessName} 🍰` +
        lineBreak +
        lineBreak +
        resumen +
        lineBreak +
        lineBreak +
        `Si quieres, dime el *nombre de la torta* (por ejemplo: "Torta Selva Negra", "Torta Alpina" o "Torta Mil Hojas") y para cuántas personas, y te ayudo a cotizar.`;
      nextState = ctx.previousState ?? 'idle';
      break;
    }

    case 'handoff_human': {
      if (settings.messages?.handoff) {
        reply = settings.messages.handoff;
      } else {
        reply =
          `Claro, puedo derivar tu consulta a una persona del equipo 👤` +
          lineBreak +
          `En unos momentos alguien te responderá manualmente.` +
          lineBreak +
          `Si quieres, cuéntame antes un poco más de tu consulta para adelantar información.`;
      }
      nextState = 'handoff_requested';
      needsHuman = true;
      break;
    }

    case 'goodbye': {
      if (settings.messages?.closing) {
        reply = settings.messages.closing;
      } else {
        reply =
          `¡Gracias por escribirnos! 🙌` +
          lineBreak +
          `Si más adelante necesitas hacer un pedido o resolver una duda, puedes hablarme de nuevo cuando quieras, estaré aquí feliz de ayudarte.`;
      }
      nextState = 'ended';
      break;
    }

    case 'fallback':
    default: {
      const producto = buscarProductoPorTexto(ctx.text);

      if (producto) {
        return buildProductoOrderResponse(producto, ctx, intent, locale, lineBreak);
      }

      reply =
        `No estoy seguro de haber entendido del todo 🤔` +
        lineBreak +
        `Puedo ayudarte con pedidos, horarios, productos o derivarte con una persona del equipo.` +
        lineBreak +
        `¿Podrías explicarme de otra forma o decir, por ejemplo: "Quiero hacer un pedido"?`;
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
      locale,
      previousState: ctx.previousState ?? null
    }
  };
}

/**
 * Función de alto nivel: recibe un contexto, detecta intención,
 * usa reglas + IA y construye la respuesta final.
 */
export async function processMessage(ctx: BotContext): Promise<BotResponse> {
  const ruleIntent = detectIntent(ctx.text, ctx.previousState);

  // Intents simples donde las reglas bastan
  const simpleIntents: IntentId[] = [
    'greeting',
    'goodbye',
    'faq_hours'
    // sacamos 'faq_menu' para que la IA pueda reinterpretar cosas como
    // "quiero ver la torta alpina" como flujo de pedido
  ];

  if (
    ruleIntent.confidence >= 0.85 &&
    simpleIntents.includes(ruleIntent.id)
  ) {
    return buildReply(ruleIntent, ctx);
  }

  // IA para casos ambiguos / pedidos / menú
  let aiResult: AiNLUResult | null = null;

  try {
    aiResult = await aiUnderstand(ctx, ruleIntent.id);
  } catch (err) {
    console.error('❌ Error en aiUnderstand:', err);
  }

  // Si la IA dice algo útil
  if (aiResult && aiResult.intentId) {
    // Si detecta producto, forzamos flujo de pedido
    if (aiResult.slots?.producto) {
      aiResult.intentId = 'order_start';
      aiResult.confidence = 0.99;
    }

    const intent: IntentMatch = {
      id: aiResult.intentId,
      confidence: aiResult.confidence ?? 0.9,
      reason: `IA NLU (antes: ${ruleIntent.id} ${ruleIntent.confidence})`
    };

    const previousDraft =
      ((ctx.metadata ?? {}) as any).orderDraft as OrderDraft | undefined;

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

    // Si estamos en pedido, usamos el flujo guiado
    if (
      intent.id === 'order_start' ||
      enhancedCtx.previousState === 'collecting_order_details'
    ) {
      return buildOrderConversationReply(mergedDraft, enhancedCtx, intent, lineBreak);
    }

    const response = buildReply(intent, enhancedCtx);

    if (aiResult.needsHuman) {
      response.needsHuman = true;
      response.nextState = 'handoff_requested';
    }

    return response;
  }

  // Si la IA falla, volvemos a las reglas
  return buildReply(ruleIntent, ctx);
}
