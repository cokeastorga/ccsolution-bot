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
 * Deducción muy simple de modo de entrega.
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
 * Función auxiliar para obtener el nombre del producto, priorizando la IA.
 * @param ctx Contexto con posibles slots de IA.
 * @returns El nombre del producto extraído.
 */
function getProductName(ctx: BotContext): string | undefined {
    const aiSlots = (ctx.metadata as any)?.aiSlots as 
        | { producto_nombre?: string }
        | undefined;
    
    // 1. Prioriza el slot 'producto_nombre' de la IA si existe.
    if (aiSlots?.producto_nombre) {
        return aiSlots.producto_nombre;
    }

    // 2. Si la IA no extrajo nada, usa el texto crudo para la búsqueda.
    // Esto mantiene la compatibilidad con buscarProductoPorTexto.
    return ctx.text; 
}


/**
 * Construye una respuesta rica cuando detectamos un producto (torta).
 * Incluye:
 * - descripción
 * - tamaños
 * - cálculo aproximado según personas
 * - fecha y modo de entrega si se detectan
 * - imagen
 */
function buildProductoOrderResponse(
  producto: any,
  ctx: BotContext,
  intent: IntentMatch,
  locale: 'es' | 'en',
  lineBreak: string
): BotResponse {
  // ⬇️ Intentamos usar primero los slots de IA si existen
  const aiSlots = (ctx.metadata as any)?.aiSlots as
    | {
        personas?: number;
        deliveryMode?: DeliveryMode;
        fechaIso?: string;
      }
    | undefined;

  // AHORA: Priorizamos la IA, si la IA no detectó, caemos al extractor de reglas.
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

  // Intentamos sugerir un tamaño según personas
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
      `Con lo que me dices, esto es lo que entendí: 📝` + // Emoji ajustado
      lineBreak +
      detalles.join(lineBreak) +
      lineBreak +
      lineBreak +
      `¿Está bien así o quieres ajustar *personas, fecha o modalidad*? Si es correcto, dime "Confirmar pedido".`; // Call to Action más claro
  } else {
    reply +=
      lineBreak +
      lineBreak +
      `¡Parece que tienes buen gusto! 😉 Para terminar de ayudarte a cotizar, necesito un par de detalles más:` + // Tono más amigable
      lineBreak +
      `• Para cuántas personas es la ${producto.nombre}` +
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
 * NOTA: Esta función se mantiene, pero la IA la corrige/mejora después.
 */
export function detectIntent(
  text: string,
  previousState?: string | null
): IntentMatch {
  // ... (el resto de esta función queda igual, ya que es el filtro rápido)
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
 * Construye el texto de respuesta según la intención y el contexto.
 * Aquí ya usamos los settings que vienen en ctx.metadata.settings.
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

  // Lógica para encontrar el producto: prioriza la IA
  const productNameOrText = getProductName(ctx);
  const producto = buscarProductoPorTexto(productNameOrText ?? ctx.text); // Si la IA falló, usa el texto completo

  switch (intent.id) {
    case 'greeting': {
      if (settings.messages?.welcome) {
        reply = settings.messages.welcome;
      } else {
        reply =
          `¡Hola! 👋 Soy Edu, tu asistente repostero de ${businessName}.` +
          lineBreak +
          `Estoy aquí para ayudarte a encargar tu torta o pan favorito.` +
          lineBreak +
          `¿Qué te gustaría hacer hoy? Puedes pedirme algo como "Quiero una torta de chocolate" o "Consultar horarios".`; // Tono más de pastelería
      }
      nextState = 'idle';
      break;
    }

    case 'smalltalk': {
      reply =
        `Soy un bot, ¡pero me encantan los postres tanto como a ti! 🍰 ¿Hacemos un pedido o tienes una consulta? 😊`; // Respuesta más amigable y contextual
      nextState = 'idle';
      break;
    }

    case 'order_start': {
      // Si la IA o la búsqueda lograron identificar un producto, vamos a la respuesta rica
      if (producto) {
        return buildProductoOrderResponse(producto, ctx, intent, locale, lineBreak);
      }

      // Si no se reconoce un producto (solo dijo "quiero pedir"), seguimos con el flujo genérico
      reply =
        `¡Perfecto! Iniciemos tu pedido 🧁` +
        lineBreak +
        `Para empezar, dime ¿qué te gustaría encargar? Puedes incluir la cantidad de personas o la fecha si la sabes.`;
      nextState = 'collecting_order_details';
      break;
    }

    case 'order_status': {
      reply =
        `Para revisar el estado de tu pedido, necesito el número de referencia o el nombre y la fecha aproximada en que lo hiciste. 🧾 ¿Me lo puedes dar?`;
      nextState = 'awaiting_order_reference';
      break;
    }

    case 'faq_hours': {
      const h = settings.hours ?? {};
      reply =
        `¡Con gusto! Te cuento los horarios de ${businessName}:` +
        lineBreak +
        `🕒 Lunes a viernes: ${h.weekdays ?? '08:00 – 19:00'}` +
        lineBreak +
        `🕒 Sábados: ${h.saturday ?? '10:00 – 19:00'}` +
        lineBreak +
        `${
          h.sunday ??
          '¡Ojo! Los Domingos y festivos trabajamos con disponibilidad especial. Puedes consultar por aquí si abrimos.'
        }`; // Tono más cauteloso en el domingo
      nextState = ctx.previousState ?? 'idle';
      break;
    }

    case 'faq_menu': {
      const resumen = buildMenuResumen(4); // 4 productos por categoría, ajustable

      reply =
        `¡Claro que sí! Aquí tienes un resumen de nuestros productos estrella y tortas de ${businessName} 🍰:` +
        lineBreak +
        lineBreak +
        resumen +
        lineBreak +
        lineBreak +
        `Si ves algo que te guste, dime el *nombre* (ej: "Selva Negra") y la cantidad de personas. Así te ayudo a cotizar y hacer el pedido. 😊`;
      nextState = ctx.previousState ?? 'idle';
      break;
    }

    case 'handoff_human': {
      if (settings.messages?.handoff) {
        reply = settings.messages.handoff;
      } else {
        reply =
          `Entendido. Te derivo a una persona de nuestro equipo de atención personalizada 🙋‍♀️` +
          lineBreak +
          `Mientras te atienden, si quieres, cuéntanos brevemente cuál es tu consulta para que podamos ayudarte más rápido.`;
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
          `¡Gracias por tu visita! Que tengas un excelente día. 🙌 Vuelve cuando quieras por tu pan o pastel favorito.`;
      }
      nextState = 'ended';
      break;
    }

    case 'fallback':
    default: {
      // La IA ya fue llamada, y esta es la intención que quedó.
      // Si la IA encontró un producto (incluso si la intención es 'fallback'), lo gestionamos.
      if (producto) {
        return buildProductoOrderResponse(producto, ctx, intent, locale, lineBreak);
      }

      // Si no detecta producto, sigue fallback normal
      reply =
        `¡Uy! Aún no soy tan inteligente como una pastelera real 😅 No estoy seguro de haber entendido del todo.` +
        lineBreak +
        `¿Podrías decirme si quieres *Hacer un pedido*, *Consultar horarios* o *Ver el menú*?`; // Tono más cercano
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
  // 1) Intent por reglas (rápido)
  const ruleIntent = detectIntent(ctx.text, ctx.previousState);

  // Intents simples donde las reglas suelen bastar y NO requieren NLU profundo
  // **Ajuste clave aquí:** Sacamos 'faq_menu'
  const simpleIntents: IntentId[] = [
    'greeting',
    'goodbye',
    'faq_hours'
  ];

  if (
    ruleIntent.confidence >= 0.85 &&
    simpleIntents.includes(ruleIntent.id)
  ) {
    // Para saludos, horarios y despedidas, seguimos usando solo lo que ya programaste.
    return buildReply(ruleIntent, ctx);
  }

  // 2) Para pedidos ('order_start'), menú ('faq_menu'), estado, smalltalk y ambigüedad, pedimos ayuda a la IA
  let aiResult: AiNLUResult | null = null;

  try {
    aiResult = await aiUnderstand(ctx, ruleIntent.id);
  } catch (err) {
    console.error('❌ Error en aiUnderstand:', err);
  }

  // 3) Si la IA devolvió algo razonable, lo usamos como verdad
  if (aiResult && aiResult.intentId) {
    // Si la IA detecta que el usuario está pidiendo (order_start) o preguntando por menú (faq_menu), 
    // incluso si el 'ruleIntent' fue 'smalltalk' o 'fallback', usamos la clasificación de la IA.
    const intent: IntentMatch = {
      id: aiResult.intentId,
      confidence: aiResult.confidence ?? 0.9,
      reason: `IA NLU (antes: ${ruleIntent.id} ${ruleIntent.confidence})`
    };

    const enhancedCtx: BotContext = {
      ...ctx,
      metadata: {
        ...(ctx.metadata ?? {}),
        aiSlots: aiResult.slots, // Pasamos los datos extraídos
        aiNeedsHuman: aiResult.needsHuman ?? false
      }
    };

    const response = buildReply(intent, enhancedCtx);

    // Si la IA sugiere humano (por frustración o palabra clave de traspaso), respetamos eso
    if (aiResult.needsHuman) {
      response.needsHuman = true;
      response.nextState = 'handoff_requested';
    }

    return response;
  }

  // 4) Si la IA falla, retrocedemos a las reglas normales
  return buildReply(ruleIntent, ctx);
}