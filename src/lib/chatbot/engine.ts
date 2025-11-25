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

  // 1. Prioridad: Flujo de pedido activo
  if (previousState === 'collecting_order_details') {
    if (hasAny(['confirmar', 'listo', 'ok', 'si', 'esta bien'])) return { id: 'order_start', confidence: 0.95, reason: 'Flow' };
    return { id: 'order_start', confidence: 0.85, reason: 'Flow' };
  }

  // 2. Prioridad: Palabras clave de contenido (Torta, precio, etc.)
  const palabrasDeContenido = [
    'torta', 'pastel', 'kuchen', 'pie', 'dulce', 
    'tiene', 'tienen', 'hay', 'quedan', 'stock',
    'precio', 'valor', 'cuesta', 'sale',
    'quiero', 'comprar', 'pedir', 'necesito', 'busco'
  ];
  const tieneContenido = hasAny(palabrasDeContenido);

  // 3. Reglas directas
  
  // ✅ NUEVO: Estado del pedido
  if (hasAny(['estado', 'estatus', 'seguimiento', 'tracking', 'esta listo', 'está listo', 'mi pedido', 'como va'])) {
    return { id: 'order_status', confidence: 0.95, reason: 'Keyword' };
  }

  if (hasAny(['horario', 'abren', 'cierran', 'atienden'])) return { id: 'faq_hours', confidence: 0.9, reason: 'Keyword' };
  if (hasAny(['menu', 'carta', 'catalogo', 'precios', 'que tortas tienen', 'lista'])) return { id: 'faq_menu', confidence: 0.9, reason: 'Keyword' };
  if (hasAny(['hablar con humano', 'persona', 'ejecutivo'])) return { id: 'handoff_human', confidence: 0.95, reason: 'Keyword' };
  
  // Intención de pedido explícita
  if (hasAny(['pedido', 'encargar', 'hacer un pedido'])) return { id: 'order_start', confidence: 0.9, reason: 'Keyword' };

  // 4. Saludo y Despedida (SOLO si no hay palabras de contenido)
  if (!tieneContenido) {
    if (hasAny(['hola', 'buenas', 'alo', 'holis'])) return { id: 'greeting', confidence: 0.9, reason: 'Keyword' };
    if (hasAny(['chau', 'adios', 'gracias', 'hasta luego'])) return { id: 'goodbye', confidence: 0.85, reason: 'Keyword' };
  }

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
    
    // ✅ NUEVO: Respuesta para estado de pedido
    case 'order_status':
      reply = `Para revisar el estado exacto de tu pedido 🧾, necesito que un ejecutivo lo verifique en el sistema.\n\nHe notificado a alguien del equipo para que te responda por aquí a la brevedad.`;
      needsHuman = true; // Activamos la notificación al staff
      nextState = 'handoff_requested';
      break;

    case 'order_start':
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
      reply = settings.messages?.handoff ?? 
        `Entendido. He notificado a un ejecutivo del equipo 👤.\n\nTe contactaremos por este mismo chat a la brevedad para ayudarte.`;
      needsHuman = true;
      nextState = 'handoff_requested';
      break;
    
    default:
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
  const simpleIntents: IntentId[] = ['greeting', 'goodbye', 'faq_hours', 'order_status']; // Agregamos order_status aquí también

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
    // 🛡️ VALIDACIÓN ANTI-FANTASMAS
    if (aiResult.slots?.producto) {
      const exists = buscarProductoPorTexto(aiResult.slots.producto);
      if (!exists) {
        const textNorm = normalize(ctx.text);
        const productNorm = normalize(aiResult.slots.producto);
        const tokens = productNorm.split(' ').filter(t => t.length > 3 && !['torta', 'pastel'].includes(t));
        const mentioned = tokens.some(t => textNorm.includes(t));

        if (!mentioned) {
          delete aiResult.slots.producto;
        }
      }
    }

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