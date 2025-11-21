<script lang="ts">
  import { auth } from '$lib/firebase';
  import {
    signInWithEmailAndPassword,
    sendPasswordResetEmail
  } from 'firebase/auth';
  import { goto } from '$app/navigation';

  let email = $state('');
  let password = $state('');
  let error = $state<string | null>(null);
  let message = $state<string | null>(null);
  let loading = $state(false);

  async function login() {
    error = null;
    message = null;

    if (!auth) {
      error = 'Error al inicializar la autenticación. Intenta recargar la página.';
      return;
    }

    loading = true;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Usuario logueado:', userCredential.user);
      goto('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        error = err.message;
      } else {
        error = 'Ocurrió un error al iniciar sesión.';
      }
    } finally {
      loading = false;
    }
  }

  async function recoverPassword() {
    error = null;
    message = null;

    if (!email) {
      error = 'Ingresa tu correo para recuperar tu contraseña.';
      return;
    }

    if (!auth) {
      error = 'Error al inicializar la autenticación. Intenta recargar la página.';
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      message = 'Te hemos enviado un correo para recuperar tu contraseña.';
    } catch (err: unknown) {
      if (err instanceof Error) {
        error = err.message;
      } else {
        error = 'Ocurrió un error al enviar el correo de recuperación.';
      }
    }
  }

  function goToRegister() {
    goto('/register');
  }
</script>

<section class="min-h-screen bg-slate-950 flex items-center justify-center px-4">
  <div
    class="w-full max-w-md bg-slate-900/70 border border-slate-800 rounded-2xl
           px-6 py-8 md:px-8 md:py-10 shadow-2xl backdrop-blur animate-[fade-in-up_0.6s_ease-out]"
  >
    <!-- Header -->
    <div class="mb-6 text-center">
      <div class="inline-flex items-center justify-center mb-3">
        <div class="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center mr-3">
          <span class="text-indigo-400 font-bold text-lg">CC</span>
        </div>
        <div class="text-left">
          <p class="text-[11px] tracking-[0.2em] text-slate-400 uppercase">
            Acceso al panel
          </p>
          <h1 class="text-sm font-semibold text-slate-100">
            CC Solution Chat Bot
          </h1>
        </div>
      </div>

      <h2 class="text-2xl font-bold text-slate-50">
        Iniciar sesión
      </h2>
      <p class="mt-1 text-xs text-slate-400">
        Usa tu correo corporativo para entrar al panel de administración.
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

    <form on:submit|preventDefault={login} class="space-y-4">
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-300">
          Correo electrónico
        </label>
        <input
          class="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm
                 text-slate-100 placeholder:text-slate-500
                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          type="email"
          placeholder="ejemplo@ccsolution.cl"
          bind:value={email}
          required
        />
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-slate-300">
          Contraseña
        </label>
        <input
          class="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm
                 text-slate-100 placeholder:text-slate-500
                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          type="password"
          placeholder="••••••••"
          bind:value={password}
          required
        />
      </div>

      <button
        class="mt-2 w-full inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2.5
               text-sm font-medium text-white shadow-lg shadow-indigo-500/30
               hover:bg-indigo-400 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
        type="submit"
        disabled={loading}
      >
        {loading ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>

    <div class="mt-4 flex flex-col sm:flex-row justify-between gap-2 text-xs text-slate-300">
      <button
        type="button"
        on:click={recoverPassword}
        class="text-indigo-300 hover:text-indigo-200 hover:underline text-left"
      >
        ¿Olvidaste tu contraseña?
      </button>
      <button
        type="button"
        on:click={goToRegister}
        class="text-slate-300 hover:text-slate-100 hover:underline text-left sm:text-right"
      >
        Crear cuenta nueva
      </button>
    </div>

    <div class="mt-6 border-t border-slate-800 pt-4 text-[11px] text-center text-slate-500 leading-relaxed">
      Al continuar aceptas nuestros
      <a href="/terminos" class="text-indigo-300 hover:text-indigo-200 hover:underline">
        Términos y Condiciones
      </a>
      y la
      <a href="/privacidad" class="text-indigo-300 hover:text-indigo-200 hover:underline">
        Política de Privacidad
      </a>.
    </div>
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
