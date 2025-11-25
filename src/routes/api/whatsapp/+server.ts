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

  // Config global
  const settings = await getGlobalSettings();
  const whatsappCfg = settings.whatsapp;

  // ----------------------------------------------------------------
  // 1) Parsear payload de WhatsApp
  // ----------------------------------------------------------------
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

    // ----------------------------------------------------------------
    // 2) Cargar / Crear Conversación en Firestore
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
      console.log('🆕 Nueva conversación:', conversationId);
    } else {
      convData = (convSnap.data() as ConversationDoc) || {};
    }

    const previousState = convData.state ?? null;
    const previousMetadata = convData.metadata ?? {};
    const history: HistoryItem[] = (convData.history ?? []).slice(-40);

    // ----------------------------------------------------------------
    // 3) Motor del Chatbot (IA + Lógica)
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
        settings
      }
    };

    const botResponse = await processMessage(ctx);

    // ----------------------------------------------------------------
    // 4) Actualizar Firestore
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
    // 5) NOTIFICACIÓN AL STAFF (ATENCIÓN PROACTIVA)
    //    Si needsHuman es true, avisamos al equipo con link directo.
    // ----------------------------------------------------------------
    if (botResponse.needsHuman) {
      
      const orderDraft = (botResponse.meta as any)?.orderDraft;

      // 5.1) Si es un pedido, guardarlo en la colección /orders
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
          draft: orderDraft,
          resumen: {
            producto: orderDraft.producto ?? null,
            personas: orderDraft.personas ?? null,
            fecha: orderDraft.fechaIso ?? null,
            // ... otros campos útiles
          }
        });
        console.log('📦 Pedido guardado:', orderId);
      }

      // 5.2) Enviar WhatsApp al Staff
      try {
        const notifyPhones = (whatsappCfg.notificationPhones ?? '')
          .split(',')
          .map((p: string) => p.trim())
          .filter(Boolean);

        if (
          notifyPhones.length > 0 &&
          whatsappCfg.accessToken &&
          whatsappCfg.phoneNumberId
        ) {
          const adminUrl = `https://graph.facebook.com/v21.0/${whatsappCfg.phoneNumberId}/messages`;
          const adminHeaders = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${whatsappCfg.accessToken}`
          };

          // Construir el mensaje para el Staff
          let staffMessageBody = '';

          if (orderDraft) {
            // Caso: Pedido Nuevo
            staffMessageBody = 
              `📦 *NUEVO PEDIDO CONFIRMADO*\n\n` +
              `Cliente: ${fromPhone}\n` +
              `Detalles:\n${botResponse.reply}\n\n` + // Usamos la respuesta del bot como resumen
              `👉 *Haz clic aquí para responderle:* https://wa.me/${fromPhone}`;
          } else {
            // Caso: Solicitud de Ayuda General
            staffMessageBody = 
              `👤 *SOLICITUD DE ATENCIÓN HUMANA*\n\n` +
              `El cliente ${fromPhone} pide hablar con alguien.\n` +
              `Último mensaje: "${text}"\n\n` +
              `👉 *Haz clic aquí para responderle:* https://wa.me/${fromPhone}`;
          }

          // Enviar a todos los números configurados
          for (const adminPhone of notifyPhones) {
            if (adminPhone.length < 8) continue; // Validación básica

            const adminPayload = {
              messaging_product: 'whatsapp',
              to: adminPhone,
              type: 'text' as const,
              text: { body: staffMessageBody }
            };

            await fetch(adminUrl, {
              method: 'POST',
              headers: adminHeaders,
              body: JSON.stringify(adminPayload)
            }).catch(err => console.error(`Error notificando a ${adminPhone}:`, err));
          }
          console.log('🔔 Staff notificado (Proactive Attention).');
        }
      } catch (err) {
        console.error('⚠️ Error en notificación al staff:', err);
      }
    }

    // ----------------------------------------------------------------
    // 6) Logs Detallados (opcional, en segundo plano)
    // ----------------------------------------------------------------
    try {
      const logCtx: BotContext = { ...ctx, metadata: newMetadata, previousState };
      // No usamos await para no bloquear la respuesta a Meta
      logConversationEvent(logCtx, botResponse).catch(e => console.error(e));
    } catch (err) {
      console.error(err);
    }

    // ----------------------------------------------------------------
    // 7) Enviar Respuesta al Usuario (WhatsApp Cloud API)
    // ----------------------------------------------------------------
    try {
      if (whatsappCfg.accessToken && whatsappCfg.phoneNumberId) {
        const url = `https://graph.facebook.com/v21.0/${whatsappCfg.phoneNumberId}/messages`;
        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${whatsappCfg.accessToken}`
        };

        // Enviar texto
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

        // Enviar imágenes si las hay
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
      console.error('❌ Error de red con WhatsApp API:', e);
    }

    // ----------------------------------------------------------------
    // 8) Responder OK a Meta
    // ----------------------------------------------------------------
    return json({ ok: true });

  } catch (err) {
    console.error('❌ Error general en webhook:', err);
    return json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
};