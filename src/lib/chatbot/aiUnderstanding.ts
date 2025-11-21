// src/lib/chatbot/aiUnderstanding.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { BotContext, IntentId } from '$lib/chatbot/engine';

export type AiSlots = {
  producto?: string; // Nombre del producto (ej: "torta mil hojas", "pan de campo")
  personas?: number; // Número de personas para la torta
  deliveryMode?: 'retiro' | 'delivery';
  fechaIso?: string; // Fecha en formato "YYYY-MM-DD"
  freeText?: string; // Resumen de lo que quiere
};

export type AiNLUResult = {
  intentId: IntentId;
  confidence: number;
  slots: AiSlots;
  needsHuman?: boolean;
};

// --- Configuración de API ---
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    '[Gemini] GEMINI_API_KEY no está definido. La IA NLU no funcionará hasta configurarlo.'
  );
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Modelo recomendado para tareas de clasificación y extracción (rápido y eficiente)
const MODEL_NAME = 'gemini-2.5-flash'; 

// --- Instrucción del Sistema ---
const systemInstruction = `
Eres un motor NLU (Natural Language Understanding) para el chatbot de la pastelería "Delicias Porteñas".
Tu única tarea es analizar el mensaje del usuario y devolver un objeto JSON con la intención clasificada y las entidades (slots) extraídas.

Intents válidos (campo "intentId"):
- "greeting"       -> saludos
- "smalltalk"      -> charla general
- "order_start"    -> inicio o continuación de un pedido (cotización, compra, etc.)
- "order_status"   -> consulta de estado de pedido
- "faq_hours"      -> consulta por horarios de atención
- "faq_menu"       -> consulta por menú, carta, tipos de productos
- "handoff_human"  -> cuando el usuario quiere hablar con una persona (necesita "needsHuman": true)
- "goodbye"        -> despedida
- "fallback"       -> cuando no queda claro qué quiere

Slots (campo "slots"):
- producto: nombre o tipo de producto (Ej: "torta mil hojas", "pan de campo").
- personas: número de personas para el producto (number).
- deliveryMode: "retiro" | "delivery".
- fechaIso: fecha del pedido en formato "YYYY-MM-DD".
- freeText: resumen breve en lenguaje natural de la solicitud completa.

Reglas clave para clasificar:
1.  Si el usuario pide un producto específico (ej: "torta de chocolate"), clasifica como **"order_start"**.
2.  Si el usuario pide explícitamente hablar con una persona ("asesor", "humano"), clasifica como **"handoff_human"** y setea **"needsHuman": true**.
3.  Si no puedes clasificar con alta confianza, usa **"fallback"** y **"confidence": 0.5 o menos**.

Debes RESPONDER SIEMPRE SOLO un JSON VÁLIDO con el formato exacto de AiNLUResult, incluyendo los campos "intentId", "confidence", "slots" y "needsHuman".
`.trim();


/**
 * Llama a Gemini para entender la intención del usuario y extraer slots.
 */
export async function aiUnderstand(
  ctx: BotContext,
  ruleIntentId: IntentId
): Promise<AiNLUResult | null> {
  if (!genAI) {
    return null;
  }

  // Creamos el mensaje de contexto para Gemini
  const userContext = `
Estado previo del flujo: "${ctx.previousState ?? 'null'}"
Intención detectada por reglas internas (sugerida): "${ruleIntentId}"

Mensaje del usuario: "${ctx.text}"
`.trim();

  // Generamos el historial de conversación, limitando el tamaño para no exceder tokens
  const history = (ctx.metadata as any)?.history ?? [];
  const historyString = JSON.stringify(history).slice(0, 1500);

  const fullPrompt = `${userContext}\n\nHistorial breve:\n${historyString}`;

  try {
    // Usamos el cliente con la configuración JSON Mode
    const model = genAI.getGenerativeModel({ 
        model: MODEL_NAME,
        systemInstruction: systemInstruction 
    });

    const result = await model.generateContent({
        contents: [
            // Solo pasamos el contenido del usuario, la instrucción del sistema va en la configuración
            { 
                role: 'user', 
                parts: [{ text: fullPrompt }] 
            }
        ],
        config: {
            // ⭐ CLAVE: Garantiza que la salida sea JSON
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

    // Normalización y validación
    if (!parsed.intentId || !['greeting', 'smalltalk', 'order_start', 'order_status', 'faq_hours', 'faq_menu', 'handoff_human', 'goodbye', 'fallback'].includes(parsed.intentId)) {
        // La IA devolvió una intención inválida o nula
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