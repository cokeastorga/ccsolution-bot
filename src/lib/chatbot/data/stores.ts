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
    direccion: 'Av. Francia 393, Valdivia'
  },
  {
    id: 's2',
    nombre: 'Sucursal Bueras',
    direccion: 'Bueras 1822, Valdivia'
  },
  {
    id: 's3',
    nombre: 'Sucursal Chacabuco',
    direccion: 'Chacabuco 340, Valdivia'
  },
  {
    id: 's4',
    nombre: 'Sucursal Baquedano',
    direccion: 'Baquedano 657, Valdivia'
  },
  {
    id: 's5',
    nombre: 'Sucursal Arauco',
    direccion: 'Arauco 327, Valdivia'
  }
];
