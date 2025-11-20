<script lang="ts">
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

  const stats: StatCardData[] = [
    {
      label: 'Conversaciones de hoy',
      value: '32',
      helper: '+8 vs ayer',
      trend: 'up'
    },
    {
      label: 'Usuarios activos',
      value: '14',
      helper: 'En las últimas 2 horas',
      trend: 'flat'
    },
    {
      label: 'Mensajes automáticos enviados',
      value: '87',
      helper: 'Plantillas y respuestas rápidas',
      trend: 'up'
    },
    {
      label: 'Pedidos recibidos',
      value: '5',
      helper: 'A través del chatbot',
      trend: 'down'
    }
  ];

  const conversations: ConversationRow[] = [
    {
      id: 'C-2301',
      userName: 'Juan Pérez',
      channel: 'WhatsApp',
      intent: 'Pedido de kuchen',
      status: 'open',
      updatedAt: 'Hoy · 02:03',
      messages: 14,
      hasUnread: true
    },
    {
      id: 'C-2298',
      userName: 'María López',
      channel: 'Web',
      intent: 'Consulta de horarios',
      status: 'closed',
      updatedAt: 'Hoy · 01:34',
      messages: 6,
      hasUnread: false
    },
    {
      id: 'C-2291',
      userName: 'Cliente nuevo',
      channel: 'WhatsApp',
      intent: 'Menú del día',
      status: 'pending',
      updatedAt: 'Ayer · 23:51',
      messages: 3,
      hasUnread: true
    },
    {
      id: 'C-2285',
      userName: 'Carlos Díaz',
      channel: 'Web',
      intent: 'Hablar con humano',
      status: 'open',
      updatedAt: 'Ayer · 22:17',
      messages: 11,
      hasUnread: false
    }
  ];

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

  $: filteredConversations = conversations.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      c.userName.toLowerCase().includes(query) ||
      c.intent.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });
</script>

<div class="space-y-8">
  <!-- Header del dashboard -->
  <section class="space-y-2">
    <h2 class="text-xl md:text-2xl font-semibold text-slate-900">
      Resumen de hoy
    </h2>
    <p class="text-sm text-slate-500">
      Visualiza de un vistazo la actividad de tu chatbot y las conversaciones más recientes.
    </p>
  </section>

  <!-- Cards de estadísticas -->
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

  <!-- Conversaciones recientes -->
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
        <!-- Filtro de estado -->
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

        <!-- Buscador -->
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

    <!-- Tabla / lista -->
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

      {#if filteredConversations.length === 0}
        <div class="px-4 py-6 text-sm text-slate-500">
          No se encontraron conversaciones con esos filtros.
        </div>
      {:else}
        <ul class="divide-y divide-slate-100">
          {#each filteredConversations as c}
            <li
              class="px-4 py-3 md:py-2.5 hover:bg-slate-50/80 transition-colors text-sm md:text-[13px]"
            >
              <!-- Vista desktop: fila tipo tabla -->
              <div class="hidden md:grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_110px_120px_90px] gap-3 items-center">
                <!-- Cliente -->
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
                        <span class="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 ml-1"></span>
                      {/if}
                    </p>
                  </div>
                </div>

                <!-- Intención -->
                <div class="min-w-0">
                  <p class="text-slate-800 truncate">{c.intent}</p>
                  <p class="text-[11px] text-slate-400">Router: Detectado</p>
                </div>

                <!-- Estado -->
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

                <!-- Última actualización -->
                <div class="text-[11px] text-slate-500">
                  {c.updatedAt}
                  <div class="text-[10px] text-slate-400">
                    {c.messages} mensajes
                  </div>
                </div>

                <!-- Acciones -->
                <div class="flex justify-end gap-1.5">
                  <button
                    type="button"
                    class="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-800"
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

              <!-- Vista mobile: tarjeta -->
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
                  <button
                    type="button"
                    class="inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-slate-800"
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
    </div>
  </section>
</div>
