// src/lib/chatbot/data/stores.ts

export type Store = {
  id: string;
  nombre: string;
  direccion: string; // La dirección exacta es vital para la IA
};

export const stores: Store[] = [
  {
    id: 's1',
    nombre: 'Sucursal Av. Francia',
    direccion: 'Av. Francia 1540, Valdivia'
  },
  {
    id: 's2',
    nombre: 'Sucursal Isla Teja',
    direccion: 'Los Robles 302, Isla Teja, Valdivia'
  },
  {
    id: 's3',
    nombre: 'Sucursal Valle Volcanes',
    direccion: 'Av. Cuarta Terraza 505, Valle Volcanes, Valdivia'
  }
];