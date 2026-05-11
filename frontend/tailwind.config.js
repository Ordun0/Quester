// frontend/tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        quester: {
          purple: '#2E2D88',      // Para "QUESTER"
          blue: '#1F75FE',        // Para botones/acentos
          dark: '#333333',        // Texto más oscuro (100%)
          light: 'rgba(51, 51, 51, 0.8)', // Texto más claro (80%)
          field: 'rgba(211, 225, 255, 0.15)' // Fondos de inputs (15%)
        }
      }
    },
  },
  plugins: [],
}