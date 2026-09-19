/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f2f7f2',
          100: '#dcebdc',
          200: '#b9d8b9',
          300: '#8fc08f',
          400: '#5fa35f',
          500: '#2f6b3a', // primary brand green
          600: '#275c31',
          700: '#204a28',
          800: '#1a3b21',
          900: '#152f1a',
        },
        bark: '#6b4f3b',
        sand: '#f7f3ea',
      },
      fontFamily: {
        sans: ['Segoe UI', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
