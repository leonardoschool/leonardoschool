/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          red: '#a8012b',
          black: '#000000',
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
        raleway: ['Raleway', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

