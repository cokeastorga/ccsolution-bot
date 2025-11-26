// src/routes/api/webhook/+server.ts
import { getGlobalSettings } from '$lib/settings.server';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import {
  processMessage,
  type BotContext,
  type Channel
} from '$lib/chatbot/engine';
import { logConversationEvent } from '$lib/chatbot/store';
import { db } from '$lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

// Tipos auxiliares para el historial
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

// GET: Verificación del webhook
export const GET: RequestHandler = async ({ url }) => {
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  // Cargar token desde configuración o env
  const settings = await getGlobalSettings();
  const VERIFY_TOKEN = settings.whatsapp.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN || 'mi_token_seguro';

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    console.log('✅ WEBHOOK_VERIFIED (WhatsApp)');
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
};

// POST: Procesar mensajes entrantes
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body) return json({ ok: false, error: 'Invalid JSON' }, { status: 400 });

  // Validación básica de evento WhatsApp
  if (body.object !== 'whatsapp_business_account') {
    return json({ ok: true, skip: 'Not a WhatsApp event' });
  }

  const entry = body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const messages = value?.messages ?? [];

  if (!messages.length) {
    return json({ ok: true, skip: 'No messages' });
  }

  const msg = messages[0];

  // Solo procesamos texto
  if (msg.type !== 'text') {
    console.log('ℹ️ Ignorado (no texto):', msg.type);
    return json({ ok: true, ignored: true });
  }

  const fromPhone: string = msg.from;
  const text: string = msg.text?.body ?? '';

  if (!text.trim()) {
    return json({ ok: true, ignored: 'Empty text' });
  }

  // Cargar configuración global
  let settings: any = { whatsapp: {} };
  try {
    settings = await getGlobalSettings();
  } catch (err) {
    console.error('❌ Error leyendo settings:', err);
  }

  const whatsappCfg = settings.whatsapp;
  const accessToken = whatsappCfg.accessToken || process.env.WHATSAPP_TOKEN;
  const phoneId = whatsappCfg.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

  // ----------------------------------------------------------------
  // 1. Gestión de Conversación en Firestore
  // ----------------------------------------------------------------
  const conversationId = `wa:${fromPhone}`;
  const convRef = doc(db, 'conversations', conversationId);
  const convSnap = await getDoc(convRef);

  let convData: ConversationDoc;

  if (!convSnap.exists()) {
    convData = {
      state: null,
      metadata: {},
      history: [],
      channel: 'whatsapp',
      userId: fromPhone,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(convRef, convData);
  } else {
    convData = (convSnap.data() as ConversationDoc) || {};
  }

  // ----------------------------------------------------------------
  // 2. Lógica Timeout (5 Minutos)
  // ----------------------------------------------------------------
  const TIMEOUT_MS = 5 * 60 * 1000;
  const now = Date.now();
  
  // Obtener timestamp del último mensaje de forma segura
  const lastMsgTime = convData.lastMessageAt?.toMillis 
    ? convData.lastMessageAt.toMillis() 
    : (convData.updatedAt?.toMillis ? convData.updatedAt.toMillis() : now);

  let previousState = convData.state ?? null;
  let previousMetadata = convData.metadata ?? {};
  
  // Si expiró el tiempo, limpiamos el contexto ANTES de procesar
  if (now - lastMsgTime > TIMEOUT_MS) {
    console.log(`⏱️ Sesión expirada para ${conversationId}. Reiniciando contexto.`);
    previousState = null;
    // Limpiamos SOLO datos de flujo, mantenemos configuración administrativa
    previousMetadata = {
      ...previousMetadata,
      orderDraft: null,
      aiSlots: null,
      aiGeneratedReply: null
    };
  }

  // Historial para la IA (últimos 15 mensajes para dar contexto suficiente)
  const history: HistoryItem[] = (convData.history ?? []).slice(-15);

  // ----------------------------------------------------------------
  // 3. Llamada al Motor (Engine + IA)
  // ----------------------------------------------------------------
  const ctx: BotContext = {
    conversationId,
    userId: fromPhone,
    channel: 'whatsapp',
    text,
    locale: 'es',
    previousState,
    metadata: {
      ...previousMetadata,
      history,  // Pasamos el historial limpio
      settings, // Pasamos la config global
      wa: {     // Datos técnicos de WhatsApp
        phone_number: value?.metadata?.display_phone_number,
        phone_number_id: phoneId
      }
    }
  };

  // Procesamos el mensaje
  const botResponse = await processMessage(ctx);

  // ----------------------------------------------------------------
  // 4. Actualización de Estado (Post-Proceso)
  // ----------------------------------------------------------------
  const newHistory: HistoryItem[] = [
    ...history,
    { from: 'user', text, ts: Date.now() },
    { from: 'bot', text: botResponse.reply, ts: Date.now() }
  ].slice(-40); // Guardamos más historial en DB por seguridad

  // Preparamos la nueva metadata con lo que devolvió el motor
  const newMetadata: Record<string, unknown> = {
    ...previousMetadata,
    ...(botResponse.meta ?? {})
  };

  // Lógica de limpieza por "Fin de Flujo" (shouldClearMemory)
  let nextStateToSave = botResponse.nextState ?? previousState ?? null;

  if (botResponse.shouldClearMemory) {
    console.log(`🧹 Limpiando memoria por fin de flujo para ${conversationId}.`);
    delete newMetadata.orderDraft;
    delete newMetadata.aiSlots;
    delete newMetadata.aiGeneratedReply;
    nextStateToSave = null;
  }

  // Guardamos en Firestore
  await updateDoc(convRef, {
    state: nextStateToSave,
    metadata: newMetadata,
    history: newHistory,
    userId: fromPhone,
    updatedAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
    lastMessageText: text,
    needsHuman: botResponse.needsHuman ?? false,
    status: botResponse.needsHuman ? 'pending' : 'open'
  });

  // ----------------------------------------------------------------
  // 5. Notificaciones y Logs
  // ----------------------------------------------------------------
  
  // Notificar a Staff si se requiere humano
  if (botResponse.needsHuman) {
    const orderDraft = (botResponse.meta as any)?.orderDraft;
    
    // Guardar pedido confirmado en colección separada 'orders'
    if (orderDraft && orderDraft.confirmado) {
        const orderId = `${conversationId}-${Date.now()}`;
        await setDoc(doc(db, 'orders', orderId), {
            conversationId,
            userId: fromPhone,
            channel: 'whatsapp',
            createdAt: serverTimestamp(),
            status: 'pending',
            draft: orderDraft
        });
    }

    // Enviar alerta por WhatsApp a los admins
    try {
      const notifyPhones = (whatsappCfg.notificationPhones ?? '')
        .split(',')
        .map((p: string) => p.trim())
        .filter((p: string) => p.length > 8);

      if (notifyPhones.length > 0 && accessToken && phoneId) {
        const adminUrl = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
        const adminHeaders = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        };

        let staffBody = '';
        if (orderDraft && orderDraft.confirmado) {
            staffBody = `📦 *NUEVO PEDIDO CONFIRMADO*\nCliente: ${fromPhone}\n\n${botResponse.reply}`;
        } else {
            staffBody = `👤 *SOLICITUD ATENCIÓN*\nCliente: ${fromPhone}\nMsg: "${text}"`;
        }

        // Enviar a cada admin
        for (const adminPhone of notifyPhones) {
          await fetch(adminUrl, {
            method: 'POST',
            headers: adminHeaders,
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: adminPhone,
              type: 'text',
              text: { body: staffBody }
            })
          }).catch(e => console.error('Error enviando a admin:', e));
        }
      }
    } catch (err) {
      console.error('Error notificando staff:', err);
    }
  }

  // Registrar Log detallado
  try {
    const logCtx = { ...ctx, metadata: newMetadata, previousState };
    logConversationEvent(logCtx, botResponse).catch(console.error);
  } catch (e) { console.error(e); }

  // ----------------------------------------------------------------
  // 6. Enviar Respuesta al Usuario (WhatsApp Cloud API)
  // ----------------------------------------------------------------
  if (accessToken && phoneId) {
    try {
      const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      };

      // 1. Texto
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

      // 2. Imágenes (si hay)
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
    } catch (e) {
      console.error('❌ Error enviando a WhatsApp API:', e);
    }
  }

  return json({ ok: true });
};