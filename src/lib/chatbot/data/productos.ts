// src/lib/chatbot/data/productos.ts

export type Producto = {
  id: string;
  slug: string;
  nombre: string;
  descripcionCorta: string;
  descripcion: string;
  categoria: 'Bizcocho' | 'Hojarasca' | 'Porciones' | 'Temporada';
  precio: number;              // precio base si no hay tamaños
  rindePersonas?: number;
  diametroCm?: number;
  imagen: string;
  disponible: boolean;
  tamanos?: Array<{ id: string; nombre: string; precio: number }>;
  addons?: Array<{ id: string; nombre: string; precio: number }>;
};

export const productos: Producto[] = [
  {
    id: 't1',
    slug: 'torta-alpina',
    nombre: 'Torta Alpina',
    descripcionCorta: 'Bizcocho de chocolate con dulce de leche y crema diplomatica.',
    descripcion: 'Bizcocho de chocolate con aros de dulce de leche relleno de crema diplomática (Crema de leche, pastelera y chantilly). Cubierta sutil de ganache de chocolate y crema chantilly.',
    categoria: 'Bizcocho',
    precio: 18500,
    rindePersonas: 15,
    diametroCm: 20,
    imagen: 'tortas/bizcocho/tortaAlpina2.webp',
    disponible: true,
    tamanos: [
      { id: 'ch', nombre: 'Chico (Ø 20 cm / 10-15p)', precio: 18500 },
      { id: 'md', nombre: 'Mediano (Ø 22 cm / 14–16p)', precio: 27500 },
      { id: 'gr', nombre: 'Grande (Ø 24 cm / 20–20p)', precio: 32500 }
    ],
    addons: [
      { id: 'card', nombre: 'Tarjeta de saludo', precio: 1500 },
      { id: 'velas', nombre: 'Velas', precio: 1000 }
    ]
  },
  {
    id: 't2',
    slug: 'torta-chocolate',
    nombre: 'Torta de Chocolate',
    descripcionCorta: 'Bizcocho de Brownie con mousse de chocolate y crema.',
    descripcion: 'Bizcocho tipo brownie relleno de suave mousse de chocolate, Bañada con ganache de chocolate, decorada con crema chantilly y maní crocante de chocolate.',
    categoria: 'Bizcocho',
    precio: 18500,
    rindePersonas: 15,
    diametroCm: 20,
    imagen: 'tortas/bizcocho/tortaChocolate2.webp',
    disponible: true,
    tamanos: [
      { id: 'ch', nombre: 'Chico (Ø 20 cm / 10-15p)', precio: 18500 },
      { id: 'md', nombre: 'Mediano (Ø 22 cm / 20-25p)', precio: 27500 },
      { id: 'gr', nombre: 'Grande (Ø 24 cm / 25-30p)', precio: 32500 }
    ],
    addons: [
      { id: 'card', nombre: 'Tarjeta de saludo', precio: 1500 },
      { id: 'velas', nombre: 'Velas', precio: 1000 }
    ]
  },
 {
    id: 't3',
    slug: 'torta-dulceLeche',
    nombre: 'Torta Dulce de Leche',
    descripcionCorta: 'Bizcocho de vainilla con dulce de leche y crema',
    descripcion: 'Bizcocho esponjoso de vainilla con dulce de leche y una crema especial de dulce de leche, decorada con crema chantilly y una sutil cubierta de dulce de leche.',
    categoria: 'Bizcocho',
    precio: 18500,
    rindePersonas: 15,
    diametroCm: 20,
    imagen: 'tortas/bizcocho/tortaDulceLeche2.webp',
    disponible: true,
    tamanos: [
      { id: 'ch', nombre: 'Chico (Ø 20 cm / 10-15p)', precio: 18500 },
      { id: 'md', nombre: 'Mediano (Ø 22 cm / 20–25p)', precio: 27500 },
      { id: 'gr', nombre: 'Grande (Ø 24 cm / 25-30p)', precio: 32500 }
    ],
    addons: [
      { id: 'card', nombre: 'Tarjeta de saludo', precio: 1500 },
      { id: 'velas', nombre: 'Velas', precio: 1000 }
    ]
  },
   {
    id: 't4',
    slug: 'torta-frambuesa',
    nombre: 'Torta Frambuesa',
    descripcionCorta: 'Clásica con relleno de frambuesas y mermelada.',
    descripcion: 'Bizcocho de vainilla esponjoso con suave crema chantilly, Rellena de mermelada de frambuesa, con frambuesas naturales.',
    categoria: 'Bizcocho',
    precio: 18500,
    rindePersonas: 15,
    diametroCm: 20,
    imagen: 'tortas/bizcocho/tortaFrambuesa2.webp',
    disponible: true,
     tamanos: [
      { id: 'ch', nombre: 'Chico (Ø 20 cm / 10-15p)', precio: 18500 },
      { id: 'md', nombre: 'Mediano (Ø 22 cm / 20–25p)', precio: 27500 },
      { id: 'gr', nombre: 'Grande (Ø 24 cm / 25-30p)', precio: 32500 }
    ],
    addons: [
      { id: 'card', nombre: 'Tarjeta de saludo', precio: 1500 },
      { id: 'velas', nombre: 'Velas', precio: 1000 }
    ]
  },
   {
    id: 't5',
    slug: 'torta-durazno',
    nombre: 'Torta Frutal Durazno',
    descripcionCorta: 'Bizcocho de vainilla con dulce de leche, durazno y crema.',
    descripcion: 'Bizcocho de vainilla con dulce de leche, crema chantilly y delicados trozos de durazno, decorado con cobertura de crema chantilly y una capa de trozos de durazno.',
    categoria: 'Bizcocho',
    precio: 18500,
    rindePersonas: 15,
    diametroCm: 20,
    imagen: 'tortas/bizcocho/tortaDurazno3.webp',
    disponible: true,
     tamanos: [
      { id: 'ch', nombre: 'Chico (Ø 20 cm / 10-15p)', precio: 18500 },
      { id: 'md', nombre: 'Mediano (Ø 22 cm / 20–25p)', precio: 27500 },
      { id: 'gr', nombre: 'Grande (Ø 24 cm / 25-30p)', precio: 32500 }
    ],
    addons: [
      { id: 'card', nombre: 'Tarjeta de saludo', precio: 1500 },
      { id: 'velas', nombre: 'Velas', precio: 1000 }
    ]
  },
   {
    id: 't6',
    slug: 'torta-mani',
    nombre: 'Torta Maní',
    descripcionCorta: 'Bizcocho de brownie cubierta de ganache.',
    descripcion: 'Bizcocho de chocolate tipo brownie, relleno con suave crema de maní, cubierta de ganache de chocolate y trozos de maní crocante',
    categoria: 'Bizcocho',
    precio: 18500,
    rindePersonas: 15,
    diametroCm: 20,
    imagen: 'tortas/bizcocho/tortaMani2.webp',
    disponible: true,
     tamanos: [
      { id: 'ch', nombre: 'Chico (Ø 20 cm / 10-15p)', precio: 18500 },
      { id: 'md', nombre: 'Mediano (Ø 22 cm / 20–25p)', precio: 27500 },
      { id: 'gr', nombre: 'Grande (Ø 24 cm / 25-30p)', precio: 32500 }
    ],
    addons: [
      { id: 'card', nombre: 'Tarjeta de saludo', precio: 1500 },
      { id: 'velas', nombre: 'Velas', precio: 1000 }
    ]
  },
   {
    id: 't7',
    slug: 'torta-manjar-nuez',
    nombre: 'Torta Manjar Nuez',
    descripcionCorta: 'Clásica con manjar casero y nueces.',
    descripcion: 'Bizcocho de vainilla relleno con dulce de leche y nueces, cubierta con una delicada capa de dulce de leche, decorada con nueces y crema chantilly.',
    categoria: 'Bizcocho',
    precio: 18500,
    rindePersonas: 15,
    diametroCm: 20,
    imagen: 'tortas/bizcocho/tortaManjarNuez2.webp',
    disponible: true,
     tamanos: [
      { id: 'ch', nombre: 'Chico (Ø 20 cm / 10-15p)', precio: 18500 },
      { id: 'md', nombre: 'Mediano (Ø 22 cm / 20–25p)', precio: 27500 },
      { id: 'gr', nombre: 'Grande (Ø 24 cm / 25-30p)', precio: 32500 }
    ],
    addons: [
      { id: 'card', nombre: 'Tarjeta de saludo', precio: 1500 },
      { id: 'velas', nombre: 'Velas', precio: 1000 }
    ]
  },
   {
    id: 't8',
    slug: 'torta-maracuya',
    nombre: 'Torta Maracuyá',
    descripcionCorta: 'Bizcocho de vainilla con maracuyá natural.',
    descripcion: 'Bizcocho de vainilla con maracuyá natural, crema mixta con crema de maracuyá, manjar y mermelada de frambuesa.',
    categoria: 'Bizcocho',
    precio: 18500,
    rindePersonas: 15,
    diametroCm: 20,
    imagen: 'tortas/bizcocho/tortaMaracuya2.webp',
    disponible: true,
     tamanos: [
      { id: 'ch', nombre: 'Chico (Ø 20 cm / 10-15p)', precio: 18500 },
      { id: 'md', nombre: 'Mediano (Ø 22 cm / 20–25p)', precio: 27500 },
      { id: 'gr', nombre: 'Grande (Ø 24 cm / 25-30p)', precio: 32500 }
    ],
    addons: [
      { id: 'card', nombre: 'Tarjeta de saludo', precio: 1500 },
      { id: 'velas', nombre: 'Velas', precio: 1000 }
    ]
  },
   {
    id: 't9',
    slug: 'torta-menta',
    nombre: 'Torta de Menta',
    descripcionCorta: 'Clásica con bizcocho de chocolate y mousse de menta.',
    descripcion: 'Bizcocho de chocolate aireado con ganache de chocolate, mousse de menta, licor de menta y crema chantilly, decorada con crema de menta y ganache de chocolate.',
    categoria: 'Bizcocho',
    precio: 18500,
    rindePersonas: 15,
    diametroCm: 20,
    imagen: 'tortas/bizcocho/tortaMenta2.webp',
    disponible: true,
     tamanos: [
      { id: 'ch', nombre: 'Chico (Ø 20 cm / 10-15p)', precio: 18500 },
      { id: 'md', nombre: 'Mediano (Ø 22 cm / 20–25p)', precio: 27500 },
      { id: 'gr', nombre: 'Grande (Ø 24 cm / 25-30p)', precio: 32500 }
    ],
    addons: [
      { id: 'card', nombre: 'Tarjeta de saludo', precio: 1500 },
      { id: 'velas', nombre: 'Velas', precio: 1000 }
    ]
  },
   {
    id: 't10',
    slug: 'torta-moka',
    nombre: 'Torta Moka',
    descripcionCorta: 'Bizcocho de vainilla relleno de crema moka.',
    descripcion: 'Bizcocho de vainilla esponjoso con relleno de crema moka: (Chantilly, manjar y café). Bañada con ganache de chocolate.',
    categoria: 'Bizcocho',
    precio: 18500,
    rindePersonas: 15,
    diametroCm: 20,
    imagen: 'tortas/bizcocho/tortaMoka2.webp',
    disponible: true,
     tamanos: [
      { id: 'ch', nombre: 'Chico (Ø 20 cm / 10-15p)', precio: 18500 },
      { id: 'md', nombre: 'Mediano (Ø 22 cm / 20–25p)', precio: 27500 },
      { id: 'gr', nombre: 'Grande (Ø 24 cm / 25-30p)', precio: 32500 }
    ],
    addons: [
      { id: 'card', nombre: 'Tarjeta de saludo', precio: 1500 },
      { id: 'velas', nombre: 'Velas', precio: 1000 }
    ]
  },
   {
    id: 't11',
    slug: 'torta-red-velvet',
    nombre: 'Torta Red Velvet',
    descripcionCorta: 'Bizcocho de vainilla con color rojo y frosting clásico.',
    descripcion: 'Delicado bizcocho de vainilla con sofisticado color rojo, suave relleno de crema frosting (Azúcar flor, queso Philadelfia, Mantequilla y un toque de ralladura de limón y naranja). Cubierta con pulpa de frutilla.',
    categoria: 'Bizcocho',
    precio: 18500,
    rindePersonas: 15,
    diametroCm: 20,
    imagen: 'tortas/bizcocho/tortaRedVelvet2.webp',
    disponible: true,
     tamanos: [
      { id: 'ch', nombre: 'Chico (Ø 20 cm / 10-15p)', precio: 18500 },
      { id: 'md', nombre: 'Mediano (Ø 22 cm / 20–25p)', precio: 27500 },
      { id: 'gr', nombre: 'Grande (Ø 24 cm / 25-30p)', precio: 32500 }
    ],
    addons: [
      { id: 'card', nombre: 'Tarjeta de saludo', precio: 1500 },
      { id: 'velas', nombre: 'Velas', precio: 1000 }
    ]
  },
   {
    id: 't12',
    slug: 'torta-rose',
    nombre: 'Torta Rosé',
    descripcionCorta: 'Bizcocho de vainilla con mousse de frambuesa.',
    descripcion: 'Bizcocho aireado de vainilla relleno con mousse de frambuesa, aros de dulce de leche y mousse de chocolate, cubierta de ganache de chocolate.',
    categoria: 'Bizcocho',
    precio: 18500,
    rindePersonas: 15,
    diametroCm: 20,
    imagen: 'tortas/bizcocho/tortaRose3.webp',
    disponible: true,
     tamanos: [
      { id: 'ch', nombre: 'Chico (Ø 20 cm / 10-15p)', precio: 18500 },
      { id: 'md', nombre: 'Mediano (Ø 22 cm / 20–25p)', precio: 27500 },
      { id: 'gr', nombre: 'Grande (Ø 24 cm / 25-30p)', precio: 32500 }
    ],
    addons: [
      { id: 'card', nombre: 'Tarjeta de saludo', precio: 1500 },
      { id: 'velas', nombre: 'Velas', precio: 1000 }
    ]
  },
   {
    id: 't13',
    slug: 'torta-selva-negra',
    nombre: 'Torta Selva Negra',
    descripcionCorta: 'Clásica con mermelada casera y ganache de chocolate.',
    descripcion: 'Bizcocho de chocolate relleno de mermelada de frambuesa, frambuesa natural, bañada con delicado ganache de chocolate.',
    categoria: 'Bizcocho',
    precio: 18500,
    rindePersonas: 15,
    diametroCm: 20,
    imagen: 'tortas/bizcocho/tortaSelvaNegra3.webp',
    disponible: true,
     tamanos: [
      { id: 'ch', nombre: 'Chico (Ø 20 cm / 10-15p)', precio: 18500 },
      { id: 'md', nombre: 'Mediano (Ø 22 cm / 20–25p)', precio: 27500 },
      { id: 'gr', nombre: 'Grande (Ø 24 cm / 25-30p)', precio: 32500 }
    ],
    addons: [
      { id: 'card', nombre: 'Tarjeta de saludo', precio: 1500 },
      { id: 'velas', nombre: 'Velas', precio: 1000 }
    ]
  },
   {
    id: 't14',
    slug: 'torta-tresLeches',
    nombre: 'Torta Tres Leches',
    descripcionCorta: 'Clásica con aros de dulce de leche y crema diplomatica.',
    descripcion: 'Bizcocho de vainilla esponjoso y aros de dulce de leche, crema diplomática, cubierta con merengue italiano, decorado con un sutil flambeado.',
    categoria: 'Bizcocho',
    precio: 18500,
    rindePersonas: 15,
    diametroCm: 20,
    imagen: 'tortas/bizcocho/tortaTresLeches2.webp',
    disponible: true,
     tamanos: [
      { id: 'ch', nombre: 'Chico (Ø 20 cm / 10-15p)', precio: 18500 },
      { id: 'md', nombre: 'Mediano (Ø 22 cm / 20–25p)', precio: 27500 },
      { id: 'gr', nombre: 'Grande (Ø 24 cm / 25-30p)', precio: 32500 }
    ],
    addons: [
      { id: 'card', nombre: 'Tarjeta de saludo', precio: 1500 },
      { id: 'velas', nombre: 'Velas', precio: 1000 }
    ]
  },
   {
    id: 't15',
    slug: 'torta-Trufa',
    nombre: 'Torta Trufa',
    descripcionCorta: 'Bizcocho de chocolate relleno con crema trufa.',
    descripcion: 'Bizcocho de chocolate aireado relleno con intensa crema de trufa, cubierta de ganache de chocolate, decorado con dulce de leche.',
    categoria: 'Bizcocho',
    precio: 20500,
    rindePersonas: 15,
    diametroCm: 20,
    imagen: 'tortas/bizcocho/tortaTrufa2.webp',
    disponible: true,
     tamanos: [
      { id: 'ch', nombre: 'Chico (Ø 20 cm / 10-15p)', precio: 20500 },
      { id: 'md', nombre: 'Mediano (Ø 22 cm / 20–25p)', precio: 29500 },
      { id: 'gr', nombre: 'Grande (Ø 24 cm / 25-30p)', precio: 34500 }
    ],
    addons: [
      { id: 'card', nombre: 'Tarjeta de saludo', precio: 1500 },
      { id: 'velas', nombre: 'Velas', precio: 1000 }
    ]
  },
   {
    id: 't16',
    slug: 'torta-Amor',
    nombre: 'Torta Amor',
    descripcionCorta: 'Discos de hojarasca con dulce de leche y crema diplomitica.',
    descripcion: 'Discos de hojarasca con aros de dulce de leche, crema diplomática (Crema de leche, pastelera y chantilly). Frambuesa natural y mermelada de frambuesa.',
    categoria: 'Hojarasca',
    precio: 20500,
    rindePersonas: 15,
    diametroCm: 20,
    imagen: 'tortas/hojarasca/tortaAmor2.webp',
    disponible: true,
     tamanos: [
      { id: 'ch', nombre: 'Chico (Ø 20 cm / 10-15p)', precio: 20500 },
      { id: 'md', nombre: 'Mediano (Ø 22 cm / 20–25p)', precio: 29500 },
      { id: 'gr', nombre: 'Grande (Ø 24 cm / 25-30p)', precio: 34500 }
    ],
    addons: [
      { id: 'card', nombre: 'Tarjeta de saludo', precio: 1500 },
      { id: 'velas', nombre: 'Velas', precio: 1000 }
    ]
  },
   {
    id: 't17',
    slug: 'torta-Celestial',
    nombre: 'Torta Celestial',
    descripcionCorta: 'Discos de hojaldre crocante con bizcocho, merengue, dulce de leche y chantily.',
    descripcion: 'Disco de hojaldre crocante con bizcocho de vainilla y delicados discos de merengue, relleno de frambuesas, dulce de leche y crema chantilly.',
    categoria: 'Hojarasca',
    precio: 20500,
    rindePersonas: 15,
    diametroCm: 20,
    imagen: 'tortas/hojarasca/tortaCelestial2.webp',
    disponible: true,
     tamanos: [
      { id: 'ch', nombre: 'Chico (Ø 20 cm / 10-15p)', precio: 20500 },
      { id: 'md', nombre: 'Mediano (Ø 22 cm / 20–25p)', precio: 29500 },
      { id: 'gr', nombre: 'Grande (Ø 24 cm / 25-30p)', precio: 34500 }
    ],
    addons: [
      { id: 'card', nombre: 'Tarjeta de saludo', precio: 1500 },
      { id: 'velas', nombre: 'Velas', precio: 1000 }
    ]
  },
   {
    id: 't18',
    slug: 'torta-MilHojas',
    nombre: 'Torta Mil Hojas',
    descripcionCorta: 'Discos de hojaldre relleno con dulce de leche.',
    descripcion: 'Discos de hojaldre crujientes rellenos con dulce de leche, decorado con delicado ganache de chocolate, hojuelos de hojaldre y exquisito dulce de leche.',
    categoria: 'Hojarasca',
    precio: 18500,
    rindePersonas: 15,
    diametroCm: 20,
    imagen: 'tortas/hojarasca/tortaMilHojas2.webp',
    disponible: true,
     tamanos: [
      { id: 'ch', nombre: 'Chico (Ø 20 cm / 10-15p)', precio: 18500 },
      { id: 'md', nombre: 'Mediano (Ø 22 cm / 20–25p)', precio: 27500 },
      { id: 'gr', nombre: 'Grande (Ø 24 cm / 25-30p)', precio: 32500 }
    ],
    addons: [
      { id: 'card', nombre: 'Tarjeta de saludo', precio: 1500 },
      { id: 'velas', nombre: 'Velas', precio: 1000 }
    ]
  }
];
