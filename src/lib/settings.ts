// src/lib/settings.ts
import { db } from '$lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
    accessToken: process.env.WHATSAPP_TOKEN ?? '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? '',
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
    publicBaseUrl: process.env.PUBLIC_BASE_URL ?? '',
    webhookSecret: process.env.WEBHOOK_SECRET ?? ''
  }
};


export async function getGlobalSettings(): Promise<Settings> {
  const ref = doc(db, 'settings', 'global');
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // Primera vez: crea el doc con defaults
    await setDoc(ref, defaultSettings);
    return defaultSettings;
  }

  const data = snap.data() as Partial<Settings>;

  // Merge profundo para no romper nada si faltan campos
  return {
    ...defaultSettings,
    ...data,
    whatsapp: {
      ...defaultSettings.whatsapp,
      ...(data.whatsapp ?? {})
    },
    hours: {
      ...defaultSettings.hours,
      ...(data.hours ?? {})
    },
    messages: {
      ...defaultSettings.messages,
      ...(data.messages ?? {})
    },
    orders: {
      ...defaultSettings.orders,
      ...(data.orders ?? {})
    },
    api: {
      ...defaultSettings.api,
      ...(data.api ?? {})
    }
  };
}
