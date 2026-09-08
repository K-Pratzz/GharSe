/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#FBF6EC',
        marigold: {
          DEFAULT: '#DB9027',
          dark: '#B9721A',
          light: '#F1C978',
        },
        tulsi: {
          DEFAULT: '#33513A',
          dark: '#22381F',
          light: '#5C7C57',
        },
        clay: '#7A4B32',
        ink: '#2B2118',
      },
      fontFamily: {
        display: ['"Noto Serif"', 'Georgia', '"Times New Roman"', 'serif'],
        body: ['"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};
