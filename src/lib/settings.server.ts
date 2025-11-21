// src/lib/settings.server.ts
import { db } from '$lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { env as privateEnv } from '$env/dynamic/private';
import type { Settings } from '$lib/settings';
import { defaultSettings as baseDefaults } from '$lib/settings';

export const defaultServerSettings: Settings = {
  ...baseDefaults,
  whatsapp: {
    ...baseDefaults.whatsapp,
    phoneNumberId: privateEnv.WHATSAPP_PHONE_NUMBER_ID ?? baseDefaults.whatsapp.phoneNumberId,
    accessToken: privateEnv.WHATSAPP_TOKEN ?? baseDefaults.whatsapp.accessToken,
    verifyToken: privateEnv.WHATSAPP_VERIFY_TOKEN ?? baseDefaults.whatsapp.verifyToken,
    notificationPhones: baseDefaults.whatsapp.notificationPhones
  },
  api: {
    ...baseDefaults.api,
    publicBaseUrl: privateEnv.PUBLIC_BASE_URL ?? baseDefaults.api.publicBaseUrl,
    webhookSecret: privateEnv.WEBHOOK_SECRET ?? baseDefaults.api.webhookSecret
  }
};

export async function getGlobalSettings(): Promise<Settings> {
  try {
    const ref = doc(db, 'settings', 'global');
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, defaultServerSettings);
      return defaultServerSettings;
    }

    const data = snap.data() as Partial<Settings>;

    return {
      ...defaultServerSettings,
      ...data,
      whatsapp: {
        ...defaultServerSettings.whatsapp,
        ...(data.whatsapp ?? {})
      },
      hours: {
        ...defaultServerSettings.hours,
        ...(data.hours ?? {})
      },
      messages: {
        ...defaultServerSettings.messages,
        ...(data.messages ?? {})
      },
      orders: {
        ...defaultServerSettings.orders,
        ...(data.orders ?? {})
      },
      api: {
        ...defaultServerSettings.api,
        ...(data.api ?? {})
      }
    };
  } catch (err) {
    console.error('❌ Error leyendo settings desde Firestore:', err);
    // NO lanzamos error → el webhook sigue funcionando con defaults
    return defaultServerSettings;
  }
}
