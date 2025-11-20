// src/lib/chatbot/engine.ts

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
 * Regla simple de detección de intención basada en keywords.
 * Luego se puede reemplazar por embeddings / LLM.
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
    if (hasAny(['confirmar', 'listo', 'ok', 'estaria bien'])) {
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
      'buenas noches'
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
      'hasta luego'
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
      'hacer un pedido'
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
  if (hasAny(['horario', 'abren', 'cierran', 'a que hora', 'atienden'])) {
    return {
      id: 'faq_hours',
      confidence: 0.88,
      reason: 'Consulta de horarios detectada'
    };
  }

  // Menú / carta / productos
  if (
    hasAny(['menu', 'carta', 'productos', 'lista de precios', 'catalogo'])
  ) {
    return {
      id: 'faq_menu',
      confidence: 0.88,
      reason: 'Consulta de menú / catálogo detectada'
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
      'atencion al cliente'
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

  const businessName = settings.businessName ?? 'CC Solution Bot';

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
          `¡Hola! 👋 Soy el asistente automático de ${businessName}.` +
          lineBreak +
          `Puedo ayudarte a:` +
          lineBreak +
          `• Hacer un pedido` +
          lineBreak +
          `• Consultar horarios o productos` +
          lineBreak +
          `• Derivarte con una persona del equipo`;
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
      reply =
        `Perfecto, iniciemos tu pedido 🧁` +
        lineBreak +
        `¿Qué te gustaría pedir? Puedes decir algo como:` +
        lineBreak +
        `• "Kuchen de frutilla para 8 personas"` +
        lineBreak +
        `• "Torta de hojarasca para el viernes"`;
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
        `Nuestros horarios de atención son:` +
        lineBreak +
        `🕒 Lunes a viernes: ${h.weekdays ?? '10:00 – 19:00'}` +
        lineBreak +
        `🕒 Sábados: ${h.saturday ?? '10:00 – 14:00'}` +
        lineBreak +
        `${
          h.sunday ??
          'Domingos y festivos: según disponibilidad (puedes consultar por aquí).'
        }`;
      nextState = ctx.previousState ?? 'idle';
      break;
    }

    case 'faq_menu': {
      reply =
        `Te comparto un resumen de nuestros productos principales 🍰` +
        lineBreak +
        `• Kuchen artesanales` +
        lineBreak +
        `• Tortas personalizadas` +
        lineBreak +
        `• Postres individuales` +
        lineBreak +
        `Si quieres, dime qué te interesa y te ayudo a cotizar.`;
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
          `Si más adelante necesitas hacer un pedido o resolver una duda, puedes hablarme de nuevo cuando quieras.`;
      }
      nextState = 'ended';
      break;
    }

    case 'fallback':
    default: {
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
 * construye respuesta y deja todo listo para que el caller lo loguee.
 */
export async function processMessage(ctx: BotContext): Promise<BotResponse> {
  const intent = detectIntent(ctx.text, ctx.previousState);
  const response = buildReply(intent, ctx);
  return response;
}
