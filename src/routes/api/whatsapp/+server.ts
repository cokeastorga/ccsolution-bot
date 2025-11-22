// src/routes/api/whatsapp/+server.ts
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import {
  processMessage,
  type BotContext,
  type Channel
} from '$lib/chatbot/engine';
import { logConversationEvent } from '$lib/chatbot/store';
import { getGlobalSettings } from '$lib/settings.server';
import { db } from '$lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

/**
 * Estructura mínima de la conversación en Firestore.
 * Firestore es schemaless, esto es solo para tipos.
 */
type HistoryItem = {
  from: 'user' | 'bot';
  text: string;
  ts: number;
};

type ConversationDoc = {
  state?: string | null;
  metadata?: Record<string, unknown>;
  history?: HistoryItem[];
  channel?: Channel;
  userId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

// GET → verificación inicial del webhook con Meta
export const GET: RequestHandler = async ({ url }) => {
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  // Leemos settings para usar el verifyToken configurado
  const settings = await getGlobalSettings();
  const VERIFY_TOKEN = settings.whatsapp.verifyToken || 'mi_token_seguro';

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    console.log('✅ WEBHOOK_VERIFIED (WhatsApp)');
    return new Response(challenge, { status: 200 });
  }

  console.warn('❌ Verificación de webhook fallida');
  return new Response('Forbidden', { status: 403 });
};

// POST → mensajes entrantes de WhatsApp
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body) {
    return json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  // Config global (tokens, phoneNumberId, etc.)
  const settings = await getGlobalSettings();
  const whatsappCfg = settings.whatsapp;

  // ----------------------------------------------------------------
  // 1) Parsear payload de WhatsApp Cloud API
  // ----------------------------------------------------------------
  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages ?? [];

    if (!messages.length) {
      // Puede ser un evento de status, etc.
      return json({ ok: true, skip: 'No messages in payload' });
    }

    const message = messages[0];

    // Solo manejamos texto por ahora
    if (message.type !== 'text') {
      console.log('ℹ️ Mensaje ignorado (no es texto):', message.type);
      return json({ ok: true, ignored: true });
    }

    const fromPhone: string = message.from; // número del cliente
    const text: string = message.text?.body ?? '';

    if (!text.trim()) {
      return json({ ok: true, ignored: 'Empty text' });
    }

    // ----------------------------------------------------------------
    // 2) Cargar / crear conversación en Firestore
    // ----------------------------------------------------------------
    const channel: Channel = 'whatsapp';
    const conversationId = `wa:${fromPhone}`;

    const convRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(convRef);

    let convData: ConversationDoc;

    if (!convSnap.exists()) {
      convData = {
        state: null,
        metadata: {},
        history: [],
        channel,
        userId: fromPhone,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(convRef, convData);
      console.log('🆕 Nueva conversación creada:', conversationId);
    } else {
      convData = (convSnap.data() as ConversationDoc) || {};
    }

    const previousState = convData.state ?? null;
    const previousMetadata = convData.metadata ?? {};
    const previousHistory = convData.history ?? [];

    // Historial corto para la IA (no más de ~40 mensajes)
    const history: HistoryItem[] = previousHistory.slice(-40);

    // ----------------------------------------------------------------
    // 3) Construir BotContext y llamar al motor (IA + catálogo)
    // ----------------------------------------------------------------
    const ctx: BotContext = {
      conversationId,
      userId: fromPhone,
      channel,
      text,
      locale: 'es',
      previousState,
      metadata: {
        ...previousMetadata,
        history,
        settings // le pasamos todos los settings al motor
      }
    };

    const botResponse = await processMessage(ctx);

    // ----------------------------------------------------------------
    // 4) Actualizar conversación en Firestore (estado + metadata + history)
    // ----------------------------------------------------------------
    const newHistory: HistoryItem[] = [
      ...history,
      { from: 'user', text, ts: Date.now() },
      { from: 'bot', text: botResponse.reply, ts: Date.now() }
    ].slice(-40);

    const newMetadata: Record<string, unknown> = {
      ...previousMetadata,
      ...(botResponse.meta ?? {})
    };

    await updateDoc(convRef, {
      state: botResponse.nextState ?? previousState ?? null,
      metadata: newMetadata,
      history: newHistory,
      channel,
      userId: fromPhone,
      updatedAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      lastMessageText: text,
      needsHuman: botResponse.needsHuman ?? false,
      status: botResponse.needsHuman ? 'pending' : 'open'
    });

    // ----------------------------------------------------------------
    // 5) Registrar evento detallado (mensajes en subcolección)
    //    ⚠️ Importante: NO le pasamos rawPayload para que NO sobreescriba metadata.
    // ----------------------------------------------------------------
    try {
      const logCtx: BotContext = {
        ...ctx,
        metadata: newMetadata,
        previousState
      };
      await logConversationEvent(logCtx, botResponse);
    } catch (err) {
      console.error('⚠️ Error en logConversationEvent:', err);
    }

    // ----------------------------------------------------------------
    // 6) Enviar respuesta al cliente por WhatsApp Cloud API
    // ----------------------------------------------------------------
    try {
      const url = `https://graph.facebook.com/v21.0/${whatsappCfg.phoneNumberId}/messages`;

      // Primero texto
      const textPayload = {
        messaging_product: 'whatsapp',
        to: fromPhone,
        type: 'text' as const,
        text: {
          body: botResponse.reply
        }
      };

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${whatsappCfg.accessToken}`
      };

      const textRes = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(textPayload)
      });

      if (!textRes.ok) {
        const errBody = await textRes.text();
        console.error('❌ Error enviando mensaje de texto a WhatsApp:', errBody);
      } else {
        console.log('✅ Mensaje de texto enviado a WhatsApp');
      }

      // Luego, si hay media (imágenes de tortas), las mandamos
      if (botResponse.media && botResponse.media.length > 0) {
        for (const m of botResponse.media) {
          if (m.type !== 'image') continue;

          const imagePayload = {
            messaging_product: 'whatsapp',
            to: fromPhone,
            type: 'image' as const,
            image: {
              link: m.url,
              caption: m.caption ?? ''
            }
          };

          const imgRes = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(imagePayload)
          });

          if (!imgRes.ok) {
            const errBody = await imgRes.text();
            console.error('❌ Error enviando imagen a WhatsApp:', errBody);
          } else {
            console.log('✅ Imagen enviada a WhatsApp');
          }
        }
      }
    } catch (e) {
      console.error('❌ Error de red con WhatsApp Cloud API:', e);
    }

    // ----------------------------------------------------------------
    // 7) Responder a Meta rápido
    // ----------------------------------------------------------------
    return json({
      ok: true,
      handled: true,
      replyPreview: botResponse.reply
    });
  } catch (err) {
    console.error('❌ Error general en webhook de WhatsApp:', err);
    return json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
};
