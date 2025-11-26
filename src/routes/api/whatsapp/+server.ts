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
  lastMessageAt?: any;
};

// GET → Verificación del webhook
export const GET: RequestHandler = async ({ url }) => {
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const settings = await getGlobalSettings();
  const VERIFY_TOKEN = settings.whatsapp.verifyToken || 'mi_token_seguro';

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    console.log('✅ WEBHOOK_VERIFIED (WhatsApp)');
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
};

// POST → Mensajes entrantes
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body) {
    return json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const settings = await getGlobalSettings();
  const whatsappCfg = settings.whatsapp;

  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages ?? [];

    if (!messages.length) {
      return json({ ok: true, skip: 'No messages' });
    }

    const message = messages[0];

    if (message.type !== 'text') {
      console.log('ℹ️ Ignorado (no texto):', message.type);
      return json({ ok: true, ignored: true });
    }

    const fromPhone: string = message.from;
    const text: string = message.text?.body ?? '';

    if (!text.trim()) {
      return json({ ok: true, ignored: 'Empty text' });
    }

    // 2) Cargar / Crear Conversación
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
      console.log('🆕 Nueva conversación:', conversationId);
    } else {
      convData = (convSnap.data() as ConversationDoc) || {};
    }

    // ==================================================================================
    // 🔴 LÓGICA TIMEOUT (5 MINUTOS)
    // ==================================================================================
    const TIMEOUT_MS = 5 * 60 * 1000;
    const now = Date.now();
    
    // Intentar obtener la fecha en milisegundos
    const lastMsgTime = convData.lastMessageAt?.toMillis 
      ? convData.lastMessageAt.toMillis() 
      : (convData.updatedAt?.toMillis ? convData.updatedAt.toMillis() : now);

    let previousState = convData.state ?? null;
    let previousMetadata = convData.metadata ?? {};

    if (now - lastMsgTime > TIMEOUT_MS) {
      console.log(`⏱️ Sesión expirada para ${conversationId}. Limpiando memoria de atención.`);
      
      previousState = null;
      previousMetadata = {
        ...previousMetadata,
        orderDraft: null,
        aiSlots: null,
        aiGeneratedReply: null
        // Se mantienen campos administrativos como 'wa', 'settings', etc.
      };
    }
    // ==================================================================================

    const history: HistoryItem[] = (convData.history ?? []).slice(-40);

    // 3) Motor del Chatbot
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
        settings
      }
    };

    const botResponse = await processMessage(ctx);

    const newHistory: HistoryItem[] = [
      ...history,
      { from: 'user', text, ts: Date.now() },
      { from: 'bot', text: botResponse.reply, ts: Date.now() }
    ].slice(-40);

    // ----------------------------------------------------------------
    // 🔴 LÓGICA LIMPIEZA PROACTIVA POR FIN DE FLUJO
    // ----------------------------------------------------------------
    const newMetadata: Record<string, unknown> = {
      ...previousMetadata,
      ...(botResponse.meta ?? {})
    };

    let nextStateToSave = botResponse.nextState ?? previousState ?? null;

    if (botResponse.shouldClearMemory) {
      console.log(`🧹 Limpiando memoria por fin de flujo (Pedido/Info) para ${conversationId}.`);
      
      newMetadata.orderDraft = null;
      newMetadata.aiSlots = null;
      newMetadata.aiGeneratedReply = null;
      
      // Reseteamos el estado para la próxima vez
      nextStateToSave = null;
    }
    // ----------------------------------------------------------------

    await updateDoc(convRef, {
      state: nextStateToSave,
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

    // 5) Notificación staff (si corresponde)
    if (botResponse.needsHuman) {
      const orderDraft = (botResponse.meta as any)?.orderDraft;

      // Guardar pedido en colección aparte si existe
      if (orderDraft) {
        const orderId = `${conversationId}-${Date.now()}`;
        const orderRef = doc(db, 'orders', orderId);
        await setDoc(orderRef, {
          conversationId,
          userId: fromPhone,
          channel,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: 'pending',
          draft: orderDraft
        });
      }

      // Enviar WhatsApp a admins
      try {
        const notifyPhones = (whatsappCfg.notificationPhones ?? '')
          .split(',')
          .map((p: string) => p.trim())
          .filter(Boolean);

        if (notifyPhones.length > 0 && whatsappCfg.accessToken && whatsappCfg.phoneNumberId) {
          const adminUrl = `https://graph.facebook.com/v21.0/${whatsappCfg.phoneNumberId}/messages`;
          const adminHeaders = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${whatsappCfg.accessToken}`
          };

          let staffMessageBody = '';
          if (orderDraft) {
            staffMessageBody = `📦 *NUEVO PEDIDO*\nCliente: ${fromPhone}\n\n${botResponse.reply}`;
          } else {
            staffMessageBody = `👤 *SOLICITUD ATENCIÓN*\nCliente: ${fromPhone}\nMsg: "${text}"`;
          }

          for (const adminPhone of notifyPhones) {
            if (adminPhone.length < 8) continue;
            await fetch(adminUrl, {
              method: 'POST',
              headers: adminHeaders,
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: adminPhone,
                type: 'text',
                text: { body: staffMessageBody }
              })
            }).catch(e => console.error(e));
          }
        }
      } catch (err) {
        console.error('Error notificando staff:', err);
      }
    }

    // 6) Logs
    try {
      const logCtx: BotContext = { ...ctx, metadata: newMetadata, previousState };
      logConversationEvent(logCtx, botResponse).catch(e => console.error(e));
    } catch (err) {
      console.error(err);
    }

    // 7) Enviar respuesta al usuario
    try {
      if (whatsappCfg.accessToken && whatsappCfg.phoneNumberId) {
        const url = `https://graph.facebook.com/v21.0/${whatsappCfg.phoneNumberId}/messages`;
        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${whatsappCfg.accessToken}`
        };

        await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: fromPhone,
            type: 'text',
            text: { body: botResponse.reply }
          })
        });

        if (botResponse.media && botResponse.media.length > 0) {
          for (const m of botResponse.media) {
            if (m.type === 'image') {
              await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  to: fromPhone,
                  type: 'image',
                  image: { link: m.url, caption: m.caption ?? '' }
                })
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('❌ Error enviando a WhatsApp:', e);
    }

    return json({ ok: true });

  } catch (err) {
    console.error('❌ Error webhook:', err);
    return json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
};