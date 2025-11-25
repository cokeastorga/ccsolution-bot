// src/lib/chatbot/engine.ts
import {
  buildMenuResumen,
  buscarProductoPorTexto
} from '$lib/chatbot/catalog/productos';
import { aiUnderstand, type AiNLUResult } from '$lib/chatbot/aiUnderstanding';
import {
  mergeOrderDraft,
  buildProductOrderResponse,
  type OrderDraft,
  type DeliveryMode
} from '$lib/chatbot/logic/order';

export type Channel = 'whatsapp' | 'web';

export type IntentId =
  | 'greeting' | 'smalltalk' | 'order_start' | 'order_status'
  | 'faq_hours' | 'faq_menu' | 'handoff_human' | 'goodbye' | 'fallback';

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
  confidence: number;
  reason: string;
}

export interface BotResponse {
  reply: string;
  intent: IntentMatch;
  nextState?: string | null;
  needsHuman?: boolean;
  meta?: Record<string, unknown>;
  media?: Array<{ type: 'image'; url: string; caption?: string }>;
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// Detección simple de intenciones por palabras clave
export function detectIntent(text: string, previousState?: string | null): IntentMatch {
  const n = normalize(text);
  const hasAny = (kws: string[]) => kws.some((k) => n.includes(k));

  if (previousState === 'collecting_order_details') {
    if (hasAny(['confirmar', 'listo', 'ok', 'si', 'esta bien'])) return { id: 'order_start', confidence: 0.95, reason: 'Flow' };
    return { id: 'order_start', confidence: 0.85, reason: 'Flow' };
  }
  if (hasAny(['hola', 'buenas'])) return { id: 'greeting', confidence: 0.9, reason: 'Keyword' };
  if (hasAny(['chau', 'adios', 'gracias'])) return { id: 'goodbye', confidence: 0.85, reason: 'Keyword' };
  if (hasAny(['pedido', 'encargar', 'comprar', 'quiero una torta'])) return { id: 'order_start', confidence: 0.9, reason: 'Keyword' };
  if (hasAny(['horario', 'abren', 'cierran'])) return { id: 'faq_hours', confidence: 0.9, reason: 'Keyword' };
  if (hasAny(['menu', 'carta', 'catalogo', 'precios', 'que tortas tienen'])) return { id: 'faq_menu', confidence: 0.9, reason: 'Keyword' };
  if (hasAny(['hablar con humano', 'persona'])) return { id: 'handoff_human', confidence: 0.95, reason: 'Keyword' };

  return { id: 'fallback', confidence: 0.3, reason: 'Fallback' };
}

async function buildReply(intent: IntentMatch, ctx: BotContext): Promise<BotResponse> {
  const isWhatsApp = ctx.channel === 'whatsapp';
  const settings = ((ctx.metadata?.settings ?? {}) as any);
  const businessName = settings.businessName ?? 'Delicias Porteñas';
  const lineBreak = isWhatsApp ? '\n' : '\n';
  
  let reply = '';
  let nextState = ctx.previousState ?? null;
  let needsHuman = false;

  switch (intent.id) {
    case 'greeting':
      reply = settings.messages?.welcome ?? `¡Hola! 👋 Soy Edu, el asistente virtual de ${businessName}.`;
      nextState = 'idle';
      break;
    case 'order_start':
      // Intentamos detectar producto en el texto inicial si no usó IA
      const prod = buscarProductoPorTexto(ctx.text);
      const draft: OrderDraft = { producto: prod ? prod.nombre : null };
      return await buildProductOrderResponse(prod, draft, ctx, intent, lineBreak);
    case 'faq_menu':
      reply = `Te comparto nuestro menú 🍰\n\n${buildMenuResumen(4)}\n\n¿Cuál te gustaría?`;
      nextState = 'idle';
      break;
    case 'faq_hours':
      const h = settings.hours ?? {};
      reply = `Horarios:\nL-V: ${h.weekdays}\nSáb: ${h.saturday}`;
      break;
    case 'handoff_human':
      // Atención proactiva: notificamos y prometemos contacto
      reply = settings.messages?.handoff ?? 
        `Entendido. He notificado a un ejecutivo del equipo 👤.\n\nTe contactaremos por este mismo chat a la brevedad para ayudarte.`;
      needsHuman = true;
      nextState = 'handoff_requested';
      break;
    default:
      // Fallback: también revisamos si mencionó un producto
      const prodFallback = buscarProductoPorTexto(ctx.text);
      if (prodFallback) {
         const draftFallback: OrderDraft = { producto: prodFallback.nombre };
         return await buildProductOrderResponse(prodFallback, draftFallback, ctx, intent, lineBreak);
      }
      reply = 'No entendí bien. ¿Podrías repetirlo o decir "Quiero hacer un pedido"?';
      break;
  }

  return {
    reply,
    intent,
    nextState,
    needsHuman,
    meta: { channel: ctx.channel, locale: 'es' }
  };
}

export async function processMessage(ctx: BotContext): Promise<BotResponse> {
  const ruleIntent = detectIntent(ctx.text, ctx.previousState);
  const simpleIntents: IntentId[] = ['greeting', 'goodbye', 'faq_hours'];

  if (ruleIntent.confidence >= 0.85 && simpleIntents.includes(ruleIntent.id)) {
    return await buildReply(ruleIntent, ctx);
  }

  let aiResult: AiNLUResult | null = null;
  try {
    aiResult = await aiUnderstand(ctx, ruleIntent.id);
  } catch (e) {
    console.error('IA Error:', e);
  }

  if (aiResult && aiResult.intentId) {
    // =================================================================
    // 🛡️ VALIDACIÓN ANTI-FANTASMAS (Solución al bug de "Mango")
    // =================================================================
    // Si la IA detecta un producto (ej: "mango") que NO está en el catálogo,
    // y el usuario NO escribió esa palabra en su mensaje actual, es porque
    // la IA está leyendo el historial antiguo. Lo borramos.
    if (aiResult.slots?.producto) {
      const exists = buscarProductoPorTexto(aiResult.slots.producto);
      if (!exists) {
        const textNorm = normalize(ctx.text);
        const productNorm = normalize(aiResult.slots.producto);
        // Buscamos si alguna palabra clave del producto está en el texto actual
        // Ignoramos palabras comunes como 'torta'
        const tokens = productNorm.split(' ').filter(t => t.length > 3 && !['torta', 'pastel'].includes(t));
        const mentioned = tokens.some(t => textNorm.includes(t));

        if (!mentioned) {
          // Es un fantasma del historial -> Borrar
          delete aiResult.slots.producto;
        }
      }
    }
    // =================================================================

    const intent: IntentMatch = { id: aiResult.intentId, confidence: 0.9, reason: 'AI' };
    
    if (intent.id === 'order_start' || aiResult.slots?.producto || ctx.previousState === 'collecting_order_details') {
      intent.id = 'order_start';
      
      const prevDraft = ((ctx.metadata ?? {}) as any).orderDraft as OrderDraft | undefined;
      const mergedDraft = mergeOrderDraft(prevDraft, aiResult.slots, ctx);
      
      const producto = buscarProductoPorTexto(mergedDraft.producto || '');
      const lineBreak = ctx.channel === 'whatsapp' ? '\n' : '\n';
      
      return await buildProductOrderResponse(
        producto, 
        mergedDraft, 
        ctx, 
        intent, 
        lineBreak, 
        aiResult.generatedReply
      );
    }

    const response = await buildReply(intent, ctx);
    if (aiResult.needsHuman) {
      response.needsHuman = true;
      response.nextState = 'handoff_requested';
    }
    return response;
  }

  return await buildReply(ruleIntent, ctx);
}