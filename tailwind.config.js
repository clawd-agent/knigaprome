/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7C3AED',    // Фиолетовый - волшебство
        secondary: '#F59E0B',  // Жёлтый - детский
        accent: '#EC4899',     // Розовый
      },
      fontFamily: {
        display: ['Comfortaa', 'cursive'],
        body: ['Nunito', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
