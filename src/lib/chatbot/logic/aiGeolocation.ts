// src/lib/chatbot/logic/aiGeolocation.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '$env/dynamic/private';
import { stores, type Store } from '$lib/chatbot/data/stores';

const apiKey = env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function findNearestStoreWithAI(userAddress: string): Promise<Store> {
  // Fallback: si no hay API key o falla, devolvemos la primera tienda
  const defaultStore = stores[0];

  if (!genAI || !userAddress.trim()) return defaultStore;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Construimos el prompt con tus tiendas
    const storeListText = stores
      .map((s) => `- ID: ${s.id} | Dirección: ${s.direccion}`)
      .join('\n');

    const prompt = `
      Actúa como un experto en geografía de Valdivia, Chile.
      El usuario está en: "${userAddress}".
      
      Tengo estas tiendas:
      ${storeListText}
      
      Tu tarea:
      1. Estima la distancia desde la ubicación del usuario a cada tienda.
      2. Retorna ÚNICAMENTE el ID de la tienda más cercana.
      3. No des explicaciones, solo el ID (ej: s1).
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Buscamos qué ID nos devolvió la IA
    const foundStore = stores.find((s) => responseText.includes(s.id));

    return foundStore || defaultStore;

  } catch (error) {
    console.error('❌ Error en geolocalización IA:', error);
    return defaultStore;
  }
}