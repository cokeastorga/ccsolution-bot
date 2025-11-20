<script lang="ts">
  export let label: string;
  export let value: string;
  export let helper: string = '';
  export let trend: 'up' | 'down' | 'flat' = 'flat';

  $: trendText =
    trend === 'up'
      ? 'En alza'
      : trend === 'down'
      ? 'A la baja'
      : 'Estable';

  $: trendIcon =
    trend === 'up'
      ? '▲'
      : trend === 'down'
      ? '▼'
      : '◆';

  $: trendClasses =
    trend === 'up'
      ? 'bg-emerald-50 text-emerald-600'
      : trend === 'down'
      ? 'bg-rose-50 text-rose-600'
      : 'bg-slate-50 text-slate-500';
</script>

<article
  class="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white/80 shadow-sm
         transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
>
  <!-- línea superior con gradiente tipo SaaS -->
  <div
    class="pointer-events-none absolute inset-x-0 top-0 h-0.5
           bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500
           opacity-0 group-hover:opacity-100 transition-opacity duration-300"
  />

  <div class="p-4 md:p-5 flex flex-col gap-3">
    <!-- título + tendencia -->
    <div class="flex items-start justify-between gap-2">
      <div>
        <p class="text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
      </div>

      <span
        class={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${trendClasses}`}
      >
        <span class="text-[10px] leading-none">{trendIcon}</span>
        <span>{trendText}</span>
      </span>
    </div>

    <!-- valor principal -->
    <div class="flex items-baseline gap-2">
      <p class="text-2xl md:text-3xl font-semibold text-slate-900 tabular-nums">
        {value}
      </p>
    </div>

    <!-- texto helper -->
    {#if helper}
      <p class="text-xs text-slate-500 leading-snug">
        {helper}
      </p>
    {/if}
  </div>

  <!-- glow suave al hacer hover -->
  <div
    class="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100
           bg-gradient-to-br from-indigo-50/40 via-transparent to-pink-50/40
           transition-opacity duration-300 mix-blend-normal"
  />
</article>
