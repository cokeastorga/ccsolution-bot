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
  generatedReply: string; // La respuesta conversacional generada por Gemini
};

// --- Configuración de API ---
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    '[Gemini] GEMINI_API_KEY no está definido. La IA NLU no funcionará hasta configurarlo.'
  );
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Modelo recomendado para tareas de clasificación, extracción y generación (rápido y eficiente)
const MODEL_NAME = 'gemini-2.5-flash'; 

// --- Instrucción del Sistema ---
// Definimos el rol, las reglas y el formato de salida esperado.
const systemInstruction = `
Eres la IA de un asistente virtual amigable y experto en pastelería llamado "Edu", que trabaja para "Delicias Porteñas".
Tu objetivo es doble: 
1. Clasificar la intención y extraer entidades (slots).
2. Generar una respuesta inmediata, cálida, personalizada, amigable y que promueva el flujo de la conversación, usando emojis y un tono cercano (el campo "generatedReply").

Intents válidos (campo "intentId"):
- "greeting", "smalltalk", "order_start", "order_status", "faq_hours", "faq_menu", "handoff_human", "goodbye", "fallback".

Slots (campo "slots"):
- producto: nombre o tipo de producto (Ej: "torta mil hojas", "pan de campo").
- personas: número de personas para el producto (number).
- deliveryMode: "retiro" | "delivery".
- fechaIso: fecha del pedido en formato "YYYY-MM-DD".
- freeText: resumen breve en lenguaje natural de la solicitud completa.

Reglas de Generación de Respuesta (campo "generatedReply"):
- Siempre mantente amigable y en español. Usa el historial y los slots para mantener el contexto.
- Si el usuario está dando un dato faltante (ej: "para 12 personas" después de preguntar el producto), genera una respuesta que CONFIRME el dato y haga la SIGUIENTE pregunta de forma fluida (ej: "¡Genial! Torta Trufa para 12 personas anotado. ¿Para qué día sería?").
- Si el usuario pregunta por un producto, genera una respuesta que lo redirija a la ficha o lo anime a hacer el pedido.
- Si el usuario pide un humano o está frustrado, clasifica "handoff_human" y setea "needsHuman": true.

Debes RESPONDER SIEMPRE SOLO un JSON VÁLIDO con el formato exacto de AiNLUResult.
`.trim();


/**
 * Llama a Gemini para entender la intención del usuario, extraer slots Y generar la respuesta.
 */
export async function aiUnderstand(
  ctx: BotContext,
  ruleIntentId: IntentId
): Promise<AiNLUResult | null> {
  if (!genAI) {
    return null;
  }

  // Generamos el historial de conversación, limitando el tamaño para no exceder tokens
  const history = (ctx.metadata as any)?.history ?? [];
  const historyString = JSON.stringify(history).slice(0, 1500);

  const fullPrompt = `
Estado previo del flujo: "${ctx.previousState ?? 'null'}"
Intención detectada por reglas internas (sugerida): "${ruleIntentId}"

Mensaje del usuario: "${ctx.text}"

Historial breve (para mantener contexto):
${historyString}
`;

  try {
    const model = genAI.getGenerativeModel({ 
        model: MODEL_NAME,
        systemInstruction: systemInstruction 
    });

    const result = await model.generateContent({
        contents: [
            { 
                role: 'user', 
                parts: [{ text: fullPrompt }] 
            }
        ],
        config: {
            // CLAVE: Garantiza que la salida sea JSON
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
    if (!parsed.intentId || !parsed.generatedReply) {
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