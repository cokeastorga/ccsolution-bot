<script lang="ts">
  import Card from '$lib/components/ui/Card.svelte';
</script>

<div class="space-y-6 md:space-y-8">
  <section class="flex items-center justify-between">
    <div>
      <h2 class="text-xl md:text-2xl font-semibold text-slate-900">Usuarios</h2>
      <p class="text-sm text-slate-500 mt-1">
        Gestiona quién puede acceder al panel y sus roles.
      </p>
    </div>
  </section>

  <Card>
    <p class="text-sm text-slate-500">
      Aquí listaremos los usuarios desde Firestore (colección <code>users</code>) con sus roles y estados.
    </p>
  </Card>
</div>
