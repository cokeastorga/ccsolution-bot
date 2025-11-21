<script lang="ts">
  import { auth } from '$lib/firebase';
  import {
    createUserWithEmailAndPassword,
    sendEmailVerification
  } from 'firebase/auth';
  import { goto } from '$app/navigation';
  import { db } from '$lib/firebase';
  import { doc, setDoc } from 'firebase/firestore';

  let nombre = $state('');
  let apellido = $state('');
  let telefono = $state('');
  let empresa = $state('');
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');

  let error = $state<string | null>(null);
  let message = $state<string | null>(null);
  let loading = $state(false);

  async function register() {
    error = null;
    message = null;

    if (!nombre || !apellido || !telefono || !empresa || !email || !password) {
      error = 'Por favor completa todos los campos.';
      return;
    }

    if (password !== confirmPassword) {
      error = 'Las contraseñas no coinciden.';
      return;
    }

    if (!auth) {
      error = 'Error al inicializar autenticación.';
      return;
    }

    loading = true;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'usuarios', user.uid), {
        nombre,
        apellido,
        telefono,
        empresa,
        email,
        creado: new Date().toISOString(),
        verificado: false
      });

      await sendEmailVerification(user);

      message = 'Cuenta creada. Verifica tu correo antes de iniciar sesión.';
    } catch (err: unknown) {
      if (err instanceof Error) {
        error = err.message;
      } else {
        error = 'Ocurrió un error al crear tu cuenta.';
      }
    } finally {
      loading = false;
    }
  }
</script>

<section class="min-h-screen bg-slate-950 relative flex items-center justify-center px-4">
  <!-- Glows -->
  <div class="absolute inset-0 pointer-events-none">
    <div class="absolute -top-20 left-1/3 w-96 h-96 bg-indigo-600/20 blur-[160px] rounded-full"></div>
    <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 blur-[150px] rounded-full"></div>
  </div>

  <!-- Card -->
  <div
    class="relative w-full max-w-md bg-slate-900/70 backdrop-blur-xl border border-slate-800 
           rounded-2xl px-6 py-10 md:px-8 md:py-12 shadow-2xl animate-[fade-in-up_0.7s_ease-out]"
  >
    <!-- Header -->
    <div class="mb-6 text-center">
      <div class="inline-flex items-center justify-center mb-3">
        <div class="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center mr-3">
          <span class="text-indigo-400 font-bold text-lg">CC</span>
        </div>
        <div class="text-left">
          <p class="text-[11px] tracking-[0.2em] text-slate-400 uppercase">
            Crear cuenta
          </p>
          <h1 class="text-sm font-semibold text-slate-100">
            CC Solution Chat Bot
          </h1>
        </div>
      </div>

      <h2 class="text-2xl font-bold text-slate-50">
        Crear nueva cuenta
      </h2>
      <p class="mt-1 text-xs text-slate-400">
        Registra tu cuenta para acceder al panel administrativo.
      </p>
    </div>

    {#if error}
      <div class="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
        {error}
      </div>
    {/if}

    {#if message}
      <div class="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
        {message}
      </div>
    {/if}

    <!-- Form -->
    <form on:submit|preventDefault={register} class="space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-slate-300 mb-1 block">Nombre</label>
          <input
            class="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm
                   text-slate-100 placeholder:text-slate-500
                   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            type="text"
            bind:value={nombre}
            required
          />
        </div>

        <div>
          <label class="text-xs text-slate-300 mb-1 block">Apellido</label>
          <input
            class="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm
                   text-slate-100 placeholder:text-slate-500
                   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            type="text"
            bind:value={apellido}
            required
          />
        </div>
      </div>

      <div>
        <label class="text-xs text-slate-300 mb-1 block">Teléfono</label>
        <input
          class="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm
                 text-slate-100 placeholder:text-slate-500
                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          type="tel"
          bind:value={telefono}
          required
        />
      </div>

      <div>
        <label class="text-xs text-slate-300 mb-1 block">Empresa</label>
        <input
          class="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm
                 text-slate-100 placeholder:text-slate-500
                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          type="text"
          bind:value={empresa}
          required
        />
      </div>

      <div>
        <label class="text-xs text-slate-300 mb-1 block">Correo electrónico</label>
        <input
          class="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm
                 text-slate-100 placeholder:text-slate-500
                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          type="email"
          bind:value={email}
          required
        />
      </div>

      <div>
        <label class="text-xs text-slate-300 mb-1 block">Contraseña</label>
        <input
          class="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm
                 text-slate-100 placeholder:text-slate-500
                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          type="password"
          bind:value={password}
          required
        />
      </div>

      <div>
        <label class="text-xs text-slate-300 mb-1 block">Confirmar contraseña</label>
        <input
          class="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm
                 text-slate-100 placeholder:text-slate-500
                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          type="password"
          bind:value={confirmPassword}
          required
        />
      </div>

      <button
        class="w-full inline-flex items-center justify-center bg-indigo-500 hover:bg-indigo-400 
               text-white font-medium rounded-xl px-4 py-2.5 mt-2 shadow-lg shadow-indigo-500/30
               active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
        type="submit"
        disabled={loading}
      >
        {loading ? 'Registrando…' : 'Crear cuenta'}
      </button>
    </form>

    <p class="mt-6 text-xs text-center text-slate-400">
      ¿Ya tienes una cuenta?
      <a href="/login" class="text-indigo-300 hover:text-indigo-200 hover:underline">Inicia sesión</a>
    </p>
  </div>
</section>

<style>
  @keyframes fade-in-up {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
</style>
