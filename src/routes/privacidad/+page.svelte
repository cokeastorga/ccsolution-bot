<script lang="ts">
  const lastUpdate = '20 de noviembre de 2025';
</script>

<svelte:head>
  <title>Política de Privacidad · ChatBot Delicias Porteñas</title>
  <meta
    name="description"
    content="Política de Privacidad del ChatBot de Delicias Porteñas, desarrollada en SvelteKit y conectada con WhatsApp Cloud API."
  />
</svelte:head>

<main class="min-h-screen bg-slate-50 py-16 px-4">
  <section class="mx-auto max-w-4xl">
    <!-- Encabezado -->
    <div class="mb-8 space-y-2 text-center">
      <p class="inline-flex items-center rounded-full bg-pink-100 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-pink-700">
        ChatBot Delicias Porteñas
      </p>
      <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
        Política de Privacidad
      </h1>
      <p class="text-sm text-slate-500">Última actualización: {lastUpdate}</p>
    </div>
<!-- Botón Volver -->
<div class="mt-6 text-center">
  <button
    on:click={() => history.back()}
    class="text-sm text-gray-600 hover:text-indigo-700 hover:underline transition"
  >
    ← Volver
  </button>
</div>
<br>
    <!-- Card principal -->
    <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 md:p-10">
      <p class="mb-6 text-sm leading-relaxed text-slate-600">
        En <span class="font-semibold text-pink-700">Delicias Porteñas</span> valoramos la privacidad y la protección de
        los datos personales de nuestros clientes. Esta Política de Privacidad explica cómo recopilamos, utilizamos,
        almacenamos y protegemos los datos proporcionados a través de nuestro ChatBot (en adelante, el “ChatBot”), el
        cual opera mediante integraciones desarrolladas en <strong>SvelteKit</strong>, infraestructura serverless,
        <strong>WhatsApp Cloud API</strong> y sistemas de <strong>CC IT &amp; Solutions</strong>.
      </p>

      <!-- 1. Datos que recopilamos -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">1. Datos que Recopilamos</h2>
        <p class="text-sm leading-relaxed text-slate-600">
          Durante la interacción con el ChatBot podemos recopilar los siguientes tipos de información:
        </p>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li><span class="font-medium">Datos de identificación:</span> nombre, apellido, teléfono de contacto.</li>
          <li><span class="font-medium">Datos de conversación:</span> mensajes enviados, preferencias, solicitudes.</li>
          <li>
            <span class="font-medium">Datos de pedidos:</span> tipo de torta o producto solicitado, tamaños, fechas,
            sabores, referencias enviadas por el cliente.
          </li>
          <li>
            <span class="font-medium">Datos de entrega (si corresponde):</span> dirección, comuna, indicaciones,
            disponibilidad horaria.
          </li>
          <li>
            <span class="font-medium">Datos técnicos:</span> información derivada del uso de WhatsApp Cloud API, como
            estado de entrega de mensajes o identificación interna del chat.
          </li>
        </ul>
      </section>

      <!-- 2. Cómo usamos los datos -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">2. ¿Cómo Usamos tus Datos?</h2>
        <p class="text-sm leading-relaxed text-slate-600">
          Utilizamos la información recopilada exclusivamente para:
        </p>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Responder consultas sobre productos, precios y disponibilidad.</li>
          <li>Crear cotizaciones personalizadas según lo solicitado por el usuario.</li>
          <li>Gestionar pedidos, reservas y coordinación de producción.</li>
          <li>Derivar conversaciones a un humano cuando corresponde.</li>
          <li>Mejorar la calidad, precisión y velocidad de las respuestas del ChatBot.</li>
          <li>
            Registrar historiales necesarios para análisis de atención o mejoras del servicio (solo uso interno).
          </li>
        </ul>
        <p class="mt-3 text-sm leading-relaxed text-slate-600">
          En ningún caso utilizamos la información para venderla, cederla o transferirla a terceros ajenos a Delicias
          Porteñas o CC IT &amp; Solutions.
        </p>
      </section>

      <!-- 3. Tecnologías utilizadas -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">3. Plataformas y Tecnologías Utilizadas</h2>
        <p class="text-sm leading-relaxed text-slate-600">
          El ChatBot opera sobre la siguiente infraestructura:
        </p>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>WhatsApp Cloud API (Meta)</li>
          <li>FireStore / Firebase para almacenamiento seguro</li>
          <li>SvelteKit + serverless endpoints (infraestructura de CC Solution)</li>
          <li>Servidores de Vercel u otros proveedores equivalentes</li>
        </ul>
        <p class="mt-3 text-sm leading-relaxed text-slate-600">
          Cada una de estas herramientas posee sus propias políticas de seguridad y protocolos de cifrado. Se seleccionan
          exclusivamente por su fiabilidad y buenas prácticas en protección de datos.
        </p>
      </section>

      <!-- 4. Conservación -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">4. Conservación de Datos</h2>
        <p class="text-sm leading-relaxed text-slate-600">
          Los datos recopilados se almacenan durante el período necesario para:
        </p>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Responder la solicitud o cotización del cliente.</li>
          <li>Gestionar pedidos en curso o futuros.</li>
          <li>Realizar análisis internos de mejora del servicio.</li>
        </ul>
        <p class="mt-3 text-sm leading-relaxed text-slate-600">
          El usuario puede solicitar la eliminación de sus datos personales en cualquier momento, salvo cuando existan
          obligaciones legales o pedidos aún vigentes.
        </p>
      </section>

      <!-- 5. Seguridad -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">5. Seguridad de la Información</h2>
        <p class="text-sm leading-relaxed text-slate-600">
          Implementamos medidas razonables y proporcionales de seguridad para proteger tus datos, incluyendo:
        </p>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Cifrado de datos en tránsito mediante protocolos TLS.</li>
          <li>Accesos restringidos a administradores autorizados.</li>
          <li>Reglas de Firestore diseñadas para evitar accesos no autorizados.</li>
          <li>Controles internos de seguridad en el dashboard de CC IT &amp; Solutions.</li>
        </ul>
        <p class="mt-3 text-sm leading-relaxed text-slate-600">
          Pese a ello, ningún sistema es 100% seguro, pero trabajamos constantemente para reducir riesgos y proteger tu
          información.
        </p>
      </section>

      <!-- 6. Terceros -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">6. Transferencia de Datos a Terceros</h2>
        <p class="text-sm leading-relaxed text-slate-600">
          No vendemos ni compartimos tus datos con terceros ajenos a la prestación del servicio. Solo pueden acceder a la
          información:
        </p>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>El equipo de Delicias Porteñas encargado de atender tu solicitud.</li>
          <li>CC IT &amp; Solutions como proveedor tecnológico.</li>
          <li>Plataformas automatizadas estrictamente necesarias (por ejemplo WhatsApp Cloud API).</li>
        </ul>
        <p class="mt-3 text-sm leading-relaxed text-slate-600">
          No se comparte información con fines de marketing externo, publicidad, bases comerciales o venta de datos.
        </p>
      </section>

      <!-- 7. Derechos del usuario -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">7. Derechos del Usuario</h2>
        <p class="text-sm leading-relaxed text-slate-600">
          Según la legislación chilena y buenas prácticas de protección de datos, el usuario puede solicitar:
        </p>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Acceso a sus datos personales.</li>
          <li>Corrección de información incorrecta o incompleta.</li>
          <li>Eliminación de sus datos cuando ya no sean necesarios.</li>
          <li>Suspensión del envío de mensajes del ChatBot.</li>
        </ul>
        <p class="mt-3 text-sm leading-relaxed text-slate-600">
          Para ejercer estos derechos, el usuario puede contactar a los correos indicados al final de este documento.
        </p>
      </section>

      <!-- 8. Cookies -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">8. Uso de Cookies y Datos Técnicos</h2>
        <p class="text-sm leading-relaxed text-slate-600">
          El ChatBot en sí no utiliza cookies, pero la página web y el dashboard de CC Solution sí pueden emplearlas para
          fines de rendimiento y seguridad. Estos datos pueden incluir:
        </p>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Dirección IP.</li>
          <li>Navegador utilizado.</li>
          <li>Registros de error del sistema (solo para soporte técnico).</li>
        </ul>
      </section>

      <!-- 9. Actualizaciones -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">9. Actualizaciones de esta Política</h2>
        <p class="text-sm leading-relaxed text-slate-600">
          Esta Política de Privacidad puede ser modificada en cualquier momento para reflejar cambios en las tecnologías,
          integraciones, obligaciones legales o mejoras del servicio. La fecha de última actualización se mostrará en la
          parte superior de la página.
        </p>
      </section>

      <!-- 10. Contacto -->
      <section>
        <h2 class="mb-2 text-xl font-semibold text-slate-900">10. Contacto</h2>
        <p class="mb-3 text-sm leading-relaxed text-slate-600">
          Si tienes preguntas, solicitudes o deseas ejercer tus derechos sobre tus datos personales, puedes contactarnos
          a:
        </p>
        <ul class="space-y-1 text-sm text-slate-700">
           <li>
            📧 <span class="font-medium">Delicias Porteñas:</span>
            <span class="font-mono">contacto@deliciasportenas.cl</span>
          </li>
          <li>
            📧 <span class="font-medium">Soporte técnico (CC IT &amp; Solutions):</span>
            <span class="font-mono">admin@deliciasportenas.cl</span>
          </li>
          <li>📍 Santiago, Chile</li>
        </ul>
      </section>
    </div>
    <!-- Botón Volver -->
<div class="mt-6 text-center">
  <button
    on:click={() => history.back()}
    class="text-sm text-gray-600 hover:text-indigo-700 hover:underline transition"
  >
    ← Volver
  </button>
</div>
  </section>
</main>
