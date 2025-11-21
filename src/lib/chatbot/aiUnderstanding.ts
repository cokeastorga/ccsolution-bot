// src/lib/chatbot/aiUnderstanding.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { BotContext, IntentId } from '$lib/chatbot/engine';

// --- Tipos de Datos para Slots y NLU Result ---
export type AiSlots = {
  producto?: string;
  personas?: number;
  deliveryMode?: 'retiro' | 'delivery';
  fechaIso?: string;
  freeText?: string;
};

export type AiNLUResult = {
  intentId: IntentId;
  confidence: number;
  slots: AiSlots;
  needsHuman?: boolean;
  generatedReply: string; // Respuesta conversacional generada por Gemini (el sistema puede o no usarla)
};

// --- Configuración de API ---
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    '[Gemini] GEMINI_API_KEY no está definido. La IA NLU no funcionará hasta configurarlo.'
  );
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Modelo recomendado para tareas de NLU (rápido y eficiente)
const MODEL_NAME = 'gemini-2.5-flash';

// --- Instrucción del Sistema ---
// Rol, reglas y formato de salida esperado.
const systemInstruction = `
Eres la IA de un asistente virtual amigable y experto en pastelería llamado "Edu", que trabaja para "Delicias Porteñas".

Tu objetivo principal es:
1. Clasificar la intención del usuario (campo "intentId").
2. Extraer entidades relevantes (campo "slots") para construir un pedido de tortas.
3. (Opcional) Generar una respuesta inmediata, cálida, personalizada y que ayude a continuar la conversación (campo "generatedReply").

IMPORTANTE:
- NO hablas directamente con el usuario, tu salida será procesada por otro sistema.
- SOLO debes devolver JSON válido, sin texto extra, comentarios ni explicaciones.
- El idioma principal es español (Chile).

Intents válidos (campo "intentId"):
- "greeting"       -> saludos ("hola", "buenas", etc.)
- "smalltalk"      -> charla general ("cómo estás", "quién eres", etc.)
- "order_start"    -> inicio o continuación de un pedido (tortas, kuchen, productos)
- "order_status"   -> consulta de estado de pedido
- "faq_hours"      -> consulta de horarios de atención
- "faq_menu"       -> consulta de menú, carta, tipos de tortas y productos
- "handoff_human"  -> cuando el usuario quiere hablar con una persona
- "goodbye"        -> despedida / cierre
- "fallback"       -> cuando no queda claro qué quiere el usuario

Slots (campo "slots"):
- producto: nombre o tipo de producto (por ejemplo "torta mil hojas", "torta selva negra", "torta trufa").
- personas: número aproximado de personas para la torta (number).
- deliveryMode: "retiro" | "delivery" (si el usuario menciona retiro en local, tienda, delivery, envío, despacho, etc.).
- fechaIso: fecha del pedido en formato "YYYY-MM-DD" si se puede inferir (por ejemplo, "el viernes", "25 de noviembre").
- freeText: resumen breve (en español) de lo que quiere el usuario, en lenguaje natural.

Reglas para "needsHuman":
- Si el usuario pide explícitamente hablar con una persona, humano, encargado, dueño, etc.:
    -> intentId: "handoff_human"
    -> needsHuman: true
- Si la solicitud es confusa o ambigua pero parece importante:
    -> puedes marcar needsHuman: true aunque el intentId sea otro.

Reglas generales:
- Si el usuario está haciendo o ajustando un pedido (aunque no diga "pedido"):
    -> intentId: "order_start"
- Si pregunta por horarios:
    -> intentId: "faq_hours"
- Si pregunta qué tortas tienen, variedades, menú, catálogo, etc.:
    -> intentId: "faq_menu"
- Si solo agradece o se despide:
    -> intentId: "goodbye"
- Si no estás seguro:
    -> intentId: "fallback"
    -> confidence ≤ 0.5

Campo "generatedReply":
- Debe ser una respuesta en ESPAÑOL, amigable, natural y breve.
- Usa tono cercano, puedes usar algunos emojis, pero no abuses.
- Debe sonar como "Edu", un asistente de pastelería simpático.
- El sistema puede ignorar este texto y usar solo los slots, así que NO dependas de que se muestre al usuario.

FORMATO DE RESPUESTA:
Debes RESPONDER SIEMPRE SOLO un JSON VÁLIDO, sin texto adicional, con este formato:

{
  "intentId": "order_start",
  "confidence": 0.9,
  "slots": {
    "producto": "torta mil hojas",
    "personas": 20,
    "deliveryMode": "delivery",
    "fechaIso": "2025-11-25",
    "freeText": "Quiere encargar una torta mil hojas para 20 personas con delivery"
  },
  "needsHuman": false,
  "generatedReply": "Perfecto, anotamos una torta mil hojas para 20 personas con delivery. ¿Para qué día y a qué hora la necesitas?"
}
`.trim();

/**
 * Llama a Gemini para entender la intención del usuario, extraer slots
 * y (opcionalmente) generar una respuesta conversacional.
 */
export async function aiUnderstand(
  ctx: BotContext,
  ruleIntentId: IntentId
): Promise<AiNLUResult | null> {
  if (!genAI) {
    return null;
  }

  // Historial breve de conversación (si lo pasas en metadata.history)
  const history = (ctx.metadata as any)?.history ?? [];
  const historyString = JSON.stringify(history).slice(0, 1500);

  const fullPrompt = `
Estado previo del flujo: "${ctx.previousState ?? 'null'}"
Intención detectada por reglas internas (sugerida): "${ruleIntentId}"

Mensaje actual del usuario:
"${ctx.text}"

Historial breve (para contexto, si existe):
${historyString}
`.trim();

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction
    });

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: fullPrompt }]
        }
      ],
      generationConfig: {
        // Clave: obligamos a que la salida sea JSON
        responseMimeType: 'application/json'
      }
    });

    const rawText = result.response.text() ?? '{}';

    let parsed: AiNLUResult;
    try {
      parsed = JSON.parse(rawText) as AiNLUResult;
    } catch (err) {
      console.error('[Gemini NLU] Error parseando JSON:', err, rawText);
      return null;
    }

    // Normalización mínima
    if (!parsed.intentId) {
      return null;
    }

    if (parsed.confidence == null) {
      parsed.confidence = 0.9;
    }

    if (!parsed.slots) {
      parsed.slots = {};
    }

    if (!parsed.generatedReply) {
      parsed.generatedReply = '';
    }

    return parsed;
  } catch (error) {
    console.error('[Gemini NLU] Error en generateContent:', error);
    return null;
  }
}
