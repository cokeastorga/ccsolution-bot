<script lang="ts">
  export let id: string;
  export let label = '';
  export let type = 'text';
  export let value: string | number | undefined;
  export let placeholder = '';
  export let error = '';
  export let required = false;
</script>

<div class="space-y-1">
  {#if label}
    <label for={id} class="text-xs font-medium text-slate-700">
      {label}
      {#if required}
        <span class="text-rose-500">*</span>
      {/if}
    </label>
  {/if}
  <input
    {id}
    {type}
    bind:value
    placeholder={placeholder}
    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
  />
  {#if error}
    <p class="text-[11px] text-rose-500">{error}</p>
  {/if}
</div>
