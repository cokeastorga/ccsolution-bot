import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { processMessage } from '$lib/chatbot/engine';

// Definimos la interfaz aquí para evitar errores de importación
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
    const channel = (body.channel ?? 'web') as 'web' | 'whatsapp';
    const userId = body.userId ?? null;
    const phone = body.phone ?? null;
    const text = String(body.text ?? '').trim();

    if (!text) return json({ error: 'Mensaje vacío' }, { status: 400 });

    // ID de conversación
    const conversationId =
      channel === 'whatsapp' && phone ? `wa:${phone}` :
      userId ? `web:${userId}` :
      `anon:${body.sessionId ?? 'default'}`;

    console.log(`Processing chat for: ${conversationId}`); // Log para debug

    const ref = doc(db, 'conversations', conversationId);
    const snap = await getDoc(ref); // <--- AQUÍ suele fallar por permisos

    let conv: ConversationDoc;

    if (!snap.exists()) {
      conv = {
        state: null,
        metadata: {},
        history: [],
        channel,
        userId: userId ?? undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await setDoc(ref, conv);
    } else {
      conv = snap.data() as ConversationDoc;
    }

    // Contexto para el motor
    const ctx = {
      conversationId,
      userId: userId ?? undefined,
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

    // Llamada al cerebro del bot
    const response = await processMessage(ctx);

    // Actualizar historial
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

    return json({
      reply: response.reply,
      media: response.media ?? [],
      needsHuman: response.needsHuman ?? false,
      intent: response.intent
    });

  } catch (error: any) {
    console.error('❌ ERROR EN API/CHAT:', error);
    // Devolvemos el error exacto para que lo veas en el navegador (F12 > Network)
    return json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
};