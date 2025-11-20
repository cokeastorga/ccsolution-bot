<script lang="ts">
  import { auth } from '$lib/firebase';
  import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
  import { goto } from '$app/navigation';
  import { db } from '$lib/firebase';
  import { doc, setDoc } from 'firebase/firestore';

  let nombre = '';
  let apellido = '';
  let telefono = '';
  let empresa = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let error: string | null = null;
  let message: string | null = null;
  let loading = false;

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

    loading = true;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user) {
        // Guardar datos en Firestore
        await setDoc(doc(db, 'usuarios', user.uid), {
          nombre,
          apellido,
          telefono,
          empresa,
          email,
          creado: new Date().toISOString(),
          verificado: false
        });

        // Enviar email de verificación
        await sendEmailVerification(user);

        message = 'Cuenta creada. Por favor verifica tu correo antes de continuar.';
      }
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-red-400 px-4">
  <div class="bg-white shadow-xl rounded-xl p-8 w-full max-w-md animate-fade-in-up">
    <h1 class="text-3xl font-extrabold mb-6 text-center text-pink-700 drop-shadow">Crear cuenta</h1>

    {#if error}
      <div class="bg-red-100 text-red-700 p-3 rounded mb-4 animate-shake">{error}</div>
    {/if}

    {#if message}
      <div class="bg-green-100 text-green-700 p-3 rounded mb-4 animate-fade-in-up">{message}</div>
    {/if}

    <form on:submit|preventDefault={register} class="space-y-4">
      <input class="w-full border border-gray-300 p-3 rounded-lg focus:ring-pink-400" type="text" placeholder="Nombre" bind:value={nombre} required />
      <input class="w-full border border-gray-300 p-3 rounded-lg focus:ring-pink-400" type="text" placeholder="Apellido" bind:value={apellido} required />
      <input class="w-full border border-gray-300 p-3 rounded-lg focus:ring-pink-400" type="tel" placeholder="Teléfono" bind:value={telefono} required />
      <input class="w-full border border-gray-300 p-3 rounded-lg focus:ring-pink-400" type="text" placeholder="Empresa" bind:value={empresa} required />
      <input class="w-full border border-gray-300 p-3 rounded-lg focus:ring-pink-400" type="email" placeholder="Correo electrónico" bind:value={email} required />
      <input class="w-full border border-gray-300 p-3 rounded-lg focus:ring-pink-400" type="password" placeholder="Contraseña" bind:value={password} required />
      <input class="w-full border border-gray-300 p-3 rounded-lg focus:ring-pink-400" type="password" placeholder="Confirmar contraseña" bind:value={confirmPassword} required />

      <button class="w-full bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700 transform hover:scale-105 transition duration-300 disabled:opacity-50" type="submit" disabled={loading}>
        {loading ? 'Registrando...' : 'Crear cuenta'}
      </button>
    </form>

    <p class="mt-6 text-sm text-center text-pink-800">
      ¿Ya tienes una cuenta?
      <a href="/login" class="font-bold underline hover:text-pink-900">Inicia sesión</a>
    </p>
  </div>
</div>

<style>
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(40px); }
    to { opacity: 1; transform: translateY(0); }
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
