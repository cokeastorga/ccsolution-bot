<script>
  let name = 'CC Solution Chat Bot';
</script>

<section class="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col justify-center items-center text-white px-6">
  <div class="text-center animate-fade-in">
    <h1 class="text-5xl md:text-6xl font-extrabold mb-6 drop-shadow-lg">
      ¡Bienvenido a <span class="text-yellow-300">{name}</span>!
    </h1>

    <p class="text-xl md:text-2xl mb-10 max-w-xl mx-auto animate-slide-up">
      Tu nueva aplicación está lista. Tailwind CSS está funcionando con animaciones suaves y diseño responsivo.
    </p>

  <a
  href="/login"
  data-sveltekit-preload-data
  class="bg-white text-indigo-700 font-semibold px-6 py-3 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-transform duration-300 ease-in-out">
  Comenzar
</a>

  </div>
</section>

<style>
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slide-up {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .animate-fade-in {
    animation: fade-in 1s ease-out forwards;
  }

  .animate-slide-up {
    animation: slide-up 1.3s ease-out forwards;
  }
</style>
