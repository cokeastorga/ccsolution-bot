<script lang="ts">
  import { auth, db, storage } from '$lib/firebase';
  import { doc, getDoc, updateDoc } from 'firebase/firestore';
  import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let nombre = '';
  let apellido = '';
  let telefono = '';
  let empresa = '';
  let email = '';
  let avatarUrl = '';
  let selectedFile: File | null = null;

  let loading = false;
  let successMessage = '';
  let errorMessage = '';

  onMount(async () => {
    const user = auth.currentUser;
    if (!user) return goto('/login');
    email = user.email ?? '';

    try {
      const refDoc = doc(db, 'usuarios', user.uid);
      const snap = await getDoc(refDoc);
      if (snap.exists()) {
        const data = snap.data();
        nombre = data.nombre || '';
        apellido = data.apellido || '';
        telefono = data.telefono || '';
        empresa = data.empresa || '';
        avatarUrl = data.avatarUrl || '';
      }
    } catch (err) {
      errorMessage = 'Error al cargar los datos.';
      console.error(err);
    }
  });

  async function actualizarPerfil() {
    const user = auth.currentUser;
    if (!user) return;

    loading = true;
    successMessage = '';
    errorMessage = '';

    try {
      let finalAvatarUrl = avatarUrl;

      if (selectedFile) {
        const storageRef = ref(storage, `avatars/${user.uid}`);
        await uploadBytes(storageRef, selectedFile);
        finalAvatarUrl = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, 'usuarios', user.uid), {
        nombre,
        apellido,
        telefono,
        empresa,
        avatarUrl: finalAvatarUrl
      });

      successMessage = '✅ Perfil actualizado.';
      avatarUrl = finalAvatarUrl;
      selectedFile = null;
    } catch (err) {
      errorMessage = '❌ Error al actualizar.';
      console.error(err);
    } finally {
      loading = false;
    }
  }

  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    selectedFile = target.files?.[0] || null;
  }
</script>

<section class="min-h-screen bg-gray-100 p-6 animate-fade-in-up">
  <div class="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow space-y-6">
    <header class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-indigo-700">Mi Perfil</h1>
      <button on:click={() => location.reload()} class="text-sm text-blue-600 hover:underline disabled:opacity-50" disabled={loading}>
        Recargar
      </button>
    </header>

    {#if successMessage}
      <div class="bg-green-100 text-green-800 px-4 py-2 rounded">{successMessage}</div>
    {/if}
    {#if errorMessage}
      <div class="bg-red-100 text-red-800 px-4 py-2 rounded">{errorMessage}</div>
    {/if}

    <form on:submit|preventDefault={actualizarPerfil} class="space-y-6">
      <div class="flex items-center space-x-4">
        <img
          src={selectedFile ? URL.createObjectURL(selectedFile) : avatarUrl || '/default-avatar.png'}
          alt="Avatar del usuario"
          class="w-20 h-20 rounded-full object-cover ring-2 ring-indigo-500"
        />
        <input
          type="file"
          accept="image/*"
          on:change={handleFileChange}
          class="text-sm"
          disabled={loading}
        />
      </div>

      <fieldset disabled={loading} class="space-y-4">
        <div>
          <label class="block font-semibold mb-1">Correo electrónico</label>
          <input class="w-full bg-gray-100 border px-4 py-2 rounded" type="email" value={email} disabled />
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <label class="block font-semibold mb-1">Nombre</label>
            <input class="w-full border px-4 py-2 rounded" type="text" bind:value={nombre} />
          </div>
          <div>
            <label class="block font-semibold mb-1">Apellido</label>
            <input class="w-full border px-4 py-2 rounded" type="text" bind:value={apellido} />
          </div>
        </div>

        <div>
          <label class="block font-semibold mb-1">Teléfono</label>
          <input class="w-full border px-4 py-2 rounded" type="tel" bind:value={telefono} />
        </div>

        <div>
          <label class="block font-semibold mb-1">Empresa</label>
          <input class="w-full border px-4 py-2 rounded" type="text" bind:value={empresa} />
        </div>
      </fieldset>

      <div class="pt-4">
        <button
          type="submit"
          class="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 transition disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  </div>
</section>

<style>
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .animate-fade-in-up {
    animation: fade-in-up 0.5s ease-out forwards;
  }
</style>
