<script lang="ts">
  import { page } from '$app/stores';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: 'home'
    },
    {
      label: 'Conversaciones',
      href: '/conversaciones',
      icon: 'chat'
    },
    {
      label: 'Sand Box',
      href: '/sandbox/chat',
      icon: 'chat'
    },
    {
      label: 'Usuarios',
      href: '/usuarios',
      icon: 'users'
    },
    {
      label: 'Integración WhatsApp',
      href: '/integraciones',
      icon: 'whatsapp'
    },
    {
      label: 'Configuración',
      href: '/configuracion',
      icon: 'settings'
    }
  ];

  const isActive = (currentPath: string, href: string) => {
    if (href === '/dashboard') return currentPath === '/' || currentPath === '/dashboard';
    return currentPath.startsWith(href);
  };

  const handleLogout = () => {
    dispatch('logout');
  };
</script>

<aside
  class="flex h-full flex-col border-r border-slate-200 bg-slate-950 text-slate-50 
         shadow-[0_0_30px_rgba(15,23,42,0.6)]"
>
  <!-- Logo + nombre -->
  <div class="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-slate-800/60">
    <div
      class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br 
             from-indigo-500 via-violet-500 to-pink-500 shadow-lg shadow-indigo-500/30 text-white font-semibold"
    >
      CC
    </div>
    <div class="flex flex-col">
      <span class="text-sm font-semibold tracking-wide">
        CC Solution
      </span>
      <span class="text-[11px] text-slate-400">
        Panel del chatbot
      </span>
    </div>
  </div>

  <!-- Navegación principal -->
  <nav class="flex-1 overflow-y-auto px-3 pt-4 pb-4 space-y-1">
    {#each navItems as item}
      <a
        href={item.href}
        class={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm 
                transition-all duration-150 
                ${isActive($page.url.pathname, item.href)
                  ? 'bg-slate-800 text-slate-50 shadow-md shadow-slate-900/40'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-50'
                }`}
      >
        <!-- Iconos simples SVG -->
        {#if item.icon === 'home'}
          <span class="h-4 w-4 flex items-center justify-center">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M4 11L12 3L20 11" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M5 10.5V20H10V15H14V20H19V10.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        {:else if item.icon === 'chat'}
          <span class="h-4 w-4 flex items-center justify-center">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M5 5H19V14H8L5 17V5Z" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        {:else if item.icon === 'users'}
          <span class="h-4 w-4 flex items-center justify-center">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M16 21V19C16 17.8954 15.1046 17 14 17H6C4.89543 17 4 17.8954 4 19V21" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="10" cy="11" r="3" />
              <path d="M20 21V19C19.9992 18.1135 19.6144 17.269 18.939 16.673" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M17 11C17.7425 10.9994 18.4551 10.725 19 10.23" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        {:else if item.icon === 'whatsapp'}
          <span class="h-4 w-4 flex items-center justify-center">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
              <path
                d="M12.04 2C6.57 2 2.24 6.22 2.24 11.58C2.24 13.87 3.08 16.02 4.58 17.72L3.5 21.88L7.78 20.83C9.4 21.75 11.22 22.19 13.06 22.18H13.07C18.54 22.18 22.87 17.95 22.87 12.59C22.87 7.22 17.51 2 12.04 2ZM13.07 20.06C11.47 20.06 9.9 19.63 8.57 18.83L8.27 18.65L5.97 19.2L6.55 17.01L6.34 16.72C5.09 15.19 4.45 13.4 4.45 11.57C4.45 7.36 7.86 4.11 12.05 4.11C16.25 4.11 19.66 7.36 19.66 11.57C19.66 15.77 16.26 20.06 13.07 20.06ZM16.14 13.83C15.94 13.73 15.03 13.29 14.83 13.22C14.63 13.15 14.49 13.12 14.36 13.32C14.22 13.51 13.86 13.93 13.74 14.07C13.61 14.21 13.49 14.23 13.29 14.13C12.32 13.65 11.55 13.09 10.86 12.18C10.31 11.46 10.7 11.55 11.22 10.89C11.35 10.73 11.32 10.62 11.25 10.46C11.18 10.3 10.79 9.31 10.62 8.89C10.46 8.48 10.29 8.53 10.14 8.52C10.01 8.51 9.87 8.51 9.73 8.51C9.59 8.51 9.36 8.56 9.19 8.73C9.02 8.9 8.57 9.33 8.57 10.27C8.57 11.21 9.26 12.12 9.36 12.26C9.47 12.4 10.92 14.57 13.15 15.57C13.71 15.81 14.16 15.95 14.49 16.05C14.99 16.21 15.45 16.19 15.8 16.13C16.19 16.07 17 15.61 17.17 15.14C17.35 14.67 17.35 14.28 17.29 14.18C17.22 14.08 16.95 13.93 16.74 13.83H16.14Z"
              />
            </svg>
          </span>
        {:else if item.icon === 'settings'}
          <span class="h-4 w-4 flex items-center justify-center">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7">
              <path
                d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M19.4 15A1.65 1.65 0 0 0 20 13.8V10.2A1.65 1.65 0 0 0 19.4 9L17.55 7.8L17.1 6L14.9 5.25L13.7 3.4A1.65 1.65 0 0 0 12.5 2.8H11.5A1.65 1.65 0 0 0 10.3 3.4L9.1 5.25L6.9 6L6.45 7.8L4.6 9A1.65 1.65 0 0 0 4 10.2V13.8A1.65 1.65 0 0 0 4.6 15L6.45 16.2L6.9 18L9.1 18.75L10.3 20.6A1.65 1.65 0 0 0 11.5 21.2H12.5A1.65 1.65 0 0 0 13.7 20.6L14.9 18.75L17.1 18L17.55 16.2L19.4 15Z"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        {/if}

        <span class="truncate">
          {item.label}
        </span>
      </a>
    {/each}
  </nav>

  <!-- Zona inferior: estado / cerrar sesión -->
  <div class="border-t border-slate-800/60 px-4 py-3 space-y-2">
    <div class="flex items-center justify-between text-[11px] text-slate-400">
      <span class="inline-flex items-center gap-1">
<span class="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
        Online
      </span>
      <span class="text-slate-500">
        v0.1.0
      </span>
    </div>

    <button
      type="button"
      class="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/70 
             bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-200
             hover:bg-slate-800 hover:border-slate-500 transition-colors"
      on:click={handleLogout}
    >
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.6">
        <path d="M15 17L20 12L15 7" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M20 12H9" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M10 4H5C4.44772 4 4 4.44772 4 5V19C4 19.5523 4.44772 20 5 20H10" stroke-linecap="round" />
      </svg>
      <span>Cerrar sesión</span>
    </button>
  </div>
</aside>
