<script lang="ts">
  import Sidebar from '$lib/components/Sidebar.svelte';
  import Topbar from '$lib/components/Topbar.svelte';

  import { auth } from '$lib/firebase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { onAuthStateChanged, signOut } from 'firebase/auth';

  let checking = true;

  // Logout centralizado: lo usa el Sidebar (evento logout)
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      goto('/login');
    }
  };

  onMount(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        goto('/login');
        return;
      }
      checking = false;
    });

    return unsubscribe;
  });
</script>

{#if checking}
  <!-- Pantalla de carga mientras validamos la sesión -->
  <div class="min-h-screen flex items-center justify-center bg-slate-50">
    <div class="flex flex-col items-center gap-3">
      <div class="h-10 w-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
      <p class="text-slate-500 text-sm">Cargando tu sesión...</p>
    </div>
  </div>
{:else}
  <!-- Layout principal -->
  <div class="min-h-screen bg-slate-50 flex">
    <!-- Sidebar fija (desktop) -->
    <div class="hidden md:flex md:w-64 lg:w-72">
      <Sidebar on:logout={handleLogout} />
    </div>

    <!-- Contenido principal -->
    <div class="flex-1 flex flex-col min-w-0">
      <Topbar />

      <main
        class="flex-1 px-4 py-4 md:px-8 md:py-8 overflow-y-auto"
      >
        <slot />
      </main>
    </div>
  </div>
{/if}
