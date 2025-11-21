// src/lib/settings.ts

export type Settings = {
  businessName: string;
  defaultChannel: 'whatsapp' | 'web';
  whatsapp: {
    enabled: boolean;
    phoneNumberId: string;
    accessToken: string;
    verifyToken: string;
    notificationPhones: string; // separados por coma
  };
  hours: {
    timezone: string;
    weekdays: string;
    saturday: string;
    sunday: string;
  };
  messages: {
    welcome: string;
    inactivity: string;
    handoff: string;
    closing: string;
  };
  orders: {
    allowOrders: boolean;
    requireConfirmation: boolean;
    notifyEmail: string;
  };
  api: {
    publicBaseUrl: string;
    webhookSecret: string;
  };
};

export const defaultSettings: Settings = {
  businessName: 'Delicias Porteñas',
  defaultChannel: 'whatsapp',
  whatsapp: {
    enabled: true,
    phoneNumberId: '',      // 👉 ya NO vienen del .env aquí
    accessToken: '',
    verifyToken: '',
    notificationPhones: ''
  },
  hours: {
    timezone: 'America/Santiago',
    weekdays: '10:00 – 19:00',
    saturday: '10:00 – 14:00',
    sunday: 'Según disponibilidad, consultar por WhatsApp.'
  },
  messages: {
    welcome:
      '¡Hola! 👋 Soy el asistente automático. Puedo ayudarte a hacer pedidos, ver horarios y hablar con una persona del equipo.',
    inactivity:
      'Sigo por aquí 😊 Si todavía necesitas ayuda, puedes escribirme tu consulta o pedido.',
    handoff:
      'Derivaré tu consulta a una persona del equipo 👤. Te responderán lo antes posible.',
    closing:
      'Gracias por escribirnos 🙌 Si más adelante necesitas algo, puedes volver a hablarme cuando quieras.'
  },
  orders: {
    allowOrders: true,
    requireConfirmation: true,
    notifyEmail: ''
  },
  api: {
    publicBaseUrl: '',
    webhookSecret: ''
  }
};
