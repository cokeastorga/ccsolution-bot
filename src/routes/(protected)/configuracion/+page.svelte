<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '$lib/firebase';
  import { doc, getDoc, setDoc } from 'firebase/firestore';
  import {
    defaultSettings,
    type Settings
  } from '$lib/settings';

  let loading = true;
  let saving = false;
  let error: string | null = null;
  let success = false;

  type TabId = 'general' | 'whatsapp' | 'hours' | 'messages' | 'advanced';
  let activeTab: TabId = 'general';

  const docRef = doc(db, 'settings', 'global');

  onMount(async () => {
    loading = true;
    error = null;
    success = false;

    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as Partial<Settings>;
        settings = {
          ...defaultSettings,
          ...data,
          whatsapp: {
            ...defaultSettings.whatsapp,
            ...(data.whatsapp ?? {})
          },
          hours: {
            ...defaultSettings.hours,
            ...(data.hours ?? {})
          },
          messages: {
            ...defaultSettings.messages,
            ...(data.messages ?? {})
          },
          orders: {
            ...defaultSettings.orders,
            ...(data.orders ?? {})
          },
          api: {
            ...defaultSettings.api,
            ...(data.api ?? {})
          }
        };
      } else {
        // Si no existe el doc, guardamos los defaults la primera vez
        await setDoc(docRef, settings);
      }
    } catch (e: unknown) {
      console.error(e);
      error =
        e instanceof Error ? e.message : 'Error al cargar la configuración.';
    } finally {
      loading = false;
    }
  });

  async function saveSettings() {
    saving = true;
    error = null;
    success = false;

    try {
      await setDoc(docRef, settings, { merge: true });
      success = true;
    } catch (e: unknown) {
      console.error(e);
      error =
        e instanceof Error ? e.message : 'Error al guardar la configuración.';
    } finally {
      saving = false;
      // Ocultar el mensaje de éxito después de un rato
      setTimeout(() => {
        success = false;
      }, 2500);
    }
  }

  const tabs: { id: TabId; label: string; desc: string }[] = [
    { id: 'general', label: 'General', desc: 'Nombre y canal por defecto.' },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      desc: 'Tokens y números conectados.'
    },
    {
      id: 'hours',
      label: 'Horarios',
      desc: 'Configuración de horarios de atención.'
    },
    {
      id: 'messages',
      label: 'Mensajes',
      desc: 'Textos base del bot.'
    },
    {
      id: 'advanced',
      label: 'Avanzado',
      desc: 'Webhooks y notificaciones técnicas.'
    }
  ];
</script>

<svelte:head>
  <title>Configuración • CC Solution</title>
</svelte:head>

<div class="flex flex-col gap-4">
  <!-- Header -->
  <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
    <div>
      <h1 class="text-lg font-semibold text-slate-900">Configuración del Bot</h1>
      <p class="text-xs text-slate-500">
        Administra los ajustes globales: tokens, horarios, mensajes y opciones de pedidos.
      </p>
    </div>

    <div class="flex items-center gap-2">
      {#if success}
        <span class="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
          ✅ Cambios guardados
        </span>
      {/if}
      {#if error}
        <span class="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-medium text-rose-700">
          ⚠️ {error}
        </span>
      {/if}
      <button
        on:click={saveSettings}
        disabled={saving || loading}
        class="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-slate-50
               shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {#if saving}
          <span class="animate-pulse">Guardando…</span>
        {:else}
          <span>Guardar cambios</span>
        {/if}
      </button>
    </div>
  </div>

  <!-- Tabs -->
  <div class="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 text-[11px]">
    {#each tabs as tab}
      <button
        type="button"
        on:click={() => (activeTab = tab.id)}
        class={`flex-1 rounded-xl px-3 py-2 text-left transition
          ${
            activeTab === tab.id
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:bg-white/60'
          }`}
      >
        <div class="font-medium">{tab.label}</div>
        <div class="text-[10px] text-slate-400">{tab.desc}</div>
      </button>
    {/each}
  </div>

  <!-- Contenido -->
  <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    {#if loading}
      <div class="p-6 text-xs text-slate-500">Cargando configuración…</div>
    {:else}
      <!-- GENERAL -->
      {#if activeTab === 'general'}
        <div class="grid gap-6 p-6 md:grid-cols-2">
          <div class="space-y-3">
            <h2 class="text-sm font-semibold text-slate-900">Datos generales</h2>
            <p class="text-xs text-slate-500">
              Estos datos se usan en los mensajes automáticos y en el panel.
            </p>
            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-700">Nombre del negocio</label>
              <input
                bind:value={settings.businessName}
                class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800
                       outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/60"
              />
            </div>

            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-700">Canal por defecto</label>
              <select
                bind:value={settings.defaultChannel}
                class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800
                       outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/60"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="web">Webchat</option>
              </select>
            </div>
          </div>

          <div class="space-y-3">
            <h2 class="text-sm font-semibold text-slate-900">Pedidos</h2>
            <p class="text-xs text-slate-500">
              Define si el bot puede tomar pedidos automáticamente y cómo se notifican.
            </p>

            <div class="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <div>
                <div class="text-[11px] font-medium text-slate-800">Permitir pedidos por bot</div>
                <div class="text-[10px] text-slate-500">
                  Si está desactivado, el bot solo informará y derivará a humano.
                </div>
              </div>
              <input
                type="checkbox"
                bind:checked={settings.orders.allowOrders}
                class="h-4 w-7 cursor-pointer rounded-full border border-slate-300 bg-white accent-indigo-600"
              />
            </div>

            <div class="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <div>
                <div class="text-[11px] font-medium text-slate-800">Requerir confirmación manual</div>
                <div class="text-[10px] text-slate-500">
                  Un humano debe confirmar el pedido antes de darlo por aceptado.
                </div>
              </div>
              <input
                type="checkbox"
                bind:checked={settings.orders.requireConfirmation}
                class="h-4 w-7 cursor-pointer rounded-full border border-slate-300 bg-white accent-indigo-600"
              />
            </div>

            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-700">Correo para notificaciones de pedidos</label>
              <input
                type="email"
                bind:value={settings.orders.notifyEmail}
                placeholder="ej: pedidos@mitienda.cl"
                class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800
                       outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/60"
              />
            </div>
          </div>
        </div>
      {/if}

      <!-- WHATSAPP -->
      {#if activeTab === 'whatsapp'}
        <div class="grid gap-6 p-6 md:grid-cols-2">
          <div class="space-y-3">
            <h2 class="text-sm font-semibold text-slate-900">Credenciales de WhatsApp</h2>
            <p class="text-xs text-slate-500">
              Estos datos vienen de Meta Developers. Guárdalos con cuidado, no los compartas.
            </p>

            <div class="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <div>
                <div class="text-[11px] font-medium text-slate-800">Habilitar integración WhatsApp</div>
                <div class="text-[10px] text-slate-500">
                  Si está desactivado, el bot solo funcionará vía web.
                </div>
              </div>
              <input
                type="checkbox"
                bind:checked={settings.whatsapp.enabled}
                class="h-4 w-7 cursor-pointer rounded-full border border-slate-300 bg-white accent-indigo-600"
              />
            </div>

            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-700">Phone Number ID</label>
              <input
                bind:value={settings.whatsapp.phoneNumberId}
                placeholder="Ej: 123456789012345"
                class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800
                       font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/60"
              />
            </div>

            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-700">Access Token (permanente)</label>
              <input
                type="password"
                bind:value={settings.whatsapp.accessToken}
                class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800
                       font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/60"
              />
              <p class="text-[10px] text-slate-400">
                Usa un token de larga duración. No lo compartas por chat ni correo.
              </p>
            </div>

            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-700">Verify Token (webhook)</label>
              <input
                bind:value={settings.whatsapp.verifyToken}
                placeholder="Cadena secreta para validar el webhook"
                class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800
                       outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/60"
              />
            </div>
          </div>

          <div class="space-y-3">
            <h2 class="text-sm font-semibold text-slate-900">Notificaciones internas</h2>
            <p class="text-xs text-slate-500">
              Define a qué números se envían copias o avisos de pedidos relevantes.
            </p>

            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-700">
                Números para notificación de pedidos
              </label>
              <textarea
                rows="4"
                bind:value={settings.whatsapp.notificationPhones}
                placeholder="+56912345678, +56987654321"
                class="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800
                       outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/60"
              />
              <p class="text-[10px] text-slate-400">
                Separa múltiples números con coma. En el futuro, esta lista se puede usar para notificaciones automáticas.
              </p>
            </div>
          </div>
        </div>
      {/if}

      <!-- HORARIOS -->
      {#if activeTab === 'hours'}
        <div class="grid gap-6 p-6 md:grid-cols-2">
          <div class="space-y-3">
            <h2 class="text-sm font-semibold text-slate-900">Zona horaria y días hábiles</h2>
            <p class="text-xs text-slate-500">
              Estos valores se usarán en las respuestas de horarios y también en lógicas futuras del bot
              (por ejemplo, mensajes fuera de horario).
            </p>

            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-700">Zona horaria</label>
              <input
                bind:value={settings.hours.timezone}
                placeholder="America/Santiago"
                class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800
                       font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/60"
              />
            </div>

            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-700">Lunes a viernes</label>
              <input
                bind:value={settings.hours.weekdays}
                class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800
                       outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/60"
              />
            </div>
          </div>

          <div class="space-y-3">
            <h2 class="text-sm font-semibold text-slate-900">Fin de semana</h2>

            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-700">Sábado</label>
              <input
                bind:value={settings.hours.saturday}
                class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800
                       outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/60"
              />
            </div>

            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-700">Domingo / festivos</label>
              <textarea
                rows="3"
                bind:value={settings.hours.sunday}
                class="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800
                       outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/60"
              />
            </div>
          </div>
        </div>
      {/if}

      <!-- MENSAJES -->
      {#if activeTab === 'messages'}
        <div class="grid gap-6 p-6 md:grid-cols-2">
          <div class="space-y-3">
            <h2 class="text-sm font-semibold text-slate-900">Mensajes base</h2>
            <p class="text-xs text-slate-500">
              Estos textos se usarán como base en el motor del bot. Más adelante podemos hacer que el
              engine lea directamente desde aquí según el intent.
            </p>

            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-700">Mensaje de bienvenida</label>
              <textarea
                rows="4"
                bind:value={settings.messages.welcome}
                class="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800
                       outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/60"
              />
            </div>

            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-700">Mensaje por inactividad</label>
              <textarea
                rows="3"
                bind:value={settings.messages.inactivity}
                class="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800
                       outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/60"
              />
            </div>
          </div>

          <div class="space-y-3">
            <h2 class="text-sm font-semibold text-slate-900">Handoff y cierre</h2>

            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-700">
                Mensaje cuando se deriva a humano
              </label>
              <textarea
                rows="3"
                bind:value={settings.messages.handoff}
                class="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800
                       outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/60"
              />
            </div>

            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-700">Mensaje de cierre</label>
              <textarea
                rows="3"
                bind:value={settings.messages.closing}
                class="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800
                       outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/60"
              />
            </div>
          </div>
        </div>
      {/if}

      <!-- AVANZADO -->
      {#if activeTab === 'advanced'}
        <div class="grid gap-6 p-6 md:grid-cols-2">
          <div class="space-y-3">
            <h2 class="text-sm font-semibold text-slate-900">Webhooks y URL pública</h2>
            <p class="text-xs text-slate-500">
              Estos datos se usan para integrar con proveedores externos como Meta (WhatsApp) o
              futuros canales.
            </p>

            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-700">URL pública base</label>
              <input
                bind:value={settings.api.publicBaseUrl}
                placeholder="https://tu-dominio.com"
                class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800
                       font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/60"
              />
              <p class="text-[10px] text-slate-400">
                Ejemplo: <code>https://ccsolution.cl</code>. Tu endpoint de webhook sería
                <code>{settings.api.publicBaseUrl || 'https://tu-dominio.com'}/api/webhook</code>.
              </p>
            </div>

            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-700">Webhook Secret</label>
              <input
                type="password"
                bind:value={settings.api.webhookSecret}
                placeholder="Cadena secreta opcional para validar requests entrantes"
                class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800
                       font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/60"
              />
              <p class="text-[10px] text-slate-400">
                En el futuro puedes usar esto para firmar/verificar mensajes de entrada.
              </p>
            </div>
          </div>

          <div class="space-y-3">
            <h2 class="text-sm font-semibold text-slate-900">Notas</h2>
            <p class="text-xs text-slate-500">
              Esta sección es la base para que tu plataforma sea multi-cliente: cada negocio tendrá
              su propio documento de configuración. Por ahora usamos
              <code>settings/global</code> para simplificar.
            </p>
            <ul class="list-disc space-y-1 pl-4 text-[11px] text-slate-500">
              <li>Puedes clonar este esquema por <code>businessId</code> más adelante.</li>
              <li>
                El motor del bot puede leer estos valores (por ejemplo horarios o mensajes) en vez
                de tenerlos hardcodeados.
              </li>
              <li>
                Los tokens sensibles se almacenan aquí; en producción considera usar reglas de
                seguridad apropiadas.
              </li>
            </ul>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>
