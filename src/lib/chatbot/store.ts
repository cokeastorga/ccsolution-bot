// src/lib/chatbot/store.ts
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  addDoc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '$lib/firebase';
import type { BotContext, BotResponse, IntentId } from '$lib/chatbot/engine';

export type ConversationStatus = 'open' | 'pending' | 'closed';

export interface ConversationDoc {
  channel: 'whatsapp' | 'web';
  userId?: string | null;
  status: ConversationStatus;
  lastMessageAt?: unknown;
  lastMessageText?: string;
  lastIntentId?: IntentId | null;
  needsHuman?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface MessageDoc {
  from: 'user' | 'bot' | 'staff';
  direction: 'in' | 'out';
  text: string;
  intentId?: IntentId | null;
  confidence?: number | null;
  stateBefore?: string | null;
  stateAfter?: string | null;
  createdAt: unknown;
}

/**
 * Crea el documento de conversación si no existe.
 */
async function ensureConversationExists(ctx: BotContext): Promise<void> {
  const convRef = doc(db, 'conversations', ctx.conversationId);
  const snap = await getDoc(convRef);

  if (snap.exists()) return;

  const now = serverTimestamp();

  const initialDoc: ConversationDoc = {
    channel: ctx.channel,
    userId: ctx.userId ?? null,
    status: 'open',
    lastMessageAt: now,
    lastMessageText: ctx.text,
    lastIntentId: null,
    needsHuman: false,
    metadata: ctx.metadata ?? {},
    createdAt: now,
    updatedAt: now
  };

  await setDoc(convRef, initialDoc);
}

/**
 * Registra evento de conversación: entrada del usuario + respuesta del bot,
 * y actualiza el resumen de la conversación.
 */
export async function logConversationEvent(
  ctx: BotContext,
  response: BotResponse,
  rawPayload?: unknown
): Promise<void> {
  await ensureConversationExists(ctx);

  const convRef = doc(db, 'conversations', ctx.conversationId);
  const messagesRef = collection(convRef, 'messages');

  const stateBefore = ctx.previousState ?? null;
  const stateAfter = response.nextState ?? null;

  // 1. Mensaje del usuario
  await addDoc(messagesRef, {
    from: 'user',
    direction: 'in',
    text: ctx.text,
    intentId: null,
    confidence: null,
    stateBefore,
    stateAfter,
    createdAt: serverTimestamp()
  } as MessageDoc);

  // 2. Mensaje del bot
  await addDoc(messagesRef, {
    from: 'bot',
    direction: 'out',
    text: response.reply,
    intentId: response.intent.id,
    confidence: response.intent.confidence,
    stateBefore,
    stateAfter,
    createdAt: serverTimestamp()
  } as MessageDoc);

  // 3. Actualizar resumen de la conversación
  const status: ConversationStatus =
    stateAfter === 'ended'
      ? 'closed'
      : response.needsHuman
      ? 'pending'
      : 'open';

  const updateData: Partial<ConversationDoc> & {
    updatedAt: unknown;
    lastMessageAt: unknown;
    lastMessageText: string;
    lastIntentId: IntentId;
    needsHuman: boolean;
  } = {
    status,
    lastMessageAt: serverTimestamp(),
    lastMessageText: response.reply,
    lastIntentId: response.intent.id,
    needsHuman: response.needsHuman ?? false,
    updatedAt: serverTimestamp()
  };

  if (rawPayload) {
    updateData.metadata = {
      ...(ctx.metadata ?? {}),
      raw: rawPayload as unknown
    };
  }

  await updateDoc(convRef, updateData);
}
