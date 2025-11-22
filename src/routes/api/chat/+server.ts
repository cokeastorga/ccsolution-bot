// src/routes/api/chat/+server.ts  (ejemplo)
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { processMessage } from '$lib/chatbot/engine';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();

  // 🔑 Identificador de conversación
  const channel = (body.channel ?? 'web') as 'web' | 'whatsapp';
  const userId = body.userId ?? null;
  const phone = body.phone ?? null; // si viene de WhatsApp
  const text = String(body.text ?? '').trim();

  if (!text) {
    return json({ error: 'Empty message' }, { status: 400 });
  }

  // Puedes definir conversationId como:
  // - userId (web logueado)
  // - phone (whatsapp)
  const conversationId =
    channel === 'whatsapp' && phone ? `wa:${phone}` :
    userId ? `web:${userId}` :
    `anon:${body.sessionId ?? 'default'}`;

  const ref = doc(db, 'conversations', conversationId);
  const snap = await getDoc(ref);

  let conv: ConversationDoc;

  if (!snap.exists()) {
    conv = {
      state: null,
      metadata: {},
      history: [],
      channel,
      userId: userId ?? undefined,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await setDoc(ref, conv);
  } else {
    conv = snap.data() as ConversationDoc;
  }

  // 🧠 Construimos el contexto para el motor
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
      settings: {
        businessName: 'Delicias Porteñas'
        // puedes meter horarios, mensajes, etc.
      }
    }
  };

  // 💬 Llamamos al motor (usa IA + catálogo)
  const response = await processMessage(ctx);

  // 🧾 Actualizamos historial
  const newHistory = [
    ...(conv.history ?? []),
    { from: 'user' as const, text, ts: Date.now() },
    { from: 'bot' as const, text: response.reply, ts: Date.now() }
  ].slice(-40); // por ejemplo, últimos 40 mensajes

  // 🧠 Guardamos nuevo estado + metadata (incluye orderDraft)
  await updateDoc(ref, {
    state: response.nextState ?? conv.state ?? null,
    metadata: {
      ...(conv.metadata ?? {}),
      ...(response.meta ?? {})
    },
    history: newHistory,
    updatedAt: Date.now()
  });

  // 🔁 Devolvemos lo que el frontend / whatsapp necesita
  return json({
    reply: response.reply,
    media: response.media ?? [],
    needsHuman: response.needsHuman ?? false,
    intent: response.intent
  });
};
    