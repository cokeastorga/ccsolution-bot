<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '$lib/firebase';
  import { 
    collection, 
    query, 
    orderBy, 
    limit, 
    onSnapshot, 
    Timestamp 
  } from 'firebase/firestore';
  import StatCard from '$lib/components/StatCard.svelte';

  type Trend = 'up' | 'down' | 'flat';

  type StatCardData = {
    label: string;
    value: string;
    helper?: string;
    trend?: Trend;
  };

  type ConversationStatus = 'open' | 'pending' | 'closed';

  type ConversationRow = {
    id: string;
    userName: string;
    channel: 'WhatsApp' | 'Web';
    intent: string;
    status: ConversationStatus;
    updatedAt: string;
    messages: number;
    hasUnread: boolean;
  };

  // Estado local
  let conversations: ConversationRow[] = [];
  let loading = true;
  let searchQuery = '';
  let statusFilter: 'all' | ConversationStatus = 'all';

  // Estadísticas iniciales (se actualizarán con los datos reales)
  let stats: StatCardData[] = [
    { label: 'Conversaciones de hoy', value: '-', helper: 'Cargando...', trend: 'flat' },
    { label: 'Requieren humano', value: '-', helper: 'Pendientes de atención', trend: 'flat' },
    { label: 'Pedidos detectados', value: '-', helper: 'Intención de compra', trend: 'flat' },
    { label: 'Total visualizado', value: '-', helper: 'Últimos registros', trend: 'flat' }
  ];

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

  // Helper para formatear fechas de Firestore
  function formatDate(timestamp: any): string {
    if (!timestamp?.toDate) return '—';
    const date = timestamp.toDate();
    const now = new Date();
    
    // Verificar si es hoy
    const isToday = date.getDate() === now.getDate() && 
                    date.getMonth() === now.getMonth() && 
                    date.getFullYear() === now.getFullYear();
    
    const timeStr = date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Hoy · ${timeStr}`;
    
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }) + ' · ' + timeStr;
  }

  onMount(() => {
    // Consultamos las últimas 50 conversaciones ordenadas por fecha
    const q = query(
      collection(db, 'conversations'),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // 1. Mapear datos para la tabla
      conversations = docs.map((d: any) => ({
        id: d.id,
        userName: d.userId || 'Usuario Web',
        channel: d.channel === 'whatsapp' ? 'WhatsApp' : 'Web',
        intent: d.lastIntentId || 'Sin intención',
        status: (d.status as ConversationStatus) || 'open',
        updatedAt: formatDate(d.updatedAt),
        messages: Array.isArray(d.history) ? d.history.length : 0,
        hasUnread: d.needsHuman // Usamos "needsHuman" como indicador visual de atención
      }));

      // 2. Calcular estadísticas en tiempo real sobre estos datos
      const now = new Date();
      const startOfDay = new Date(now.setHours(0,0,0,0));

      const todayCount = docs.filter((d: any) => d.updatedAt?.toDate() >= startOfDay).length;
      const pendingCount = docs.filter((d: any) => d.needsHuman).length;
      const ordersCount = docs.filter((d: any) => d.lastIntentId === 'order_start').length;

      stats = [
        {
          label: 'Conversaciones de hoy',
          value: todayCount.toString(),
          helper: 'Últimas 24 hrs',
          trend: 'up'
        },
        {
          label: 'Requieren humano',
          value: pendingCount.toString(),
          helper: 'Solicitudes o pedidos por confirmar',
          // Usamos 'down' (color rojo) para alertar si hay pendientes, o 'flat' si es 0
          trend: pendingCount > 0 ? 'down' : 'flat'
        },
        {
          label: 'Pedidos detectados',
          value: ordersCount.toString(),
          helper: 'En esta lista reciente',
          trend: 'up'
        },
        {
          label: 'Conversaciones activas',
          value: docs.filter((d: any) => d.status === 'open').length.toString(),
          helper: 'Estado "Abierto"',
          trend: 'flat'
        }
      ];

      loading = false;
    }, (error) => {
      console.error("Error cargando dashboard:", error);
      loading = false;
    });

    return () => unsubscribe();
  });

  // Filtro reactivo para la tabla
  $: filteredConversations = conversations.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      q.length === 0 ||
      c.userName.toLowerCase().includes(q) ||
      c.intent.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });
</script>

<div class="space-y-8">
  <section class="space-y-2">
    <h2 class="text-xl md:text-2xl font-semibold text-slate-900">
      Resumen en tiempo real
    </h2>
    <p class="text-sm text-slate-500">
      Visualiza de un vistazo la actividad de tu chatbot y las conversaciones más recientes.
    </p>
  </section>

  <section class="grid gap-4 md:gap-6 sm:grid-cols-2 xl:grid-cols-4">
    {#each stats as s}
      <StatCard
        label={s.label}
        value={s.value}
        helper={s.helper ?? ''}
        trend={s.trend ?? 'flat'}
      />
    {/each}
  </section>

  <section class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 class="text-base md:text-lg font-semibold text-slate-900">
          Conversaciones recientes
        </h3>
        <p class="text-xs md:text-sm text-slate-500">
          Gestiona rápidamente las conversaciones activas, pendientes y cerradas.
        </p>
      </div>

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

        <div
          class="flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 min-w-[180px]"
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
            placeholder="Buscar por cliente, intención o ID..."
            class="w-full bg-transparent outline-none placeholder:text-slate-300 text-[11px]"
          />
        </div>
      </div>
    </div>

    <div
      class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div class="hidden md:grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_110px_120px_90px] gap-3 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-400 border-b border-slate-100">
        <div>Cliente</div>
        <div>Intención</div>
        <div>Estado</div>
        <div>Última actualización</div>
        <div class="text-right">Acciones</div>
      </div>

      {#if loading}
        <div class="px-4 py-6 text-sm text-slate-500 text-center">
          Cargando datos en tiempo real...
        </div>
      {:else if filteredConversations.length === 0}
        <div class="px-4 py-6 text-sm text-slate-500 text-center">
          No se encontraron conversaciones con esos filtros.
        </div>
      {:else}
        <ul class="divide-y divide-slate-100">
          {#each filteredConversations as c}
            <li
              class="px-4 py-3 md:py-2.5 hover:bg-slate-50/80 transition-colors text-sm md:text-[13px]"
            >
              <div class="hidden md:grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_110px_120px_90px] gap-3 items-center">
                <div class="flex items-center gap-2 min-w-0">
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
                  >
                    {c.userName.charAt(0).toUpperCase()}
                  </div>
                  <div class="min-w-0">
                    <p class="font-medium text-slate-900 truncate">
                      {c.userName}
                    </p>
                    <p class="text-[11px] text-slate-400 flex items-center gap-1">
                      <span
                        class="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                      >
                        {c.channel}
                      </span>
                      <span>· {c.id}</span>
                      {#if c.hasUnread}
                        <span class="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 ml-1" title="Requiere atención"></span>
                      {/if}
                    </p>
                  </div>
                </div>

                <div class="min-w-0">
                  <p class="text-slate-800 truncate">{c.intent}</p>
                  <p class="text-[11px] text-slate-400">Detectado por IA</p>
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
                  {c.updatedAt}
                  <div class="text-[10px] text-slate-400">
                    {c.messages} mensajes
                  </div>
                </div>

                <div class="flex justify-end gap-1.5">
                  <a
                    href={`/conversaciones/${c.id}`}
                    class="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-800"
                  >
                    Ver
                  </a>
                </div>
              </div>

              <div class="flex flex-col gap-2 md:hidden">
                <div class="flex items-center gap-2">
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
                  >
                    {c.userName.charAt(0).toUpperCase()}
                  </div>
                  <div class="min-w-0">
                    <p class="font-medium text-slate-900 truncate">
                      {c.userName}
                    </p>
                    <p class="text-[11px] text-slate-400">
                      {c.channel} · {c.id}
                    </p>
                  </div>
                  {#if c.hasUnread}
                    <span class="ml-auto inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  {/if}
                </div>

                <div class="flex flex-wrap items-center gap-2">
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
                  <span class="text-[11px] text-slate-500">
                    {c.updatedAt} · {c.messages} mensajes
                  </span>
                </div>

                <p class="text-[13px] text-slate-700">
                  {c.intent}
                </p>

                <div class="flex justify-end gap-1.5">
                  <a
                    href={`/conversaciones/${c.id}`}
                    class="inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-slate-800"
                  >
                    Ver
                  </a>
                </div>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </section>
</div>