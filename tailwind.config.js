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
          red: '#cc0033',
          black: '#000000',
        },
      },
      fontFamily: {
        raleway: ['Raleway', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

