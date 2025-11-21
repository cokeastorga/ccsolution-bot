<script lang="ts">
  import { auth } from '$lib/firebase';
  import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
  import { goto } from '$app/navigation';

  // En Svelte 5: lo que se bindea debe ser $state
  let email = $state('');
  let password = $state('');
  let error = $state<string | null>(null);
  let message = $state<string | null>(null);
  let loading = $state(false);

  async function login() {
    error = null;
    message = null;
    loading = true;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Usuario logeado:', userCredential.user);
      goto('/dashboard');
    } catch (err: any) {
      error = err.message;
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

    try {
      await sendPasswordResetEmail(auth, email);
      message = 'Te hemos enviado un correo para recuperar tu contraseña.';
    } catch (err: any) {
      error = err.message;
    }
  }

  function goToRegister() {
    goto('/register');
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-4">
  <div class="bg-white shadow-xl rounded-xl p-8 w-full max-w-md animate-fade-in-up">
    <h1 class="text-3xl font-extrabold mb-6 text-center text-indigo-700 drop-shadow">Iniciar sesión</h1>

    {#if error}
      <div class="bg-red-100 text-red-700 p-3 rounded mb-4 animate-shake">{error}</div>
    {/if}

    {#if message}
      <div class="bg-green-100 text-green-700 p-3 rounded mb-4 animate-fade-in-up">{message}</div>
    {/if}

    <form on:submit|preventDefault={login} class="space-y-5">
      <input
        class="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        type="email"
        placeholder="Correo electrónico"
        bind:value={email}
        required
      />

      <input
        class="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        type="password"
        placeholder="Contraseña"
        bind:value={password}
        required
      />

      <button
        class="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transform hover:scale-105 transition-transform duration-300 disabled:opacity-50"
        type="submit"
        disabled={loading}
      >
        {loading ? 'Cargando...' : 'Ingresar'}
      </button>
    </form>

    <div class="mt-6 text-sm flex justify-between items-center text-indigo-700 font-medium">
      <button on:click={recoverPassword} class="hover:underline transition">
        ¿Olvidaste tu contraseña?
      </button>
      <button on:click={goToRegister} class="hover:underline transition">
        Crear cuenta
      </button>
    </div>

    <!-- Links legales -->
    <div class="mt-8 text-xs text-center text-gray-600 leading-relaxed">
      Al continuar aceptas nuestros
      <a href="/terminos" class="text-indigo-600 hover:underline">Términos y Condiciones</a>
      y nuestra
      <a href="/privacidad" class="text-indigo-600 hover:underline">Política de Privacidad</a>.
    </div>
  </div>
</div>

<style>
  @keyframes fade-in-up {
    from {
      opacity: 0;
      transform: translateY(40px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes shake {
    0% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-6px); }
    80% { transform: translateX(6px); }
    100% { transform: translateX(0); }
  }

  .animate-fade-in-up {
    animation: fade-in-up 0.8s ease-out forwards;
  }

  .animate-shake {
    animation: shake 0.5s ease;
  }
</style>
