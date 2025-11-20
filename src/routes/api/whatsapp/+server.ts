// src/routes/api/whatsapp/+server.ts
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import {
  processMessage,
  type BotContext,
  type Channel
} from '$lib/chatbot/engine';
import { logConversationEvent } from '$lib/chatbot/store';
import { getGlobalSettings } from '$lib/settings';

// Estos valores deberían estar en variables de entorno en producción,
// pero también pueden venir desde settings si quieres.
const VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN || 'mi_token_seguro';

const ENV_ACCESS_TOKEN = process.env.WHATSAPP_TOKEN;
const ENV_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

/* --------------------------------------------- */
/*                    GET VERIFY                 */
/* --------------------------------------------- */
export const GET: RequestHandler = async ({ url }) => {
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    console.log('✅ WhatsApp webhook verificado correctamente.');
    return new Response(challenge, { status: 200 });
  }

  console.warn('❌ Verificación fallida (WhatsApp webhook).');
  return new Response('Forbidden', { status: 403 });
};

/* --------------------------------------------- */
/*                    POST EVENT                 */
/* --------------------------------------------- */
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body) {
    return json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  // WhatsApp usa un payload muy específico
  if (body.object !== 'whatsapp_business_account') {
    return json({ ok: true, skip: 'Not a WhatsApp event' });
  }

  const entry = body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const messages = value?.messages ?? [];

  if (!messages.length) {
    return json({ ok: true, skip: 'No messages in payload' });
  }

  const message = messages[0];

  // Solo manejamos texto por ahora
  if (message.type !== 'text') {
    console.log('ℹ️ Mensaje ignorado (no es texto):', message.type);
    return json({ ok: true, skip: 'Unsupported message type' });
  }

  const from: string = message.from; // número del usuario
  const text: string = message.text?.body ?? '';

  if (!text) {
    return json({ ok: true, skip: 'Empty text' });
  }

  const conversationId = from;
  const channel: Channel = 'whatsapp';

  /* --------------------------------------------- */
  /*          LEER CONFIGURACIÓN GLOBAL            */
  /* --------------------------------------------- */

  const settings = await getGlobalSettings();

const accessToken =
  settings.whatsapp?.accessToken || process.env.WHATSAPP_TOKEN;

const phoneId =
  settings.whatsapp?.phoneNumberId ||
  process.env.WHATSAPP_PHONE_NUMBER_ID;


  if (!phoneId || !accessToken) {
    console.error('❌ Falta Phone Number ID o Access Token.');
  }

  /* --------------------------------------------- */
  /*     CONSTRUIR CONTEXTO PARA EL ENGINE         */
  /* --------------------------------------------- */
  const ctx: BotContext = {
    conversationId,
    text,
    channel,
    userId: from,
    locale: 'es',
    previousState: null,
    metadata: {
      wa: {
        phone_number_id: phoneId
      },
      raw: body,
      settings
    }
  };

  /* --------------------------------------------- */
  /*   PASAR EL MENSAJE AL MOTOR DEL CHATBOT       */
  /* --------------------------------------------- */
  const botResponse = await processMessage(ctx);

  /* --------------------------------------------- */
  /*   LOG EN FIRESTORE (opcional pero recomendado)*/
  /* --------------------------------------------- */
  await logConversationEvent(ctx, botResponse, body);

  /* --------------------------------------------- */
  /*       ENVIAR RESPUESTA A WHATSAPP             */
  /* --------------------------------------------- */
  if (phoneId && accessToken) {
    try {
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
            to: from,
            type: 'text',
            text: {
              body: botResponse.reply
            }
          })
        }
      );

      if (!waRes.ok) {
        const err = await waRes.json().catch(() => ({}));
        console.error('❌ Error enviando mensaje a WhatsApp:', err);
      } else {
        console.log('✅ Mensaje enviado a WhatsApp');
      }
    } catch (e) {
      console.error('❌ Error en fetch a WhatsApp Cloud API:', e);
    }
  }

  return json({
    ok: true,
    handled: true,
    replyPreview: botResponse.reply
  });
};
