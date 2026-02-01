/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        possum: {
          50: '#f5f3f0',
          100: '#e8e4de',
          200: '#d4ccc0',
          300: '#b8ab98',
          400: '#9d8b73',
          500: '#8a785f',
          600: '#746350',
          700: '#5e5143',
          800: '#50453a',
          900: '#453c33',
          950: '#26201b',
        },
      },
    },
  },
  plugins: [],
};
