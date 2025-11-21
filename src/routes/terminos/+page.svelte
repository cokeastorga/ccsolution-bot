<script lang="ts">
  const lastUpdate = '20 de noviembre de 2025';
</script>

<svelte:head>
  <title>Términos y Condiciones · ChatBot Delicias Porteñas</title>
  <meta
    name="description"
    content="Términos y Condiciones de uso del ChatBot de Delicias Porteñas para consultas, cotizaciones y pedidos."
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
        Términos y Condiciones de Uso
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
        Bienvenido al ChatBot de <span class="font-semibold text-pink-700">Delicias Porteñas</span> (en adelante, el
        “ChatBot”). Al utilizar este servicio aceptas íntegramente estos Términos y Condiciones. Si no estás de acuerdo,
        por favor no continúes utilizando el ChatBot.
      </p>

      <!-- 1. Descripción -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">1. Descripción del Servicio</h2>
        <p class="mb-3 text-sm leading-relaxed text-slate-600">
          El ChatBot de Delicias Porteñas es un asistente virtual automatizado que forma parte de la experiencia digital
          del negocio y ha sido desarrollado con tecnologías como <span class="font-medium">SvelteKit</span>,
          integraciones serverless y <span class="font-medium">WhatsApp Cloud API</span>. Su propósito es asistir al
          usuario en:
        </p>
        <ul class="list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Responder consultas sobre productos, tortas, kuchenes, promociones y opciones disponibles.</li>
          <li>Entregar información referencial de precios y características de los productos.</li>
          <li>Realizar cotizaciones preliminares y orientativas.</li>
          <li>Recopilar datos básicos para gestionar eventuales pedidos o reservas.</li>
          <li>Derivar la conversación a un humano del equipo de Delicias Porteñas cuando sea necesario.</li>
          <li>Enviar notificaciones internas al equipo para coordinar producción y atención al cliente.</li>
        </ul>
      </section>

      <!-- 2. Aceptación -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">2. Aceptación de los Términos</h2>
        <p class="text-sm leading-relaxed text-slate-600">
          Al iniciar una conversación con el ChatBot, ya sea por WhatsApp u otros canales integrados, declaras que:
        </p>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Has leído y comprendido estos Términos y Condiciones.</li>
          <li>Aceptas el tratamiento de tus datos conforme a nuestra Política de Privacidad.</li>
          <li>Harás un uso responsable y de buena fe del servicio.</li>
        </ul>
      </section>

      <!-- 3. Uso permitido -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">3. Uso Permitido del ChatBot</h2>
        <p class="text-sm leading-relaxed text-slate-600">
          El ChatBot debe utilizarse únicamente para fines legítimos relacionados con Delicias Porteñas, tales como:
        </p>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Consultar productos, sabores, formatos y precios referenciales.</li>
          <li>Realizar cotizaciones preliminares de tortas, kuchenes y otros productos.</li>
          <li>Solicitar información de horarios de atención, modalidades de retiro o despacho.</li>
          <li>Solicitar ser atendido por un representante humano.</li>
        </ul>
        <p class="mt-3 text-sm leading-relaxed text-slate-600">
          Queda estrictamente prohibido utilizar el ChatBot para:
        </p>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Enviar mensajes ofensivos, discriminatorios, amenazantes o ilícitos.</li>
          <li>Realizar spam o uso abusivo del canal de comunicación.</li>
          <li>
            Intentar vulnerar la seguridad del sistema, realizar ingeniería inversa o interferir con la infraestructura
            técnica.
          </li>
          <li>Realizar actividades comerciales ajenas a Delicias Porteñas.</li>
        </ul>
      </section>

      <!-- 4. Info y cotizaciones -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">4. Información y Cotizaciones</h2>
        <p class="mb-3 text-sm leading-relaxed text-slate-600">
          La información proporcionada por el ChatBot tiene carácter <span class="font-semibold">referencial</span>.
          Esto significa que:
        </p>
        <ul class="list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Los precios pueden sufrir variaciones según insumos, tamaño, diseño o fecha solicitada.</li>
          <li>La disponibilidad de productos está sujeta a la capacidad de producción y agenda del negocio.</li>
          <li>Las cotizaciones generadas son aproximadas y pueden requerir ajustes.</li>
          <li>
            Ciertos pedidos o diseños personalizados requieren confirmación y aprobación expresa por parte de un humano.
          </li>
        </ul>
        <p class="mt-3 text-sm leading-relaxed text-slate-600">
          Delicias Porteñas y su equipo se reservan el derecho de confirmar, modificar o rechazar cualquier cotización
          entregada por el ChatBot antes de concretar el pedido final.
        </p>
      </section>

      <!-- 5. Compras y encargos -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">5. Compras y Encargos</h2>
        <p class="mb-3 text-sm leading-relaxed text-slate-600">
          Los pedidos gestionados a través del ChatBot:
        </p>
        <ul class="list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>No se consideran ventas cerradas hasta ser confirmados por un representante humano.</li>
          <li>Pueden requerir un anticipo, pago previo o confirmación adicional según el tipo de producto.</li>
          <li>
            Están sujetos a condiciones de stock, disponibilidad de ingredientes y tiempos de elaboración razonables.
          </li>
        </ul>
        <p class="mt-3 text-sm leading-relaxed text-slate-600">
          Los plazos, valores finales y condiciones específicas se comunicarán directamente al cliente antes de la
          confirmación definitiva del pedido.
        </p>
      </section>

      <!-- 6. Privacidad y datos -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">6. Privacidad y Uso de Datos</h2>
        <p class="mb-3 text-sm leading-relaxed text-slate-600">
          El ChatBot puede recopilar y tratar datos personales necesarios para brindar el servicio, tales como:
        </p>
        <ul class="list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Nombre y apellido.</li>
          <li>Número de teléfono y medio de contacto.</li>
          <li>Información relacionada con el pedido o cotización.</li>
          <li>Dirección de entrega (si aplica) y preferencias del cliente.</li>
        </ul>
        <p class="mt-3 text-sm leading-relaxed text-slate-600">
          Estos datos pueden ser gestionados mediante plataformas como WhatsApp Cloud API, servicios en la nube,
          Firestore / Firebase y la infraestructura tecnológica de
          <span class="font-semibold">CC IT &amp; Solutions / Jorge Astorga Cabalín</span>. Los datos se utilizan
          únicamente para:
        </p>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Atender consultas y solicitudes del usuario.</li>
          <li>Gestionar cotizaciones, pedidos y coordinación de entregas.</li>
          <li>Mejorar la experiencia del servicio y la calidad de atención.</li>
        </ul>
        <p class="mt-3 text-sm leading-relaxed text-slate-600">
          En ningún caso se venden o ceden datos a terceros con fines comerciales ajenos a Delicias Porteñas. El
          tratamiento de datos se regula además por la Política de Privacidad correspondiente.
        </p>
      </section>

      <!-- 7. Mensajes automatizados -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">7. Mensajes Automatizados y Notificaciones</h2>
        <p class="mb-3 text-sm leading-relaxed text-slate-600">
          Al utilizar el ChatBot aceptas que puedas recibir:
        </p>
        <ul class="list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Respuestas automáticas a tus consultas.</li>
          <li>Mensajes de seguimiento sobre tu cotización o pedido.</li>
          <li>Recordatorios o aclaraciones necesarias para completar la atención.</li>
        </ul>
        <p class="mt-3 text-sm leading-relaxed text-slate-600">
          En cualquier momento puedes solicitar dejar de recibir mensajes relacionados a un pedido específico, sujeto a
          las obligaciones que puedan existir en curso (por ejemplo, pedidos ya confirmados).
        </p>
      </section>

      <!-- 8. Limitaciones -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">8. Limitaciones del Servicio</h2>
        <p class="text-sm leading-relaxed text-slate-600">
          Aunque se busca mantener el ChatBot operativo y actualizado, no se garantiza:
        </p>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Disponibilidad ininterrumpida del servicio.</li>
          <li>Ausencia total de errores, caídas de sistema o demoras en la respuesta.</li>
          <li>Compatibilidad con todos los dispositivos y versiones de aplicaciones de mensajería.</li>
        </ul>
        <p class="mt-3 text-sm leading-relaxed text-slate-600">
          En caso de fallas técnicas, el usuario podrá comunicarse directamente con el equipo de Delicias Porteñas por
          canales alternativos.
        </p>
      </section>

      <!-- 9. Responsabilidades del usuario -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">9. Responsabilidades del Usuario</h2>
        <p class="mb-3 text-sm leading-relaxed text-slate-600">
          El usuario se compromete a:
        </p>
        <ul class="list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Entregar información veraz y actualizada para la atención de sus requerimientos.</li>
          <li>Utilizar el ChatBot de forma respetuosa, sin insultos ni lenguaje ofensivo.</li>
          <li>No abusar del canal de atención ni saturarlo con fines ajenos al servicio.</li>
        </ul>
        <p class="mt-3 text-sm leading-relaxed text-slate-600">
          Delicias Porteñas y CC IT &amp; Solutions se reservan el derecho de bloquear o limitar el acceso al ChatBot a
          usuarios que incurran en conductas abusivas o contrarias a estos Términos.
        </p>
      </section>

      <!-- 10. Propiedad intelectual -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">10. Propiedad Intelectual y Tecnología</h2>
        <p class="mb-3 text-sm leading-relaxed text-slate-600">
          El diseño, la lógica conversacional, el código fuente, los flujos automatizados, el dashboard de gestión y
          demás componentes tecnológicos asociados al ChatBot son propiedad de:
        </p>
        <p class="text-sm font-semibold text-slate-700">
          CC IT &amp; Solutions / Jorge Astorga Cabalín
        </p>
        <p class="mt-3 text-sm leading-relaxed text-slate-600">
          El usuario no adquiere ningún derecho de propiedad intelectual sobre el ChatBot ni sobre las tecnologías
          asociadas. Se prohíbe:
        </p>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Copiar, reproducir o redistribuir el ChatBot o su código.</li>
          <li>Utilizar partes del sistema para crear servicios similares para terceros sin autorización.</li>
          <li>Modificar, descompilar o intentar extraer la lógica interna del servicio.</li>
        </ul>
      </section>

      <!-- 11. Enlaces -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">11. Enlaces y Contenido Externo</h2>
        <p class="text-sm leading-relaxed text-slate-600">
          El ChatBot puede compartir enlaces a la página web de Delicias Porteñas, “La Tiendita”, redes sociales,
          catálogos u otros recursos externos. No se garantiza la disponibilidad permanente ni la ausencia de cambios en
          dichos sitios, especialmente cuando son administrados por terceros.
        </p>
      </section>

      <!-- 12. Actualizaciones -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">12. Actualizaciones del Servicio y de los Términos</h2>
        <p class="text-sm leading-relaxed text-slate-600">
          El ChatBot y estos Términos y Condiciones pueden ser modificados, actualizados o ampliados en cualquier
          momento para mejorar el servicio, adaptarse a cambios legales o incorporar nuevas funcionalidades. Las
          modificaciones entrarán en vigencia desde su publicación o implementación.
        </p>
      </section>

      <!-- 13. Ley aplicable -->
      <section class="mb-8">
        <h2 class="mb-2 text-xl font-semibold text-slate-900">13. Legislación Aplicable</h2>
        <p class="text-sm leading-relaxed text-slate-600">
          Estos Términos y Condiciones se rigen por las leyes de la República de Chile. Cualquier conflicto o disputa
          que se derive de su interpretación o cumplimiento será sometido a los tribunales competentes del país.
        </p>
      </section>

      <!-- 14. Contacto -->
      <section>
        <h2 class="mb-2 text-xl font-semibold text-slate-900">14. Contacto</h2>
        <p class="mb-3 text-sm leading-relaxed text-slate-600">
          Si tienes dudas o comentarios sobre estos Términos y Condiciones o sobre el funcionamiento del ChatBot, puedes
          contactarnos en:
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
