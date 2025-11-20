<script lang="ts">
  import { page } from '$app/stores';

  export let title: string | undefined;

  $: currentPath = $page.url.pathname;

  $: inferredTitle =
    currentPath.startsWith('/conversaciones')
      ? 'Conversaciones'
      : currentPath.startsWith('/usuarios')
      ? 'Usuarios'
      : currentPath.startsWith('/integraciones')
      ? 'Integración WhatsApp'
      : currentPath.startsWith('/configuracion')
      ? 'Configuración'
      : 'Dashboard';

  $: finalTitle = title && title.trim().length > 0 ? title : inferredTitle;
</script>

<header
  class="flex items-center justify-between gap-3 border-b border-slate-200 bg-white/80
         px-4 md:px-6 py-3 backdrop-blur"
>
  <!-- Título + breadcrumb/badge -->
  <div class="flex items-center gap-3 min-w-0">
    <div class="flex flex-col min-w-0">
      <div class="flex items-center gap-2">
        <h1 class="text-lg md:text-xl font-semibold text-slate-900 truncate">
          {finalTitle}
        </h1>
        <span
          class="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 
                 text-[11px] font-medium text-indigo-700 border border-indigo-100"
        >
          CC Solution · SaaS Bot
        </span>
      </div>
      <p class="mt-0.5 text-xs text-slate-500 hidden sm:block truncate">
        Administra tu chatbot, plantillas y conversaciones en tiempo real.
      </p>
    </div>
  </div>

  <!-- Search + acciones -->
  <div class="flex items-center gap-2 md:gap-3">
    <!-- Search -->
    <div class="hidden md:flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5
                text-xs text-slate-500 min-w-[220px] max-w-xs shadow-sm">
      <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 mr-2" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="6" />
        <path d="M16 16L20 20" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <input
        type="text"
        placeholder="Buscar usuario, conversación..."
        class="w-full bg-transparent outline-none placeholder:text-slate-300 text-[11px]"
      />
      <span
        class="ml-2 inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500"
      >
        Ctrl + K
      </span>
    </div>

    <!-- Botón notificaciones -->
    <button
      type="button"
      class="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 
             bg-white text-slate-500 hover:text-slate-900 hover:border-slate-300 
             shadow-sm transition-colors"
      aria-label="Notificaciones"
    >
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7">
        <path
          d="M14 19C14 20.1 13.1 21 12 21C10.9 21 10 20.1 10 19"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M18 15V11C18 8.23858 15.7614 6 13 6H11C8.23858 6 6 8.23858 6 11V15L5 17H19L18 15Z"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span
        class="absolute -top-0.5 -right-0.5 inline-flex h-3 w-3 items-center justify-center 
               rounded-full bg-rose-500 text-[8px] font-medium text-white"
      >
        3
      </span>
    </button>

    <!-- Avatar usuario -->
    <div
      class="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5
             shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
    >
      <div
        class="flex h-7 w-7 items-center justify-center rounded-full 
               bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 text-[11px] font-semibold text-white"
      >
        CA
      </div>
      <div class="hidden md:flex flex-col">
        <span class="text-[11px] font-medium text-slate-800 leading-tight">
          Coke Astorga
        </span>
        <span class="text-[10px] text-slate-400 leading-tight">
          admin@ccsolution.cl
        </span>
      </div>
      <svg viewBox="0 0 24 24" class="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M6 9L12 15L18 9" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
  </div>
</header>
