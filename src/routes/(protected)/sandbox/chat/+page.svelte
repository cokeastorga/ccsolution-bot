<script lang="ts">
  import { onMount } from 'svelte';

  type Message = {
    from: 'user' | 'bot';
    text: string;
    ts: Date;
  };

  let conversationId = 'demo-user-1'; // puedes cambiarlo, simula el número de teléfono
  let input = '';
  let sending = false;
  let error: string | null = null;
  let messages: Message[] = [];

  // Opcional: para ver qué está haciendo el motor (debug)
  let lastIntent: string | null = null;
  let lastState: string | null = null;
  let lastNeedsHuman = false;

  onMount(() => {
    messages = [
      {
        from: 'bot',
        text: '👋 Bienvenido al sandbox del bot. Escribe un mensaje para probar el flujo completo.',
        ts: new Date()
      }
    ];
  });

  async function sendMessage() {
    if (!input.trim() || sending) return;

    const text = input.trim();
    input = '';
    error = null;
    sending = true;

    // Mensaje del usuario
    messages = [...messages, { from: 'user', text, ts: new Date() }];

    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          conversationId,
          channel: 'web',
          locale: 'es',
          previousState: lastState // así probamos el flujo con estado
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Error al llamar al webhook');
      }

      const data = await res.json();

      if (data.reply) {
        messages = [
          ...messages,
          {
            from: 'bot',
            text: data.reply as string,
            ts: new Date()
          }
        ];
      }

      // Debug: mostramos qué decidió el motor
      lastIntent = data.intent?.id ?? null;
      lastState = data.nextState ?? null;
      lastNeedsHuman = Boolean(data.needsHuman);
      console.log('Sandbox bot debug →', data);
    } catch (e: unknown) {
      console.error(e);
      error = e instanceof Error ? e.message : 'Error desconocido';
    } finally {
      sending = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }
</script>

<svelte:head>
  <title>Sandbox Bot • CC Solution</title>
</svelte:head>

<div class="flex flex-col gap-4">
  <!-- Header -->
  <div class="flex items-center justify-between gap-3">
    <div>
      <h1 class="text-lg font-semibold text-slate-900">Sandbox del Chatbot</h1>
      <p class="text-xs text-slate-500">
        Esta vista te permite probar el motor del bot y el webhook sin depender de WhatsApp.
      </p>
      {#if lastIntent}
        <p class="mt-1 text-[10px] text-slate-400">
          Intento detectado: <span class="font-mono">{lastIntent}</span> •
          Estado: <span class="font-mono">{lastState ?? 'idle'}</span> •
          Handoff: {lastNeedsHuman ? 'sí' : 'no'}
        </p>
      {/if}
    </div>

    <div class="flex items-center gap-2 text-xs">
      <label class="text-slate-500">ID de conversación:</label>
      <input
        bind:value={conversationId}
        class="w-40 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 outline-none
               focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/60"
      />
    </div>
  </div>

  <!-- Área de chat -->
  <div
    class="flex h-[450px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
  >
    <!-- Mensajes -->
    <div class="flex-1 space-y-2 overflow-y-auto px-4 py-3">
      {#each messages as m}
        <div class={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            class={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm
              ${
                m.from === 'user'
                  ? 'rounded-br-sm bg-indigo-600 text-white'
                  : 'rounded-bl-sm bg-slate-100 text-slate-800'
              }`}
          >
            <div class="whitespace-pre-line">{m.text}</div>
            <div
              class={`mt-1 text-[9px] ${
                m.from === 'user' ? 'text-indigo-100/80' : 'text-slate-400'
              }`}
            >
              {m.ts.toLocaleTimeString()}
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Error -->
    {#if error}
      <div class="border-t border-rose-100 bg-rose-50 px-4 py-2 text-[11px] text-rose-700">
        {error}
      </div>
    {/if}

    <!-- Input -->
    <div class="border-t border-slate-200 bg-slate-50 px-3 py-2">
      <form
        class="flex items-end gap-2"
        on:submit|preventDefault={sendMessage}
      >
        <textarea
          bind:value={input}
          rows="1"
          on:keydown={handleKeydown}
          placeholder="Escribe un mensaje para el bot..."
          class="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800
                 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/60"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          class="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-slate-50
                 shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {#if sending}
            <span class="text-[11px] animate-pulse">Enviando...</span>
          {:else}
            <span>Enviar</span>
            <span>➤</span>
          {/if}
        </button>
      </form>
    </div>
  </div>

  <p class="text-[11px] text-slate-400">
    Cada mensaje que envías pasa por <code>/api/webhook</code>, el motor del bot y se guarda en
    <code>conversations/{'{conversationId}'}/messages</code> en Firestore.
  </p>
</div>
