<script lang="ts">
  export let open = false;
  export let title = '';
  export let onClose: () => void;
</script>

{#if open}
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
    <div class="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full mx-4 animate-[fadeIn_0.2s_ease-out]">
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 class="text-sm font-semibold text-slate-900">{title}</h3>
        <button
          class="text-slate-400 hover:text-slate-600 text-lg leading-none"
          on:click={onClose}
        >
          ×
        </button>
      </div>
      <div class="px-4 py-4">
        <slot />
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
</style>
