import {
  buildMenuResumen,
  buscarProductoPorTexto,
  formatearDetalleProducto
} from '$lib/chatbot/catalog/productos';
import { buildImageUrl } from '$lib/chatbot/utils/images';
import { aiUnderstand, type AiNLUResult } from '$lib/chatbot/aiUnderstanding';
import {
  mergeOrderDraft,
  buildProductOrderResponse,
  type OrderDraft,
  type DeliveryMode
} from '$lib/chatbot/logic/order';

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
  shouldClearMemory?: boolean; // 🆕 Bandera de limpieza
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Detección de intención por reglas (Mejorada)
 */
export function detectIntent(
  text: string,
  previousState?: string | null
): IntentMatch {
  const normalized = normalize(text);
  const hasAny = (keywords: string[]) =>
    keywords.some((k) => normalized.includes(k));

  // 1. ESCAPE / SALIDA (Prioridad Máxima para salir de loops)
  if (hasAny(['chao', 'chau', 'adios', 'hasta luego', 'nos vemos', 'cancelar', 'salir', 'terminar', 'fin', 'cerrar'])) {
    return {
      id: 'goodbye',
      confidence: 0.99,
      reason: 'Palabra de cierre'
    };
  }

  // 2. Confirmación (Solo si estamos en flujo de pedido)
  if (previousState === 'collecting_order_details') {
    if (hasAny(['confirmar', 'listo', 'ok', 'estaria bien', 'ya', 'si', 'dale', 'bueno'])) {
      return {
        id: 'order_start',
        confidence: 0.95,
        reason: 'Confirmación de flujo'
      };
    }
    // Si no es confirmación ni escape, asumimos que continúa dando detalles
    return {
      id: 'order_start',
      confidence: 0.85,
      reason: 'Continuación de flujo'
    };
  }

  // 3. Intenciones Generales

  if (hasAny(['hola', 'buenas', 'buen dia', 'buenos dias', 'buenas tardes', 'alo'])) {
    return { id: 'greeting', confidence: 0.9, reason: 'Saludo' };
  }

  if (hasAny(['pedido', 'orden', 'comprar', 'encargar', 'quiero un', 'quiero una', 'hacer un pedido', 'pedir'])) {
    return { id: 'order_start', confidence: 0.92, reason: 'Intención de compra' };
  }

  if (hasAny(['estado', 'mi pedido', 'seguimiento', 'tracking', 'donde viene'])) {
    return { id: 'order_status', confidence: 0.9, reason: 'Consulta estado' };
  }

  // Horarios y Ubicación (Mejorado)
  if (hasAny([
    'horario', 'abren', 'cierran', 'atienden', 'hora',
    'ubicacion', 'ubicados', 'donde estan', 'direccion', 'sucursales', 'sucursal', 'donde queda', 'local'
  ])) {
    return { id: 'faq_hours', confidence: 0.9, reason: 'Consulta info negocio' };
  }

  // Menú y Catálogo
  const containsTorta = normalized.includes('torta') || normalized.includes('tortas');
  if (
    hasAny(['menu', 'carta', 'productos', 'precios', 'catalogo', 'catálogo', 'variedades', 'opciones', 'que tienen']) ||
    (containsTorta && hasAny(['que', 'ver', 'mostrar', 'muestrame', 'hay', 'tienen']))
  ) {
    return { id: 'faq_menu', confidence: 0.93, reason: 'Consulta menú' };
  }

  if (hasAny(['hablar con una persona', 'hablar con humano', 'asesor', 'ejecutivo', 'humano'])) {
    return { id: 'handoff_human', confidence: 0.95, reason: 'Handoff' };
  }

  if (hasAny(['como estas', 'que tal', 'quien eres'])) {
    return { id: 'smalltalk', confidence: 0.7, reason: 'Smalltalk' };
  }

  return { id: 'fallback', confidence: 0.3, reason: 'Fallback' };
}

export async function buildReply(intent: IntentMatch, ctx: BotContext): Promise<BotResponse> {
  const locale = ctx.locale ?? 'es';
  const isWhatsApp = ctx.channel === 'whatsapp';

  // Carga segura de settings
  const settings = (((ctx.metadata ?? {}) as any).settings ?? {}) as SettingsMeta;
  const businessName = settings.businessName ?? 'Delicias Porteñas';
  const lineBreak = isWhatsApp ? '\n' : '\n';

  let reply = '';
  let nextState: string | null = ctx.previousState ?? null;
  let needsHuman = false;
  let shouldClearMemory = false; // 🆕 Control de limpieza

  switch (intent.id) {
    case 'greeting': {
      if (settings.messages?.welcome) {
        reply = settings.messages.welcome;
      } else {
        reply =
          `¡Hola! 👋 Soy Edu, el asistente virtual de ${businessName}.` +
          lineBreak +
          `Puedo ayudarte a:` +
          lineBreak +
          `• Hacer un pedido 🍰` +
          lineBreak +
          `• Consultar horarios y ubicación 📍` +
          lineBreak +
          `• Ver nuestro catálogo`;
      }
      nextState = 'idle';
      break;
    }

    case 'smalltalk': {
      reply = `Estoy aquí para ayudarte con tus pedidos. Puedes decir "Ver catálogo" o "Hacer un pedido". 😊`;
      nextState = 'idle';
      break;
    }

    case 'order_start': {
      const producto = buscarProductoPorTexto(ctx.text);
      const draft: OrderDraft = { producto: producto ? producto.nombre : null };
      // buildProductOrderResponse maneja su propio shouldClearMemory si confirma
      return await buildProductOrderResponse(producto, draft, ctx, intent, lineBreak);
    }

    case 'order_status': {
      reply = `Para revisar el estado de tu pedido necesito algún dato de referencia (ej. número de pedido o nombre).`;
      nextState = 'awaiting_order_reference';
      // No limpiamos memoria porque esperamos respuesta
      break;
    }

    case 'faq_hours': {
      const h = settings.hours ?? {};
      const wd = h.weekdays ?? '09:00 – 19:00';
      const sat = h.saturday ?? '10:00 – 19:00';
      const sun = h.sunday ?? 'Cerrado';

      reply =
        `🕒 *Horarios de Atención:*` +
        lineBreak +
        `• Lunes a Viernes: ${wd}` +
        lineBreak +
        `• Sábados: ${sat}` +
        lineBreak +
        `• Domingos: ${sun}` +
        lineBreak + lineBreak +
        `📍 *Ubicación:*` +
        lineBreak +
        `Tenemos sucursales en Santiago. Si inicias un pedido con "retiro", te ayudaré a encontrar la más cercana a tu dirección.`;

      nextState = ctx.previousState ?? 'idle';

      // Si consulta esto y NO estaba pidiendo, limpiamos para reiniciar
      if (!ctx.previousState || ctx.previousState === 'idle') {
        shouldClearMemory = true;
      }
      break;
    }

    case 'faq_menu': {
      const resumen = buildMenuResumen(4);
      reply =
        `Aquí tienes algunas de nuestras tortas favoritas 🍰\n\nPara mayor información o ver el catalogo completo de productos te recomiendo visitar "La tiendita porteña" en: https://www.deliciasportenas.cl/latiendita :` +
        lineBreak + lineBreak +
        resumen +
        lineBreak + lineBreak +
        `¿Te gustaría alguna? Solo escribe el nombre de la torta.`;
      nextState = ctx.previousState ?? 'idle';

      // Si consulta menú fuera de un pedido, limpiamos
      if (!ctx.previousState || ctx.previousState === 'idle') {
        shouldClearMemory = true;
      }
      break;
    }

    case 'handoff_human': {
      reply = settings.messages?.handoff ?? `Entendido, voy a avisar a un ejecutivo para que te atienda personalmente. 👤`;
      nextState = 'handoff_requested';
      needsHuman = true;
      break;
    }

    case 'goodbye': {
      reply = settings.messages?.closing ?? `¡Gracias! 👋 Que tengas un excelente día.`;
      nextState = 'ended';
      // Despedida = Limpieza total
      shouldClearMemory = true;
      break;
    }

    case 'fallback':
    default: {
      // Intentamos ver si mencionó un producto aunque no haya intent claro
      const producto = buscarProductoPorTexto(ctx.text);
      if (producto) {
        const draft: OrderDraft = { producto: producto.nombre };
        return await buildProductOrderResponse(producto, draft, ctx, intent, lineBreak);
      }

      reply = `No estoy seguro de entender 🤔. Puedes probar diciendo "Ver el menú", "Horarios" o "Quiero pedir una torta".`;
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
    },
    shouldClearMemory
  };
}

export async function processMessage(ctx: BotContext): Promise<BotResponse> {
  const ruleIntent = detectIntent(ctx.text, ctx.previousState);

  // Intents básicos por reglas
  const simpleIntents: IntentId[] = ['greeting', 'goodbye', 'faq_hours', 'order_status', 'handoff_human'];

  if (ruleIntent.confidence >= 0.85 && simpleIntents.includes(ruleIntent.id)) {
    return await buildReply(ruleIntent, ctx);
  }

  // Uso de IA
  let aiResult: AiNLUResult | null = null;
  try {
    aiResult = await aiUnderstand(ctx, ruleIntent.id);
  } catch (err) {
    console.error('❌ Error IA:', err);
  }

  if (aiResult && aiResult.intentId) {
    if (aiResult.slots?.producto) {
      aiResult.intentId = 'order_start';
    }

    const intent: IntentMatch = {
      id: aiResult.intentId,
      confidence: aiResult.confidence ?? 0.9,
      reason: 'IA NLU'
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
      const producto = buscarProductoPorTexto(mergedDraft.producto || '');
      return await buildProductOrderResponse(
        producto,
        mergedDraft,
        enhancedCtx,
        intent,
        lineBreak,
        aiResult.generatedReply
      );
    }

    const response = await buildReply(intent, enhancedCtx);
    if (aiResult.needsHuman) {
      response.needsHuman = true;
      response.nextState = 'handoff_requested';
    }
    return response;
  }

  // Fallback final
  return await buildReply(ruleIntent, ctx);
}