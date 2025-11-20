// tailwind.config.js

// 1. Importa el plugin
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
  ],
  theme: {
    extend: {},
  },
  // 2. Lo agregas al array de plugins
  plugins: [
    forms,
    typography
  ],
};