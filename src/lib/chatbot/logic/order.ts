// src/lib/chatbot/logic/order.ts
import { findNearestStoreWithAI } from '$lib/chatbot/logic/aiGeolocation';
import {
  buildMenuResumen,
  formatearDetalleProducto,
  selectTamanoPorPersonas,
  sugerirProductosParaPersonas,
  formatearSugerenciasPorciones,
  buscarProductoPorTexto,
  type Producto
} from '$lib/chatbot/catalog/productos';
import { buildImageUrl } from '$lib/chatbot/utils/images';
import type { BotContext, BotResponse, IntentMatch } from '$lib/chatbot/engine';

// Tipos específicos de pedidos
export type DeliveryMode = 'retiro' | 'delivery';

export type OrderDraft = {
  producto?: string | null;
  personas?: number;
  deliveryMode?: DeliveryMode;
  direccion?: string;
  sucursal?: string;
  fechaIso?: string;
  hora?: string;
  extras?: string;
  confirmado?: boolean;
};

// --- UTILIDADES DE EXTRACCIÓN DE TEXTO ---

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function extractPersonCount(text: string): number | null {
  const re = /(\d{1,3})\s*(personas?|prs|pax)?/gi;
  let match: RegExpExecArray | null;
  let best: number | null = null;
  while ((match = re.exec(text)) !== null) {
    const value = parseInt(match[1], 10);
    if (value > 0 && value <= 200) best = value;
  }
  return best;
}

function extractSizeKeyword(text: string): 'chico' | 'mediano' | 'grande' | null {
  const n = normalize(text);
  if (n.includes('chico') || n.includes('chica') || n.includes('pequen')) return 'chico';
  if (n.includes('mediano') || n.includes('mediana')) return 'mediano';
  if (n.includes('grande') || n.includes('familiar')) return 'grande';
  return null;
}

function extractDeliveryMode(text: string): DeliveryMode | null {
  const n = normalize(text);
  if (n.includes('retiro') || n.includes('retirar') || n.includes('local') || n.includes('tienda')) return 'retiro';
  if (n.includes('delivery') || n.includes('despacho') || n.includes('envio') || n.includes('enviar')) return 'delivery';
  return null;
}

type DateInfo = { raw: string; iso?: string };

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
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'miércoles', 'jueves', 'viernes', 'sabado', 'sábado'];

  if (n.includes('hoy')) return { raw: 'hoy', iso: formatIso(base) };
  if (n.includes('manana')) return { raw: 'mañana', iso: formatIso(addDays(base, 1)) };
  if (n.includes('pasado manana')) return { raw: 'pasado mañana', iso: formatIso(addDays(base, 2)) };

  for (let i = 0; i < DIAS.length; i++) {
    if (n.includes(normalize(DIAS[i]))) {
      const todayIdx = base.getDay();
      let diff = i - todayIdx;
      if (diff <= 0) diff += 7;
      return { raw: DIAS[i], iso: formatIso(addDays(base, diff)) };
    }
  }

  const dm = /(\d{1,2})\s+de\s+([a-záéíóú]+)/i.exec(n);
  if (dm) {
    const diaNum = parseInt(dm[1], 10);
    const mesIdx = MESES.findIndex(m => normalize(m) === normalize(dm[2]));
    if (mesIdx >= 0 && diaNum >= 1 && diaNum <= 31) {
      let year = base.getFullYear();
      const target = new Date(year, mesIdx, diaNum);
      if (target < base) year += 1;
      return { raw: `${diaNum} de ${MESES[mesIdx]}`, iso: formatIso(new Date(year, mesIdx, diaNum)) };
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
  
  let match = /(\d{1,2})[:.](\d{2})/.exec(n);
  if (match) {
    const hh = parseInt(match[1], 10);
    const mm = match[2];
    if (hh >= 0 && hh <= 23) return `${hh.toString().padStart(2, '0')}:${mm}`;
  }

  match = /(\d{1,2})\s*(hrs|horas|h|pm|am|de la tarde|de la manana)?/.exec(n);
  if (match) {
    let hh = parseInt(match[1], 10);
    const suffix = match[2] || '';
    if ((suffix.includes('pm') || suffix.includes('tarde')) && hh < 12) hh += 12;
    if (hh >= 0 && hh <= 23) return `${hh.toString().padStart(2, '0')}:00`;
  }

  return null;
}

// --- FUNCIONES PRINCIPALES DE LÓGICA ---

export function mergeOrderDraft(previous: OrderDraft | undefined, aiSlots: any, ctx: BotContext): OrderDraft {
  const draft: OrderDraft = { ...(previous ?? {}) };

  // Producto
  if (aiSlots?.producto) draft.producto = aiSlots.producto;

  // Personas
  if (typeof aiSlots?.personas === 'number') draft.personas = aiSlots.personas;
  else if (!draft.personas) {
    const fromText = extractPersonCount(ctx.text);
    if (fromText) draft.personas = fromText;
  }

  // Delivery Mode
  const explicitMode = extractDeliveryMode(ctx.text);
  if (explicitMode) {
    draft.deliveryMode = explicitMode;
  } else if (aiSlots?.deliveryMode && draft.deliveryMode === aiSlots.deliveryMode) {
    draft.deliveryMode = aiSlots.deliveryMode;
  }

  // Fecha y Hora
  if (aiSlots?.fechaIso) draft.fechaIso = aiSlots.fechaIso;
  const posibleHora = extractTime(ctx.text);
  if (posibleHora) draft.hora = posibleHora;

  // ---------------------------------------------------------
  // ✅ CONFIRMACIÓN MEJORADA
  // ---------------------------------------------------------
  const n = normalize(ctx.text);
  const palabrasConfirmacion = [
    'si', 'sí', 'ok', 'listo', 'dale', 'bueno', 
    'correcto', 'perfecto', 'confirmo', 'esta bien', 'está bien'
  ];

  const esConfirmacion = palabrasConfirmacion.some(kw => 
    n === kw || n.startsWith(kw + ' ') || n.includes(' ' + kw)
  );

  if (esConfirmacion) {
    draft.confirmado = true;
  }

  // Dirección (Contexto)
  const keywordsDireccion = ['av ', 'calle', 'pasaje', 'condominio', 'villa', 'poblacion', 'sector', 'block', 'depto'];
  const hasKeyword = keywordsDireccion.some(k => n.includes(k));
  
  const isContextualAddress = 
    draft.deliveryMode === 'retiro' && 
    !draft.direccion && 
    ctx.text.length > 3 &&
    !draft.confirmado &&
    !esConfirmacion && 
    !['no', 'gracias'].includes(n);

  if (!draft.direccion && (hasKeyword || isContextualAddress)) {
    draft.direccion = ctx.text.trim();
  }

  // Extras
  if (!draft.extras) {
    if (n.includes('vela') || n.includes('mensaje') || n.includes('tarjeta')) {
      draft.extras = ctx.text.trim();
    } else if (
      n === 'no' || n === 'nada' || n === 'ninguno' || 
      n.includes('nada mas') || n.includes('no gracias') || n.includes('ningun')
    ) {
      draft.extras = 'Ninguno';
    }
  }

  return draft;
}

export function buildOrderSummary(draft: OrderDraft): string {
  const partes: string[] = [];
  if (draft.producto) partes.push(`• Producto: *${draft.producto}*`);
  if (draft.personas) partes.push(`• Para: *${draft.personas}* personas`);
  if (draft.deliveryMode) partes.push(`• Modalidad: *${draft.deliveryMode === 'retiro' ? 'retiro en local' : 'delivery'}*`);
  if (draft.direccion) partes.push(`• Dirección: *${draft.direccion}*`);
  if (draft.sucursal) partes.push(`• Sucursal: *${draft.sucursal}*`);
  if (draft.fechaIso) partes.push(`• Fecha: *${draft.fechaIso}*`);
  if (draft.hora) partes.push(`• Hora: *${draft.hora}*`);
  if (draft.extras) partes.push(`• Extras: *${draft.extras}*`);
  return partes.join('\n');
}

export async function buildProductOrderResponse(
  producto: Producto | null,
  draft: OrderDraft,
  ctx: BotContext,
  intent: IntentMatch,
  lineBreak: string,
  aiReply?: string
): Promise<BotResponse> {
  const baseMeta = { ...((ctx.metadata ?? {}) as any), orderDraft: draft };

  if (draft.producto && !producto) {
    const draftCorregido = { ...draft, producto: null };
    const menu = buildMenuResumen(3);
    return {
      reply: `Mmm... lo siento 😅, pero no encuentro una torta llamada *"${draft.producto}"* en nuestro catálogo.\n\nAquí tienes algunas opciones disponibles:\n\n${menu}\n\n¿Te gustaría alguna de estas?`,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: { ...baseMeta, orderDraft: draftCorregido }
    };
  }

  if (!draft.producto) {
    if (draft.personas) {
      const sugerencias = sugerirProductosParaPersonas(draft.personas);
      const textoSugerencias = formatearSugerenciasPorciones(draft.personas, sugerencias);
      const intro = aiReply ? aiReply + lineBreak + lineBreak : '';
      return {
        reply: `${intro}${textoSugerencias}\n\nSi prefieres una torta específica, dime el nombre.`,
        intent,
        nextState: 'collecting_order_details',
        needsHuman: false,
        meta: { ...baseMeta, orderDraft: draft }
      };
    }
    const replyBase = aiReply ?? `¡Claro! 😊 Cuéntame qué torta te gustaría encargar.`;
    return {
      reply: `${replyBase}\nPor ejemplo: "Torta Alpina" o "Torta Mil Hojas".`,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: { ...baseMeta, orderDraft: draft }
    };
  }

  if (!draft.personas) {
    if (producto) {
      const imageUrl = buildImageUrl(producto.imagen);
      const detalle = formatearDetalleProducto(producto);
      const replyIntro = aiReply ?? `Perfecto, aquí tienes la información de *${producto.nombre}* 🍰`;
      return {
        reply: `${replyIntro}\n\n${detalle}\n\n¿Para cuántas personas sería aproximadamente?`,
        intent,
        nextState: 'collecting_order_details',
        needsHuman: false,
        meta: baseMeta,
        media: [{ type: 'image', url: imageUrl, caption: producto.nombre }]
      };
    }
    return { reply: `¿Para cuántas personas sería la torta?`, intent, nextState: 'collecting_order_details', needsHuman: false, meta: baseMeta };
  }

  if (draft.deliveryMode === 'delivery') {
    return {
      reply: `Lo siento mucho 😔. Por el momento **no contamos con servicio de delivery**, solo retiro en nuestros locales.\n\n¿Te acomoda cambiar tu pedido a *retiro en local*?`,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: { ...baseMeta, orderDraft: { ...draft, deliveryMode: undefined } }
    };
  }

  if (!draft.deliveryMode) {
    let sugerencia = '';
    if (producto && producto.tamanos) {
       const tam = selectTamanoPorPersonas(producto, draft.personas);
       if (tam) sugerencia = `\nPara *${draft.personas}* te recomiendo el tamaño *${tam.nombre}*.`;
    }
    
    const replyIntro = aiReply ?? `Genial, *${draft.producto}* para *${draft.personas}* personas 🥳`;
    const draftWithRetiro = { ...draft, deliveryMode: 'retiro' as DeliveryMode };

    return {
      reply: `${replyIntro}${sugerencia}\n\nTe cuento que por ahora **solo realizamos retiro en local** 🏪.\n\n¿En qué sector o dirección te encuentras? Así calculo qué sucursal te queda más cerca.`,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: { ...baseMeta, orderDraft: draftWithRetiro }
    };
  }

  if (draft.deliveryMode === 'retiro' && !draft.direccion) {
    return { 
      reply: `Perfecto, retiro en local ✅\n¿En qué sector o dirección te encuentras? Así calculo cuál sucursal te queda más cerca.`, 
      intent, 
      nextState: 'collecting_order_details', 
      needsHuman: false, 
      meta: baseMeta 
    };
  }

  if (draft.deliveryMode === 'retiro' && draft.direccion && !draft.sucursal) {
    const tiendaSugerida = await findNearestStoreWithAI(draft.direccion);
    draft.sucursal = tiendaSugerida.nombre;

    const reply =
      `¡Listo! 🗺️` +
      lineBreak +
      lineBreak +
      `Según tu ubicación en *"${draft.direccion}"*, la sucursal más cercana es: ` +
      lineBreak +
      `📍 *${tiendaSugerida.nombre}* (${tiendaSugerida.direccion}).` +
      lineBreak +
      lineBreak +
      `¿Para qué día y a qué hora pasarías por ella?`;

    return {
      reply,
      intent,
      nextState: 'collecting_order_details',
      needsHuman: false,
      meta: { ...baseMeta, orderDraft: draft }
    };
  }

  if (!draft.fechaIso || !draft.hora) {
    return { reply: `¿Para qué día y hora necesitas tu pedido?`, intent, nextState: 'collecting_order_details', needsHuman: false, meta: baseMeta };
  }

  if (!draft.extras) {
    return { reply: `Anotado 🗓️.\n¿Quieres agregar algo más? (velas, mensaje, etc.)`, intent, nextState: 'collecting_order_details', needsHuman: false, meta: baseMeta };
  }

  if (!draft.confirmado) {
    const resumen = buildOrderSummary(draft);
    return { reply: `Este sería tu pedido:\n${resumen}\n\n¿Está bien así para confirmar?`, intent, nextState: 'collecting_order_details', needsHuman: false, meta: baseMeta };
  }

  // 9. Pedido Finalizado / Derivación
  const resumen = buildOrderSummary(draft);
  return {
    reply: `¡Excelente! 🙌 Derivo tu pedido al equipo.\n\n${resumen}\n\n¡Gracias!, Ahora un Humano se contactara contigo para confirmar tu pedido, Hasta Luego!`,
    intent,
    nextState: 'handoff_requested',
    needsHuman: true,
    meta: baseMeta,
    // 🆕 IMPORTANTE: Limpiamos la memoria tras cerrar el pedido
    shouldClearMemory: true 
  };
}