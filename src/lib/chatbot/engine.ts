// src/lib/chatbot/engine.ts
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
  shouldClearMemory?: boolean; 
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Detección de intención por reglas (Rápida)
 */
export function detectIntent(
  text: string,
  previousState?: string | null
): IntentMatch {
  const normalized = normalize(text);
  const hasAny = (keywords: string[]) =>
    keywords.some((k) => normalized.includes(k));

  // 1. ESCAPE / SALIDA (Prioridad Máxima)
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

  // Horarios y Ubicación
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

/**
 * Construye la respuesta final (Prioriza IA si existe)
 */
export async function buildReply(intent: IntentMatch, ctx: BotContext): Promise<BotResponse> {
  const locale = ctx.locale ?? 'es';
  const isWhatsApp = ctx.channel === 'whatsapp';

  const settings = (((ctx.metadata ?? {}) as any).settings ?? {}) as SettingsMeta;
  const businessName = settings.businessName ?? 'Delicias Porteñas';
  const lineBreak = isWhatsApp ? '\n' : '\n';

  // 🧠 Recuperamos la respuesta generada por la IA (si existe)
  const aiReply = (ctx.metadata as any)?.aiGeneratedReply as string | undefined;

  let reply = '';
  let nextState: string | null = ctx.previousState ?? null;
  let needsHuman = false;
  let shouldClearMemory = false;

  switch (intent.id) {
    case 'greeting': {
      // Si la IA generó un saludo, úsalo. Si no, usa el del backend.
      if (aiReply) {
        reply = aiReply;
      } else {
        reply = settings.messages?.welcome ?? `¡Hola! 👋 Soy Edu, el asistente virtual de ${businessName}.`;
      }
      nextState = 'idle';
      break;
    }

    case 'smalltalk': {
      // Prioridad absoluta a la IA para charla casual
      if (aiReply) {
        reply = aiReply;
      } else {
        reply = `Estoy aquí para ayudarte con tus pedidos. Puedes decir "Ver catálogo" o "Hacer un pedido". 😊`;
      }
      nextState = 'idle';
      break;
    }

    case 'order_start': {
      const producto = buscarProductoPorTexto(ctx.text);
      const draft: OrderDraft = { producto: producto ? producto.nombre : null };
      // Pasamos aiReply para que la lógica de pedidos pueda usarlo como intro
      return await buildProductOrderResponse(producto, draft, ctx, intent, lineBreak, aiReply);
    }

    case 'order_status': {
      reply = `Para revisar el estado de tu pedido necesito algún dato de referencia (ej. número de pedido o nombre).`;
      nextState = 'awaiting_order_reference';
      break;
    }

    case 'faq_hours': {
      // Mantenemos respuesta "Backend" para datos duros (para evitar alucinaciones de la IA)
      const h = settings.hours ?? {};
      const wd = h.weekdays ?? '09:00 – 19:00';
      const sat = h.saturday ?? '10:00 – 19:00';
      const sun = h.sunday ?? 'Cerrado';

      // Si la IA dio una respuesta muy buena, úsala, sino, usa la plantilla segura
      if (aiReply && aiReply.length > 20) {
         reply = aiReply;
      } else {
         reply = `🕒 *Horarios de Atención:*\n• Lunes a Viernes: ${wd}\n• Sábados: ${sat}\n• Domingos: ${sun}`;
      }

      nextState = ctx.previousState ?? 'idle';
      if (!ctx.previousState || ctx.previousState === 'idle') shouldClearMemory = true;
      break;
    }

    case 'faq_menu': {
      const resumen = buildMenuResumen(4);
      const intro = aiReply ? aiReply : `Aquí tienes algunas de nuestras tortas favoritas 🍰:`;
      
      reply = `${intro}${lineBreak}${lineBreak}${resumen}${lineBreak}${lineBreak}¿Te gustaría alguna? Solo escribe el nombre.`;
      
      nextState = ctx.previousState ?? 'idle';
      if (!ctx.previousState || ctx.previousState === 'idle') shouldClearMemory = true;
      break;
    }

    case 'handoff_human': {
      reply = settings.messages?.handoff ?? `Entendido, voy a avisar a un ejecutivo para que te atienda personalmente. 👤`;
      nextState = 'handoff_requested';
      needsHuman = true;
      break;
    }

    case 'goodbye': {
      reply = aiReply ? aiReply : (settings.messages?.closing ?? `¡Gracias! 👋 Que tengas un excelente día.`);
      nextState = 'ended';
      shouldClearMemory = true;
      break;
    }

    case 'fallback':
    default: {
      const producto = buscarProductoPorTexto(ctx.text);
      if (producto) {
        const draft: OrderDraft = { producto: producto.nombre };
        return await buildProductOrderResponse(producto, draft, ctx, intent, lineBreak, aiReply);
      }

      // Si no entendemos y la IA generó algo, úsalo (Edu intentando explicar)
      if (aiReply) {
        reply = aiReply;
      } else {
        reply = `No estoy seguro de entender 🤔. Puedes probar diciendo "Ver el menú", "Horarios" o "Quiero pedir una torta".`;
      }
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

  // 🔴 LISTA DE INTENTS QUE NO USAN IA (Solo Reglas)
  // He quitado 'greeting' de aquí para que "Hola" pase a la IA y responda Edu.
  // He dejado solo los críticos o de salida rápida.
  const simpleIntents: IntentId[] = ['goodbye', 'handoff_human']; 

  // Si es un intent simple y la confianza es muy alta, respondemos rápido
  if (ruleIntent.confidence >= 0.95 && simpleIntents.includes(ruleIntent.id)) {
    return await buildReply(ruleIntent, ctx);
  }

  // Para todo lo demás, consultamos a la IA (Gemini)
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
        aiGeneratedReply: aiResult.generatedReply, // Guardamos la respuesta de Edu
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

  // Fallback si falla la IA
  return await buildReply(ruleIntent, ctx);
}