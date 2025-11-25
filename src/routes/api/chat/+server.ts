// src/routes/api/chat/+server.ts
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { processMessage } from '$lib/chatbot/engine';

// Definimos la interfaz para evitar errores de tipo
interface ConversationDoc {
  state?: string | null;
  metadata?: Record<string, unknown>;
  history?: any[];
  channel?: string;
  userId?: string | null;
  createdAt?: any;
  updatedAt?: any;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Datos básicos
    const channel = (body.channel ?? 'web') as 'web' | 'whatsapp';
    // Aseguramos que userId sea string o null, NUNCA undefined
    const userId = body.userId || null; 
    const phone = body.phone || null;
    const text = String(body.text ?? '').trim();

    if (!text) return json({ error: 'Mensaje vacío' }, { status: 400 });

    // 1. Identificar conversación
    const conversationId =
      channel === 'whatsapp' && phone ? `wa:${phone}` :
      userId ? `web:${userId}` :
      `anon:${body.sessionId ?? 'default'}`;

    console.log(`Processing chat for: ${conversationId}`);

    const ref = doc(db, 'conversations', conversationId);
    const snap = await getDoc(ref);

    let conv: ConversationDoc;

    // 2. Crear si no existe
    if (!snap.exists()) {
      conv = {
        state: null,
        metadata: {},
        history: [],
        channel,
        userId: userId, // ✅ CORREGIDO: Ya no usamos "?? undefined"
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      // Esto fallaba antes porque le pasábamos undefined
      await setDoc(ref, conv);
    } else {
      conv = snap.data() as ConversationDoc;
    }

    // 3. Contexto para el cerebro del bot
    const ctx = {
      conversationId,
      userId: userId ?? undefined, // Aquí sí puede ser undefined (es memoria, no DB)
      channel,
      text,
      locale: 'es' as const,
      previousState: conv.state,
      metadata: {
        ...(conv.metadata ?? {}),
        history: conv.history,
        settings: { businessName: 'Delicias Porteñas' }
      }
    };

    // 4. Procesar mensaje (IA + Reglas)
    const response = await processMessage(ctx);

    // 5. Guardar historial y respuesta
    const newHistory = [
      ...(conv.history ?? []),
      { from: 'user', text, ts: Date.now() },
      { from: 'bot', text: response.reply, ts: Date.now() }
    ].slice(-40);

    await updateDoc(ref, {
      state: response.nextState ?? conv.state ?? null,
      metadata: { ...(conv.metadata ?? {}), ...(response.meta ?? {}) },
      history: newHistory,
      updatedAt: serverTimestamp()
    });

    // 6. Responder al cliente
    return json({
      reply: response.reply,
      media: response.media ?? [],
      needsHuman: response.needsHuman ?? false,
      intent: response.intent
    });

  } catch (error: any) {
    console.error('❌ ERROR CRÍTICO EN API/CHAT:', error);
    return json({ error: error.message || 'Error interno' }, { status: 500 });
  }
};