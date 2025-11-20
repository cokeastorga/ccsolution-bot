<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { db } from '$lib/firebase';
  import {
    doc,
    getDoc,
    collection,
    query,
    orderBy,
    onSnapshot,
    type QuerySnapshot,
    type DocumentData
  } from 'firebase/firestore';
  import { goto } from '$app/navigation';

  type ConversationStatus = 'open' | 'pending' | 'closed';

  type Conversation = {
    id: string;
    channel: 'whatsapp' | 'web';
    userId?: string | null;
    customerName?: string | null;
    status: ConversationStatus;
    lastMessageAt?: Date | null;
    lastIntentId?: string | null;
    needsHuman?: boolean;
  };

  type Message = {
    id: string;
    from: 'user' | 'bot' | 'staff';
    direction: 'in' | 'out';
    text: string;
    intentId?: string | null;
    confidence?: number | null;
    stateBefore?: string | null;
    stateAfter?: string | null;
    createdAt?: Date | null;
  };

  let convId: string;
  let conversation: Conversation | null = null;
  let messages: Message[] = [];
  let loadingConv = true;
  let loadingMessages = true;

  let replyText = '';
  let sendingReply = false;
  let actionLoading = false;
  let errorMsg: string | null = null;

  const statusColor: Record<ConversationStatus, string> = {
    open: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    pending: 'bg-amber-50 text-amber-700 border-amber-100',
    closed: 'bg-slate-50 text-slate-600 border-slate-200'
  };

  const channelLabel: Record<'whatsapp' | 'web', string> = {
    whatsapp: 'WhatsApp',
    web: 'Web'
  };

  const channelColor: Record<'whatsapp' | 'web', string> = {
    whatsapp: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    web: 'bg-indigo-50 text-indigo-700 border-indigo-100'
  };

  function formatDate(d?: Date | null): string {
    if (!d) return '—';
    return d.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  $: convId = $page.params.id;

  onMount(() => {
    if (!convId) return;

    const convRef = doc(db, 'conversations', convId);
    let unsubscribeMessages: (() => void) | null = null;

    (async () => {
      try {
        const convSnap = await getDoc(convRef);

        if (!convSnap.exists()) {
          loadingConv = false;
          goto('/conversaciones');
          return;
        }

        const data = convSnap.data();
        const meta = (data.metadata ?? {}) as Record<string, unknown>;

        conversation = {
          id: convSnap.id,
          channel: (data.channel ?? 'whatsapp') as 'whatsapp' | 'web',
          userId: data.userId ?? null,
          customerName: (meta.customerName as string) ?? null,
          status: (data.status ?? 'open') as ConversationStatus,
          lastMessageAt: data.lastMessageAt?.toDate ? data.lastMessageAt.toDate() : null,
          lastIntentId: data.lastIntentId ?? null,
          needsHuman: data.needsHuman ?? false
        };
        loadingConv = false;

        // Escuchar mensajes
        const messagesRef = collection(convRef, 'messages');
        const qMessages = query(messagesRef, orderBy('createdAt', 'asc'));

        unsubscribeMessages = onSnapshot(
          qMessages,
          (snapshot: QuerySnapshot<DocumentData>) => {
            const items: Message[] = snapshot.docs.map((docSnap) => {
              const d = docSnap.data();
              return {
                id: docSnap.id,
                from: (d.from ?? (d.direction === 'out' ? 'bot' : 'user')) as
                  | 'user'
                  | 'bot'
                  | 'staff',
                direction: (d.direction ?? 'in') as 'in' | 'out',
                text: d.text ?? '',
                intentId: d.intentId ?? null,
                confidence: d.confidence ?? null,
                stateBefore: d.stateBefore ?? null,
                stateAfter: d.stateAfter ?? null,
                createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : null
              };
            });

            messages = items;
            loadingMessages = false;
          },
          (error) => {
            console.error('Error escuchando mensajes:', error);
            loadingMessages = false;
          }
        );
      } catch (err) {
        console.error('Error cargando conversación:', err);
        loadingConv = false;
        loadingMessages = false;
      }
    })();

    return () => {
      if (unsubscribeMessages) unsubscribeMessages();
    };
  });

  async function sendManualReply() {
    if (!conversation || !replyText.trim() || sendingReply) return;
    errorMsg = null;
    sendingReply = true;

    try {
      const res = await fetch('/api/manual-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          text: replyText.trim()
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Error al enviar respuesta manual');
      }

      replyText = '';
    } catch (err) {
      console.error(err);
      errorMsg = err instanceof Error ? err.message : 'Error desconocido al enviar';
    } finally {
      sendingReply = false;
    }
  }

  async function updateStatus(partial: { status?: ConversationStatus; needsHuman?: boolean }) {
    if (!conversation || actionLoading) return;
    errorMsg = null;
    actionLoading = true;

    try {
      const res = await fetch('/api/conversations/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: conversation.id,
          ...partial
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Error actualizando estado');
      }

      // Optimistic UI
      conversation = {
        ...conversation,
        ...partial
      };
    } catch (err) {
      console.error(err);
      errorMsg = err instanceof Error ? err.message : 'Error actualizando estado';
    } finally {
      actionLoading = false;
    }
  }

  function handleReplyKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendManualReply();
    }
  }
</script>

<div class="flex flex-col h-full max-h-[calc(100vh-6rem)]">
  <!-- Header conversación -->
  <section class="mb-4 flex items-center justify-between gap-3">
    <div class="flex items-center gap-3 min-w-0">
      <button
        type="button"
        class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        on:click={() => goto('/conversaciones')}
        aria-label="Volver"
      >
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7">
          <path d="M15 18L9 12L15 6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <div class="flex flex-col min-w-0">
        <p class="text-xs text-slate-500">
          Conversación
        </p>
        <h2 class="text-lg md:text-xl font-semibold text-slate-900 truncate">
          {#if conversation?.customerName}
            {conversation.customerName}
          {:else if conversation?.userId}
            {conversation.userId}
          {:else}
            Usuario desconocido
          {/if}
        </h2>
        <p class="text-[11px] text-slate-400 truncate">
          ID: {convId}
        </p>
      </div>
    </div>

    {#if conversation}
      <div class="flex flex-col items-end gap-1">
        <div class="flex flex-wrap items-center gap-1.5 justify-end">
          <span
            class={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${channelColor[conversation.channel]}`}
          >
            {channelLabel[conversation.channel]}
          </span>
          <span
            class={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusColor[conversation.status]}`}
          >
            {#if conversation.status === 'open'}
              Activa
            {:else if conversation.status === 'pending'}
              Pendiente
            {:else}
              Cerrada
            {/if}
          </span>
          {#if conversation.needsHuman}
            <span
              class="inline-flex items-center rounded-full bg-rose-50 border border-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700"
            >
              Necesita humano
            </span>
          {/if}
        </div>
        <p class="text-[11px] text-slate-400">
          Última actividad: {formatDate(conversation.lastMessageAt)}
        </p>

        <!-- Quick actions -->
        <div class="mt-1 flex flex-wrap gap-1.5 justify-end">
          <button
            type="button"
            class="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={actionLoading || conversation.status === 'open'}
            on:click={() => updateStatus({ status: 'open', needsHuman: false })}
          >
            Reabrir
          </button>
          <button
            type="button"
            class="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700 hover:bg-amber-100 disabled:opacity-50"
            disabled={actionLoading || conversation.status === 'pending'}
            on:click={() => updateStatus({ status: 'pending', needsHuman: true })}
          >
            Marcar pendiente
          </button>
          <button
            type="button"
            class="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700 hover:bg-slate-200 disabled:opacity-50"
            disabled={actionLoading || conversation.status === 'closed'}
            on:click={() => updateStatus({ status: 'closed', needsHuman: false })}
          >
            Cerrar
          </button>
        </div>
      </div>
    {/if}
  </section>

  <!-- Contenedor mensajes -->
  <section class="flex-1 min-h-0 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden">
    <!-- Header interno -->
    <div class="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
      <p class="text-xs font-medium text-slate-600">
        Historial de mensajes
      </p>
      {#if conversation?.lastIntentId}
        <p class="text-[11px] text-slate-400">
          Último intent: <span class="font-mono">{conversation.lastIntentId}</span>
        </p>
      {/if}
    </div>

    <!-- Lista de mensajes -->
    <div class="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      {#if loadingMessages}
        <p class="text-sm text-slate-500">
          Cargando mensajes...
        </p>
      {:else if messages.length === 0}
        <p class="text-sm text-slate-500">
          Aún no hay mensajes registrados en esta conversación.
        </p>
      {:else}
        {#each messages as m}
          <div
            class={`flex ${m.from === 'user' ? 'justify-start' : 'justify-end'}`}
          >
            <div
              class={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                m.from === 'user'
                  ? 'bg-slate-100 text-slate-900 rounded-bl-sm'
                  : m.from === 'staff'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-slate-900 text-slate-50 rounded-br-sm'
              }`}
            >
              <p class="whitespace-pre-wrap break-words">
                {m.text}
              </p>

              <div class="mt-1 flex items-center justify-between gap-2 text-[10px] opacity-75">
                <span>
                  {#if m.from === 'user'}
                    Usuario
                  {:else if m.from === 'staff'}
                    Staff
                  {:else}
                    Bot
                  {/if}
                  {#if m.intentId}
                    • {m.intentId}
                  {/if}
                </span>
                {#if m.createdAt}
                  <span>
                    {m.createdAt.toLocaleTimeString('es-CL', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                {/if}
              </div>

              {#if m.stateBefore || m.stateAfter}
                <div class="mt-1 text-[9px] text-slate-200 flex gap-1" class:bg-slate-900={m.from === 'bot'}>
                  <span>estado:</span>
                  <span class="font-mono">
                    {m.stateBefore ?? '∅'} → {m.stateAfter ?? '∅'}
                  </span>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Error -->
    {#if errorMsg}
      <div class="border-t border-rose-100 bg-rose-50 px-4 py-2 text-[11px] text-rose-700">
        {errorMsg}
      </div>
    {/if}

    <!-- Input respuesta manual -->
    <div class="border-t border-slate-100 bg-slate-50 px-3 py-2">
      <form
        class="flex items-end gap-2"
        on:submit|preventDefault={sendManualReply}
      >
        <textarea
          bind:value={replyText}
          rows="1"
          on:keydown={handleReplyKeydown}
          placeholder={conversation?.status === 'closed'
            ? 'La conversación está cerrada. Reábrela para responder.'
            : 'Escribe una respuesta manual para el cliente...'}
          class="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800
                 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/60 disabled:bg-slate-100"
          disabled={conversation?.status === 'closed' || sendingReply}
        />
        <button
          type="submit"
          disabled={
            sendingReply ||
            !replyText.trim() ||
            !conversation ||
            conversation.status === 'closed'
          }
          class="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-slate-50
                 shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {#if sendingReply}
            <span class="text-[11px] animate-pulse">Enviando...</span>
          {:else}
            <span>Responder</span>
            <span>➤</span>
          {/if}
        </button>
      </form>
    </div>
  </section>
</div>
