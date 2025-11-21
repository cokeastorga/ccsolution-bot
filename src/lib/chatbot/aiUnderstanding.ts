// src/lib/chatbot/aiUnderstanding.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { BotContext, IntentId } from '$lib/chatbot/engine';

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
};

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    '[Gemini] GEMINI_API_KEY no está definido. La IA NLU no funcionará hasta configurarlo.'
  );
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Modelo recomendado: puedes cambiar a "gemini-1.5-flash" si quieres más barato y rápido
const MODEL_NAME = 'gemini-1.5-pro';

/**
 * Llama a Gemini para entender la intención del usuario y extraer slots.
 * Esta función NO responde al usuario, solo devuelve estructura NLU.
 */
export async function aiUnderstand(
  ctx: BotContext,
  ruleIntentId: IntentId
): Promise<AiNLUResult | null> {
  if (!genAI) {
    return null;
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const history = (ctx.metadata as any)?.history ?? [];

  const systemPrompt = `
Eres un motor NLU (Natural Language Understanding) para el chatbot de la pastelería "Delicias Porteñas".

IMPORTANTE:
- NO hablas con el cliente.
- NO inventas productos nuevos, si el usuario pide algo que no parece torta o producto de pastelería, igualmente intenta inferir lo mejor posible.
- Tu única tarea es analizar el mensaje y devolver JSON.
- El idioma principal es español (Chile), pero podrías recibir algo de inglés mezclado.

Intents válidos (campo "intentId"):
- "greeting"       -> saludos ("hola", "buenas", etc.)
- "smalltalk"      -> charla general ("cómo estás", "quién eres", etc.)
- "order_start"    -> inicio o continuación de un pedido (tortas, kuchen, productos)
- "order_status"   -> consulta de estado de pedido
- "faq_hours"      -> consulta por horarios de atención
- "faq_menu"       -> consulta por menú, carta, tipos de tortas, productos
- "handoff_human"  -> cuando el usuario quiere hablar con una persona
- "goodbye"        -> despedida
- "fallback"       -> cuando no queda claro qué quiere

Slots (campo "slots"):
- producto: nombre de la torta o producto (string o null) 
  (Ej: "torta mil hojas", "torta selva negra", "torta alpina")
- personas: número de personas para la torta (number o null)
- deliveryMode: "retiro" | "delivery" | null
- fechaIso: fecha en formato "YYYY-MM-DD" si se puede inferir, si no null
- freeText: breve resumen en lenguaje natural de lo que quiere el usuario

Reglas:
- Si el usuario pide explícitamente hablar con "una persona", "humano", "dueño", etc.:
    -> intentId: "handoff_human"
    -> needsHuman: true
- Si el usuario claramente está haciendo un pedido o modificando un pedido existente (aunque no diga "pedido"):
    -> intentId: "order_start"
- Si el mensaje es principalmente agradecimiento o cierre:
    -> intentId: "goodbye"
- Si pregunta por horarios:
    -> intentId: "faq_hours"
- Si pregunta por tortas/menú/carta:
    -> intentId: "faq_menu"
- Si no estás seguro:
    -> intentId: "fallback"
    -> confidence <= 0.5

Debes RESPONDER SIEMPRE SOLO un JSON VÁLIDO con este formato:

{
  "intentId": "order_start",
  "confidence": 0.9,
  "slots": {
    "producto": "torta mil hojas",
    "personas": 20,
    "deliveryMode": "delivery",
    "fechaIso": "2025-11-25",
    "freeText": "Quiere una torta mil hojas para 20 personas con delivery"
  },
  "needsHuman": false
}

No incluyas comentarios, texto extra ni explicaciones fuera del JSON.
`.trim();

  const userPrompt = `
Mensaje actual del usuario:
"${ctx.text}"

Estado previo del flujo: "${ctx.previousState ?? 'null'}"
Intención detectada por reglas internas: "${ruleIntentId}"

Historial breve de la conversación (si existe, array JSON de mensajes):
${JSON.stringify(history).slice(0, 1500)}
`.trim();

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            { text: '\n\n---\n\n' },
            { text: userPrompt }
          ]
        }
      ]
    });

    const response = result.response;
    const rawText = response.text() ?? '{}';

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

    return parsed;
  } catch (error) {
    console.error('[Gemini NLU] Error en generateContent:', error);
    return null;
  }
}
