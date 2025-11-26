import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { processMessage, type BotContext, type Channel } from '$lib/chatbot/engine';
import { logConversationEvent } from '$lib/chatbot/store';
import { getGlobalSettings } from '$lib/settings.server';

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

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body || !body.text) {
    return json({ error: 'Mensaje vacío' }, { status: 400 });
  }

  // Identificación
  const channel = (body.channel ?? 'web') as Channel;
  const userId = body.userId ?? 'anon';
  const text = String(body.text).trim();

  // ID único para web
  const conversationId = `web:${userId}`;

  // 1. Cargar configuración global (Evita los 'undefined' en horarios)
  let settings = { hours: {}, messages: {} };
  try {
    settings = await getGlobalSettings();
  } catch (e) {
    console.error('Error cargando settings:', e);
  }

  // 2. Cargar conversación desde Firestore
  const convRef = doc(db, 'conversations', conversationId);
  const snap = await getDoc(convRef);
  let convData: ConversationDoc;

  if (!snap.exists()) {
    convData = {
      state: null,
      metadata: {},
      history: [],
      channel,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(convRef, convData);
  } else {
    convData = snap.data() as ConversationDoc;
  }

  // ==================================================================================
  // 🔴 1. LÓGICA TIMEOUT (5 MINUTOS) - IGUAL QUE EN WHATSAPP
  // ==================================================================================
  const TIMEOUT_MS = 5 * 60 * 1000;
  const now = Date.now();
  
  // Obtener fecha último mensaje con seguridad
  const lastMsgTime = convData.lastMessageAt?.toMillis 
    ? convData.lastMessageAt.toMillis() 
    : (convData.updatedAt?.toMillis ? convData.updatedAt.toMillis() : now);

  let previousState = convData.state ?? null;
  let previousMetadata = convData.metadata ?? {};

  // Si pasó el tiempo límite, limpiamos la "memoria de atención"
  if (now - lastMsgTime > TIMEOUT_MS) {
    console.log(`⏱️ (Web) Sesión expirada para ${conversationId}. Reiniciando contexto.`);
    previousState = null;
    previousMetadata = {
      ...previousMetadata,
      orderDraft: null,       // Borramos pedido pendiente
      aiSlots: null,          // Borramos entendimiento IA anterior
      aiGeneratedReply: null
      // Mantenemos datos administrativos (settings, userId, etc.)
    };
  }
  // ==================================================================================

  const history = (convData.history ?? []).slice(-40);

  // 3. Construir Contexto para el Motor
  const ctx: BotContext = {
    conversationId,
    userId,
    channel,
    text,
    locale: 'es',
    previousState,
    metadata: {
      ...previousMetadata,
      history,
      settings // Pasamos los settings cargados al motor
    }
  };

  // 4. Procesar el Mensaje
  const response = await processMessage(ctx);

  // 5. Preparar actualización de Firestore
  const newHistory: HistoryItem[] = [
    ...history,
    { from: 'user', text, ts: Date.now() },
    { from: 'bot', text: response.reply, ts: Date.now() }
  ].slice(-40);

  const newMetadata = {
    ...previousMetadata,
    ...(response.meta ?? {})
  };

  // ==================================================================================
  // 🔴 2. LÓGICA LIMPIEZA POR FIN DE FLUJO (shouldClearMemory)
  // ==================================================================================
  let nextStateToSave = response.nextState ?? previousState ?? null;

  if (response.shouldClearMemory) {
    console.log(`🧹 (Web) Fin de flujo detectado (Adiós/Pedido OK/Info). Limpiando memoria.`);
    
    // Borramos datos temporales para que la próxima interacción sea fresca
    delete newMetadata.orderDraft;
    delete newMetadata.aiSlots;
    delete newMetadata.aiGeneratedReply;
    
    nextStateToSave = null;
  }
  // ==================================================================================

  await updateDoc(convRef, {
    state: nextStateToSave,
    metadata: newMetadata,
    history: newHistory,
    lastMessageAt: serverTimestamp(),
    lastMessageText: text,
    updatedAt: serverTimestamp(),
    needsHuman: response.needsHuman ?? false,
    status: response.needsHuman ? 'pending' : 'open'
  });

  // Guardar Logs
  try {
    const logCtx = { ...ctx, metadata: newMetadata, previousState };
    logConversationEvent(logCtx, response).catch(console.error);
  } catch (e) { console.error(e); }

  return json({
    reply: response.reply,
    media: response.media ?? [],
    intent: response.intent,
    needsHuman: response.needsHuman
  });
};