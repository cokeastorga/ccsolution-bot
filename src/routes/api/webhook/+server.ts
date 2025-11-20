// src/routes/api/whatsapp/+server.ts
import { getGlobalSettings } from '$lib/settings';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import {
  processMessage,
  type BotContext,
  type Channel
} from '$lib/chatbot/engine';
import { logConversationEvent } from '$lib/chatbot/store';

// Solo se usa para VERIFICACIÓN inicial del webhook
const VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN || 'mi_token_seguro';

// --------------------------------------------------
// GET: Verificación del webhook
// --------------------------------------------------
export const GET: RequestHandler = async ({ url }) => {
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    console.log('✅ WhatsApp webhook verificado.');
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
};

// --------------------------------------------------
// POST: Procesar mensajes entrantes
// --------------------------------------------------
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);
  console.log("📥 Webhook POST recibido:", body); 
  if (!body) return json({ ok: false, error: 'Invalid JSON' });

  if (body.object !== 'whatsapp_business_account') {
    return json({ ok: true, skip: 'Not a WhatsApp event' });
  }

  const entry = body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const messages = value?.messages ?? [];

  // Nada que procesar
  if (!messages.length) {
    return json({ ok: true, skip: 'No messages' });
  }

  const msg = messages[0];

  if (msg.type !== 'text') {
    console.log('ℹ️ Mensaje ignorado (no es texto):', msg.type);
    return json({ ok: true, skip: 'Unsupported type' });
  }

  const from = msg.from; // número del usuario
  const text = msg.text?.body ?? '';
  if (!text) return json({ ok: true, skip: 'Empty text' });
  // --------------------------------------------------
  // 📌 LEER CONFIG GLOBAL DESDE FIRESTORE (con fallback)
  // --------------------------------------------------
  let settings: any = { whatsapp: {} };

  try {
    settings = await getGlobalSettings();
  } catch (err) {
    console.error('❌ Error leyendo settings desde Firestore:', err);
    // NO lanzamos el error: dejamos que el bot siga con env
  }

  const accessToken =
    settings.whatsapp?.accessToken || process.env.WHATSAPP_TOKEN;

  const phoneId =
    settings.whatsapp?.phoneNumberId ||
    process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneId) {
    console.error('❌ Falta Access Token o Phone Number ID');
  }


  // --------------------------------------------------
  // Construir el contexto para el motor
  // --------------------------------------------------
  const ctx: BotContext = {
    conversationId: from,
    text,
    channel: 'whatsapp',
    userId: from,
    locale: 'es',
    previousState: null,
    metadata: {
      wa: {
        phone_number: value?.metadata?.display_phone_number,
        phone_number_id: phoneId
      },
      raw: body,
      settings
    }
  };

  // --------------------------------------------------
  // Pasarlo al motor del chatbot 🤖
  // --------------------------------------------------
  const botResponse = await processMessage(ctx);

  // --------------------------------------------------
  // Guardar logs en Firestore
  // --------------------------------------------------
  await logConversationEvent(ctx, botResponse, body);

    // --------------------------------------------------
  // Responder al usuario via WhatsApp Cloud API
  // --------------------------------------------------
  if (accessToken && phoneId) {
    try {
      // 1) Enviar el texto principal
      const textRes = await fetch(
        `https://graph.facebook.com/v20.0/${phoneId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: from,
            type: 'text',
            text: { body: botResponse.reply }
          })
        }
      );

      const textJson = await textRes.json().catch(() => ({}));
      if (!textRes.ok) {
        console.error('❌ Error enviando texto a WhatsApp:', textJson);
      } else {
        console.log('✅ Texto enviado a WhatsApp:', textJson);
      }

      // 2) Si el motor devolvió media, enviar imágenes
      if (botResponse.media?.length) {
        for (const m of botResponse.media) {
          if (m.type !== 'image') continue;

          console.log('📸 Enviando imagen a WhatsApp:', m.url);

          const imgRes = await fetch(
            `https://graph.facebook.com/v20.0/${phoneId}/messages`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: from,
                type: 'image',
                image: {
                  link: m.url,
                  caption: m.caption
                }
              })
            }
          );

          const imgJson = await imgRes.json().catch(() => ({}));
          if (!imgRes.ok) {
            console.error('❌ Error enviando imagen a WhatsApp:', imgJson);
          } else {
            console.log('✅ Imagen enviada a WhatsApp:', imgJson);
          }
        }
      }
    } catch (err) {
      console.error('❌ Error de red con WhatsApp Cloud API:', err);
    }
  }


  // --------------------------------------------------
  // Enviar OK a Meta rápidamente
  // --------------------------------------------------
  return json({ ok: true, handled: true });
};
