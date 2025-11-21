// src/lib/chatbot/engine.ts
import {
  buildMenuResumen,
  buscarProductoPorTexto,
  formatearDetalleProducto
} from '$lib/chatbot/catalog/productos';
import { buildImageUrl } from '$lib/chatbot/utils/images';
import { aiUnderstand, type AiNLUResult } from '$lib/chatbot/aiUnderstanding';

// [Otras importaciones y tipos quedan igual]
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

// [Tipos SettingsMeta, BotContext, IntentMatch, BotResponse quedan igual]

// [Funciones utilitarias (normalize, extractPersonCount, extractDateInfo, etc.) quedan igual]
// ... (Mantén todas las funciones utilitarias de extracción) ...

// --- NUEVA FUNCIÓN AUXILIAR: PRIORIZA EL NOMBRE DEL PRODUCTO DE LA IA ---
/**
 * Función auxiliar para obtener el nombre del producto, priorizando la IA.
 * @param ctx Contexto con posibles slots de IA.
 * @returns El nombre del producto extraído por la IA.
 */
function getProductName(ctx: BotContext): string | undefined {
    const aiSlots = (ctx.metadata as any)?.aiSlots as 
        | { producto?: string } // Usamos 'producto' como lo define AiSlots
        | undefined;
    
    // Prioriza el slot 'producto' de la IA si existe.
    return aiSlots?.producto;
}


// --- buildProductoOrderResponse y detectIntent (QUEDAN IGUALES) ---
// Mantendremos la función `buildProductoOrderResponse` por si necesitas que tu motor
// siga enriqueciendo el mensaje con datos específicos (precios, tamaños) antes de que la IA responda.
// Sin embargo, para este flujo, su uso se hace opcional o de solo-datos.

// ... (buildProductoOrderResponse queda igual, solo que ahora la usaremos como un generador de DATOS, no de REPLY) ...

/**
 * Regla simple de detección de intención basada en keywords.
 * (Esta función queda igual)
 */
export function detectIntent(
  text: string,
  previousState?: string | null
): IntentMatch {
  // ... (Tu lógica de reglas queda idéntica aquí) ...
    const normalized = normalize(text);
    // ... (El resto de la lógica de detección por palabras clave) ...
    // ... (El cuerpo completo de detectIntent no necesita cambios) ...

    const hasAny = (keywords: string[]) => keywords.some((k) => normalized.includes(k));
    
    // Lógica de contexto de pedido (queda igual)
    if (previousState === 'collecting_order_details') {
        if (hasAny(['confirmar', 'listo', 'ok', 'estaria bien', 'ya'])) {
            return { id: 'order_start', confidence: 0.95, reason: 'Confirmación dentro de flujo de pedido' };
        }
        return { id: 'order_start', confidence: 0.85, reason: 'Seguimos recogiendo detalles del pedido' };
    }

    // Lógica de Saludos/Despedidas/Pedidos/Horarios/Menú/Humano/Smalltalk (queda igual)
    if (hasAny(['hola', 'buenas', 'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches', 'alo'])) {
        return { id: 'greeting', confidence: 0.9, reason: 'Saludo detectado por palabras clave' };
    }
    // ... (El resto de la lógica de detectIntent) ...
    if (hasAny(['gracias', 'muchas gracias', 'chau', 'adios', 'nos vemos', 'hasta luego', 'vale gracias'])) {
        return { id: 'goodbye', confidence: 0.85, reason: 'Despedida detectada' };
    }
    // ... (El resto de la lógica de detectIntent) ...
    if (hasAny(['pedido', 'orden', 'comprar', 'encargar', 'quiero un kuchen', 'quiero una torta', 'hacer un pedido', 'quiero pedir', 'quiero pedir una torta', 'quisiera pedir', 'necesito pedir', 'quiero encargar', 'quisiera encargar'])) {
        return { id: 'order_start', confidence: 0.92, reason: 'Intención de realizar pedido detectada' };
    }
    // ... (El resto de la lógica de detectIntent) ...
    if (hasAny(['estado de mi pedido', 'mi pedido', 'cuando llega', 'seguimiento', 'tracking'])) {
        return { id: 'order_status', confidence: 0.9, reason: 'Consulta de estado de pedido detectada' };
    }
    // ... (El resto de la lógica de detectIntent) ...
    if (hasAny(['horario', 'horarios', 'abren', 'cierran', 'a que hora', 'atienden', 'apertura', 'cierre', 'hasta que hora atienden'])) {
        return { id: 'faq_hours', confidence: 0.88, reason: 'Consulta de horarios detectada' };
    }
    // ... (El resto de la lógica de detectIntent) ...
    const containsTortaPalabra = normalized.includes('torta') || normalized.includes('tortas');
    const containsPreguntaMenu = hasAny(['menu', 'carta', 'productos', 'lista de precios', 'catalogo', 'catálogo', 'lista', 'variedades', 'opciones', 'catalogo de tortas', 'catalogo de productos', 'ver el menu', 'ver el menú', 'ver menu', 'ver catálogo', 'ver catalogo', 'ver productos', 'tortas disponibles', 'tipos de tortas', 'que tortas tienen', 'que tortas hay', 'que torta tienen', 'que torta hay', 'quiero ver las tortas', 'ver las tortas', 'mostrar tortas', 'muestrame las tortas', 'muéstrame las tortas']);

    if (containsPreguntaMenu || (containsTortaPalabra && hasAny(['que', 'ver', 'mostrar', 'muestrame', 'muéstrame', 'hay', 'tienen']))) {
        return { id: 'faq_menu', confidence: 0.93, reason: 'Consulta de menú / tortas detectada' };
    }
    // ... (El resto de la lógica de detectIntent) ...
    if (hasAny(['hablar con una persona', 'hablar con humano', 'asesor', 'ejecutivo', 'persona real', 'atencion al cliente', 'vendedor', 'encargado', 'dueño', 'duenio'])) {
        return { id: 'handoff_human', confidence: 0.95, reason: 'Usuario solicita atención humana' };
    }
    // ... (El resto de la lógica de detectIntent) ...
    if (hasAny(['como estas', 'que tal', 'quien eres', 'que haces'])) {
        return { id: 'smalltalk', confidence: 0.7, reason: 'Smalltalk detectado' };
    }
    // ... (El resto de la lógica de detectIntent) ...
    return { id: 'fallback', confidence: 0.3, reason: 'No se encontraron patrones claros; se usa fallback' };
}



/**
 * Construye el texto de respuesta según la intención y el contexto.
 * NOTA: Esta función ahora solo maneja el caso donde la IA FALLÓ y necesitamos un fallback.
 */
export function buildReply(intent: IntentMatch, ctx: BotContext): BotResponse {
  const locale = ctx.locale ?? 'es';
  const isWhatsApp = ctx.channel === 'whatsapp';
  const settings = (((ctx.metadata ?? {}) as any).settings ?? {}) as SettingsMeta;
  const businessName = settings.businessName ?? 'Delicias Porteñas';
  const lineBreak = isWhatsApp ? '\n' : '\n';

  let reply = '';
  let nextState: string | null = ctx.previousState ?? null;
  let needsHuman = false;

  // Dado que Gemini genera la respuesta, sólo necesitamos manejar los casos
  // donde la IA NO SE ACTIVÓ (simpleIntents) o falló completamente (fallback).

  switch (intent.id) {
        // --- CASOS SIMPLES (SIN IA, SOLO REGLAS) ---
    case 'greeting': {
      reply = settings.messages?.welcome ?? `¡Hola! 👋 Soy Edu, tu asistente repostero de ${businessName}. Estoy aquí para ayudarte a encargar tu torta o pan favorito. ¿Qué te gustaría hacer hoy? Puedes pedirme algo como "Quiero una torta de chocolate" o "Consultar horarios".`;
      nextState = 'idle';
      break;
    }
    case 'goodbye': {
      reply = settings.messages?.closing ?? `¡Gracias por tu visita! Que tengas un excelente día. 🙌 Vuelve cuando quieras por tu pan o pastel favorito.`;
      nextState = 'ended';
      break;
    }
    case 'faq_hours': {
      const h = settings.hours ?? {};
      reply = `¡Con gusto! Te cuento los horarios de ${businessName}: ${lineBreak}🕒 Lunes a viernes: ${h.weekdays ?? '08:00 – 19:00'}${lineBreak}🕒 Sábados: ${h.saturday ?? '10:00 – 19:00'}${lineBreak}${h.sunday ?? '¡Ojo! Los Domingos y festivos trabajamos con disponibilidad especial. Puedes consultar por aquí si abrimos.'}`; 
      nextState = ctx.previousState ?? 'idle';
      break;
    }
        
        // --- CASOS DE FALLO (IA NO RESPONDIÓ) ---
    case 'smalltalk': // La IA no respondió a smalltalk
    case 'order_start': // La IA falló en un pedido
    case 'order_status': // La IA falló en el estado
    case 'faq_menu': // La IA falló en el menú
    case 'handoff_human': // La IA falló en el traspaso
    case 'fallback':
    default: {
        // En caso de fallo de la IA, usamos el mensaje de fallback genérico
      reply =
        `¡Uy! Aún no soy tan inteligente como una pastelera real 😅 No estoy seguro de haber entendido del todo.` +
        lineBreak +
        `¿Podrías decirme si quieres *Hacer un pedido*, *Consultar horarios* o *Ver el menú*?`;
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
  // 1) Intent por reglas (filtro rápido)
  const ruleIntent = detectIntent(ctx.text, ctx.previousState);

  // Intents simples donde las reglas suelen bastar y NO requieren NLU profundo
  // **Ajuste clave aquí:** Sacamos 'faq_menu' para que siempre vaya a la IA.
  const simpleIntents: IntentId[] = [
    'greeting',
    'goodbye',
    'faq_hours'
  ];

  if (
    ruleIntent.confidence >= 0.85 &&
    simpleIntents.includes(ruleIntent.id)
  ) {
    // Si es un saludo, despedida u horario simple, respondemos rápido con reglas.
    return buildReply(ruleIntent, ctx);
  }

  // 2) Para todos los demás casos, pedimos ayuda a la IA de Gemini
  let aiResult: AiNLUResult | null = null;

  try {
    // Enviamos el contexto a Gemini para NLU y Generación de Respuesta
    aiResult = await aiUnderstand(ctx, ruleIntent.id);
  } catch (err) {
    console.error('❌ Error en aiUnderstand:', err);
  }

  // 3) Si la IA devolvió algo razonable, usamos su clasificación, slots y respuesta GENERADA
  if (aiResult && aiResult.intentId) {
    const intent: IntentMatch = {
      id: aiResult.intentId,
      confidence: aiResult.confidence ?? 0.9,
      reason: `IA Generadora (${ruleIntent.id})`
    };

    const enhancedCtx: BotContext = {
      ...ctx,
      metadata: {
        ...(ctx.metadata ?? {}),
        aiSlots: aiResult.slots, // Pasamos los datos extraídos
        aiNeedsHuman: aiResult.needsHuman ?? false
      }
    };

    // --- LÓGICA DE RESPUESTA HÍBRIDA (USANDO GENERATED REPLY) ---
    
    // Si la IA extrajo un producto válido, adjuntamos la imagen
    const productoParaMedia = aiResult.slots?.producto ? buscarProductoPorTexto(aiResult.slots.producto) : null;
    
    // Determinamos el siguiente estado basado en la intención de la IA
    let nextState: string | null = null;
    if (aiResult.intentId === 'order_start' || aiResult.intentId === 'faq_menu') {
        nextState = 'collecting_order_details'; // Permanece en el flujo de pedido/cotización
    } else if (aiResult.intentId === 'goodbye') {
        nextState = 'ended';
    } else if (aiResult.needsHuman || aiResult.intentId === 'handoff_human') {
        nextState = 'handoff_requested';
    } else {
        nextState = 'idle';
    }

    const response: BotResponse = {
        reply: aiResult.generatedReply, // ⭐ LA RESPUESTA AMIGABLE Y CONTEXTUAL DE GEMINI
        intent: intent,
        nextState: nextState, 
        needsHuman: aiResult.needsHuman ?? false,
        meta: enhancedCtx.metadata,

        media: productoParaMedia ? [{
            type: 'image',
            url: buildImageUrl(productoParaMedia.imagen),
            caption: productoParaMedia.nombre
        }] : undefined
    };

    return response;
  }

  // 4) Si la IA falla, retrocedemos a las reglas (que ahora solo manejan los casos de fallo)
  return buildReply(ruleIntent, ctx);
}