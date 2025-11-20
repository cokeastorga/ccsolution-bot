<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  import { db } from '$lib/firebase';
  import {
    collection,
    onSnapshot,
    query,
    orderBy,
    limit,
    type QuerySnapshot,
    type DocumentData
  } from 'firebase/firestore';

  type ConversationStatus = 'open' | 'pending' | 'closed';

  type Conversation = {
    id: string;
    channel: 'whatsapp' | 'web';
    userId?: string | null;
    status: ConversationStatus;
    lastMessageAt?: Date | null;
    lastMessageText?: string;
    lastIntentId?: string | null;
    needsHuman?: boolean;
  };

  let conversations: Conversation[] = [];
  let loading = true;

  let searchQuery = '';
  let statusFilter: 'all' | ConversationStatus = 'all';

  const statusLabel: Record<'all' | ConversationStatus, string> = {
    all: 'Todas',
    open: 'Abiertas',
    pending: 'Pendientes',
    closed: 'Cerradas'
  };

  const statusColor: Record<ConversationStatus, string> = {
    open: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    pending: 'bg-amber-50 text-amber-700 border-amber-100',
    closed: 'bg-slate-50 text-slate-600 border-slate-200'
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

  $: filteredConversations = conversations.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();

    const matchesSearch =
      q.length === 0 ||
      (c.lastMessageText ?? '').toLowerCase().includes(q) ||
      (c.lastIntentId ?? '').toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.userId ?? '').toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  onMount(() => {
    const convRef = collection(db, 'conversations');
    const qConv = query(convRef, orderBy('lastMessageAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(
      qConv,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const items: Conversation[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            channel: (data.channel ?? 'whatsapp') as 'whatsapp' | 'web',
            userId: data.userId ?? null,
            status: (data.status ?? 'open') as ConversationStatus,
            lastMessageAt: data.lastMessageAt?.toDate
              ? data.lastMessageAt.toDate()
              : null,
            lastMessageText: data.lastMessageText ?? '',
            lastIntentId: data.lastIntentId ?? null,
            needsHuman: data.needsHuman ?? false
          };
        });

        conversations = items;
        loading = false;
      },
      (error) => {
        console.error('Error escuchando conversaciones:', error);
        loading = false;
      }
    );

    return () => {
      unsubscribe();
    };
  });
</script>

<div class="space-y-6">
  <!-- Header -->


  <!-- Filtros y buscador -->
  <section class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex flex-wrap items-center gap-2">
      <div class="inline-flex rounded-full bg-slate-100 p-1 text-xs">
        {#each ['all', 'open', 'pending', 'closed'] as key}
          {@const k = key as 'all' | ConversationStatus}
          <button
            type="button"
            class={`px-3 py-1 rounded-full transition-all ${
              statusFilter === k
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            on:click={() => (statusFilter = k)}
          >
            {statusLabel[k]}
          </button>
        {/each}
      </div>
    </div>

    <div
      class="flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 min-w-[200px] max-w-sm"
    >
      <svg
        viewBox="0 0 24 24"
        class="h-3.5 w-3.5 mr-2"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <circle cx="11" cy="11" r="6"></circle>
        <path d="M16 16L20 20" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Buscar por texto, ID o intent..."
        class="w-full bg-transparent outline-none placeholder:text-slate-300 text-[11px]"
      />
    </div>
  </section>

  <!-- Lista / tabla -->
  <section
    class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
  >
    <!-- Header tabla desktop -->
    <div class="hidden md:grid grid-cols-[160px_minmax(0,1.4fr)_120px_130px_80px] gap-3 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-400 border-b border-slate-100">
      <div>Conversación</div>
      <div>Último mensaje</div>
      <div>Estado</div>
      <div>Última actividad</div>
      <div class="text-right">Acciones</div>
    </div>

    {#if loading}
      <div class="px-4 py-6 text-sm text-slate-500">
        Cargando conversaciones...
      </div>
    {:else if filteredConversations.length === 0}
      <div class="px-4 py-6 text-sm text-slate-500">
        No hay conversaciones que coincidan con los filtros seleccionados.
      </div>
    {:else}
      <ul class="divide-y divide-slate-100">
        {#each filteredConversations as c}
          <li
            class="px-4 py-3 md:py-2.5 hover:bg-slate-50/80 transition-colors text-sm md:text-[13px]"
          >
            <!-- Desktop row -->
            <div class="hidden md:grid grid-cols-[160px_minmax(0,1.4fr)_120px_130px_80px] gap-3 items-center">
              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                  <div
                    class="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white"
                  >
                    {c.userId ? c.userId.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div class="min-w-0">
                    <p class="font-medium text-slate-900 truncate">
                      {c.userId || 'Usuario desconocido'}
                    </p>
                    <p class="text-[11px] text-slate-400 truncate">
                      {c.id}
                    </p>
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-1">
                  <span
                    class={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${channelColor[c.channel]}`}
                  >
                    {c.channel === 'whatsapp' ? 'WhatsApp' : 'Web'}
                  </span>
                  {#if c.needsHuman}
                    <span
                      class="inline-flex items-center rounded-full bg-rose-50 border border-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700"
                    >
                      Necesita humano
                    </span>
                  {/if}
                </div>
              </div>

              <div class="min-w-0">
                <p class="text-slate-800 truncate">
                  {c.lastMessageText || 'Sin mensajes aún'}
                </p>
                {#if c.lastIntentId}
                  <p class="text-[11px] text-slate-400">
                    Intent: {c.lastIntentId}
                  </p>
                {/if}
              </div>

              <div>
                <span
                  class={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusColor[c.status]}`}
                >
                  {#if c.status === 'open'}
                    Activa
                  {:else if c.status === 'pending'}
                    Pendiente
                  {:else}
                    Cerrada
                  {/if}
                </span>
              </div>

              <div class="text-[11px] text-slate-500">
                {formatDate(c.lastMessageAt)}
              </div>

              <div class="flex justify-end gap-1.5">
                <button
  type="button"
  class="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-800"
  on:click={() => goto(`/conversaciones/${c.id}`)}
>
  Ver
</button>

                <button
                  type="button"
                  class="inline-flex items-center rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                >
                  Más
                </button>
              </div>
            </div>

            <!-- Mobile card -->
            <div class="flex flex-col gap-2 md:hidden">
              <div class="flex items-center gap-2">
                <div
                  class="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white"
                >
                  {c.userId ? c.userId.charAt(0).toUpperCase() : 'U'}
                </div>
                <div class="min-w-0">
                  <p class="font-medium text-slate-900 truncate">
                    {c.userId || 'Usuario desconocido'}
                  </p>
                  <p class="text-[11px] text-slate-400 truncate">
                    {c.id}
                  </p>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-1">
                <span
                  class={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${channelColor[c.channel]}`}
                >
                  {c.channel === 'whatsapp' ? 'WhatsApp' : 'Web'}
                </span>
                <span
                  class={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusColor[c.status]}`}
                >
                  {#if c.status === 'open'}
                    Activa
                  {:else if c.status === 'pending'}
                    Pendiente
                  {:else}
                    Cerrada
                  {/if}
                </span>
                {#if c.needsHuman}
                  <span
                    class="inline-flex items-center rounded-full bg-rose-50 border border-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700"
                  >
                    Necesita humano
                  </span>
                {/if}
              </div>

              <p class="text-[13px] text-slate-700">
                {c.lastMessageText || 'Sin mensajes aún'}
              </p>

              <div class="flex justify-between items-center text-[11px] text-slate-500">
                <span>{formatDate(c.lastMessageAt)}</span>
                <div class="flex gap-1.5">
                  <button
  type="button"
  class="inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-slate-800"
  on:click={() => goto(`/conversaciones/${c.id}`)}
>
  Ver
</button>

                  <button
                    type="button"
                    class="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Más
                  </button>
                </div>
          </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>
