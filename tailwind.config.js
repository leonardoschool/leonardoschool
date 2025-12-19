/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Permette il toggle manuale del tema
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          red: '#a8012b',
          dark: '#8a0125',
          light: '#d1163b',
        },
        // Estendo i colori slate per dark mode
        slate: {
          750: '#1e293b',
          850: '#172033',
          950: '#0f172a',
        },
        red: {
          50: '#fef2f2',
          100: '#fee2e2',
          400: '#c7516b',
          500: '#a8012b',
          600: '#a8012b',
          700: '#8a0125',
          800: '#6b011f',
          900: '#4d0116',
          950: '#2e000d',
        },
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        bahnschrift: ['Bahnschrift', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
        },
      },
      animation: {
        shake: 'shake 0.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

