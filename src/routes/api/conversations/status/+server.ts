// src/routes/api/conversations/status/+server.ts
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { ConversationStatus } from '$lib/chatbot/store';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body) {
    return json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { id, status, needsHuman } = body as {
    id?: string;
    status?: ConversationStatus;
    needsHuman?: boolean;
  };

  if (!id) {
    return json(
      { ok: false, error: 'id de conversación es requerido' },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {
    updatedAt: serverTimestamp()
  };

  if (status) updateData.status = status;
  if (typeof needsHuman === 'boolean') updateData.needsHuman = needsHuman;

  try {
    const convRef = doc(db, 'conversations', id);
    await updateDoc(convRef, updateData);

    return json({ ok: true });
  } catch (err) {
    console.error('❌ Error actualizando estado de conversación:', err);
    return json(
      { ok: false, error: 'Error actualizando conversación' },
      { status: 500 }
    );
  }
};
