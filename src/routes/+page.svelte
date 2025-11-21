<script lang="ts">
  let name = "CC Solution Chat Bot";
</script>

<section class="min-h-screen bg-slate-950 relative flex items-center justify-center px-4">

  <!-- Radial glow de fondo -->
  <div class="absolute inset-0 pointer-events-none">
    <div class="absolute -top-20 left-1/3 w-96 h-96 bg-indigo-600/20 blur-[160px] rounded-full"></div>
    <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 blur-[150px] rounded-full"></div>
  </div>

  <!-- Card principal -->
  <div
    class="relative max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800
           rounded-2xl px-8 py-10 shadow-[0_0_60px_-15px_rgba(0,0,0,0.6)]
           animate-fade-in-up"
  >

    <!-- Cabecera -->
    <div class="flex items-center gap-3 mb-6">
      <div class="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
        <span class="text-indigo-400 font-bold text-lg">CC</span>
      </div>
      <div>
        <p class="text-[11px] tracking-[0.2em] text-slate-400 uppercase">
          Panel de administración
        </p>
        <h1 class="text-lg font-semibold text-slate-200">{name}</h1>
      </div>
    </div>

    <!-- Título -->
    <h2 class="text-2xl font-bold text-white leading-tight mb-3">
      Centraliza tus conversaciones<br />
      en un solo lugar
    </h2>

    <!-- Descripción -->
    <p class="text-sm text-slate-300 mb-8 leading-relaxed">
      Gestiona conversaciones de WhatsApp y web, revisa pedidos, coordina la atención con tu equipo y controla el comportamiento del bot desde un panel moderno.
    </p>

    <!-- CTA -->
    <div class="flex flex-col gap-3">
      <a
        href="/login"
        data-sveltekit-preload-data="off"
        class="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-5 py-2.5 
               text-sm font-medium text-white shadow-lg shadow-indigo-500/30 
               hover:bg-indigo-400 active:scale-95 transition"
      >
        Iniciar sesión
      </a>

      <p class="text-xs text-slate-400">
        ¿No tienes acceso? Contacta al administrador de
        <span class="font-medium text-slate-200">CC Solution</span>.
      </p>
    </div>
  </div>

</section>

<style>
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(10px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .animate-fade-in-up {
    animation: fade-in-up 0.7s ease-out forwards;
  }
</style>
