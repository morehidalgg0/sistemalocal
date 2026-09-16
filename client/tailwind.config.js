/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        },
        // Paleta slate mapeada a variables CSS (rgb) para soportar /opacidad y alternar Claro/Oscuro
        slate: {
          50: 'rgb(var(--np-slate-50) / <alpha-value>)',
          100: 'rgb(var(--np-slate-100) / <alpha-value>)',
          200: 'rgb(var(--np-slate-200) / <alpha-value>)',
          300: 'rgb(var(--np-slate-300) / <alpha-value>)',
          400: 'rgb(var(--np-slate-400) / <alpha-value>)',
          500: 'rgb(var(--np-slate-500) / <alpha-value>)',
          600: 'rgb(var(--np-slate-600) / <alpha-value>)',
          700: 'rgb(var(--np-slate-700) / <alpha-value>)',
          800: 'rgb(var(--np-slate-800) / <alpha-value>)',
          900: 'rgb(var(--np-slate-900) / <alpha-value>)',
          950: 'rgb(var(--np-slate-950) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
}