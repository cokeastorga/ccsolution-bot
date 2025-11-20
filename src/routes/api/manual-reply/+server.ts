// src/routes/api/manual-reply/+server.ts
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/firebase';
import {
  doc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { getGlobalSettings } from '$lib/settings';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body) {
    return json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { conversationId, text } = body as {
    conversationId?: string;
    text?: string;
  };

  if (!conversationId || !text?.trim()) {
    return json(
      { ok: false, error: 'conversationId y text son requeridos' },
      { status: 400 }
    );
  }

  const convRef = doc(db, 'conversations', conversationId);
  const convSnap = await getDoc(convRef);

  if (!convSnap.exists()) {
    return json(
      { ok: false, error: 'Conversación no encontrada' },
      { status: 404 }
    );
  }

  const convData = convSnap.data() as {
    channel: 'whatsapp' | 'web';
    userId?: string | null;
    needsHuman?: boolean;
    status?: 'open' | 'pending' | 'closed';
  };

  const channel = convData.channel ?? 'whatsapp';
  const userId = convData.userId;

  // 1️⃣ Registrar el mensaje en la subcolección messages
  const messagesRef = collection(convRef, 'messages');
  await addDoc(messagesRef, {
    from: 'staff',
    direction: 'out',
    text,
    intentId: null,
    confidence: null,
    stateBefore: null,
    stateAfter: null,
    createdAt: serverTimestamp()
  });

  // 2️⃣ Actualizar resumen de la conversación
  await updateDoc(convRef, {
    lastMessageAt: serverTimestamp(),
    lastMessageText: text,
    needsHuman: false,
    status: convData.status === 'closed' ? 'closed' : 'open',
    updatedAt: serverTimestamp()
  });

  // 3️⃣ Si es WhatsApp, enviar mensaje al cliente
  if (channel === 'whatsapp' && userId) {
    try {
      const settings = await getGlobalSettings();

      const accessToken =
        settings.whatsapp.accessToken || process.env.WHATSAPP_TOKEN;
      const phoneId =
        settings.whatsapp.phoneNumberId ||
        process.env.WHATSAPP_PHONE_NUMBER_ID;

      if (!accessToken || !phoneId) {
        console.error(
          '⚠️ Falta accessToken o phoneId para manual-reply (WhatsApp)'
        );
      } else {
        const waRes = await fetch(
          `https://graph.facebook.com/v20.0/${phoneId}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: userId,
              type: 'text',
              text: { body: text }
            })
          }
        );

        const waJson = await waRes.json().catch(() => ({}));

        if (!waRes.ok) {
          console.error('❌ Error enviando manual-reply a WhatsApp:', waJson);
        } else {
          console.log('✅ Manual-reply enviado a WhatsApp:', waJson);
        }
      }
    } catch (err) {
      console.error('❌ Error en manual-reply WhatsApp:', err);
    }
  }

  return json({ ok: true });
};
