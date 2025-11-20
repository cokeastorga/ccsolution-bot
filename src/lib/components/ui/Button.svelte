<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let loading = false;
  export let disabled = false;
  export let type: 'button' | 'submit' = 'button';

  const base =
    'inline-flex items-center justify-center rounded-full font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 text-xs md:text-sm';

  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary: 'bg-slate-900 text-slate-100 hover:bg-slate-800 focus:ring-slate-500',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-300',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500'
  };

  const sizes = {
    sm: 'px-3 py-1.5',
    md: 'px-4 py-2',
    lg: 'px-5 py-2.5'
  };

  $: classes = `${base} ${variants[variant]} ${sizes[size]} ${
    (loading || disabled) ? 'opacity-70 cursor-not-allowed' : ''
  }`;
</script>

<button {type} class={classes} disabled={loading || disabled}>
  {#if loading}
    <span class="mr-2 h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
  {/if}
  <slot />
</button>
