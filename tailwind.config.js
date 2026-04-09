/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0f1117',
        panel: '#1a1d27',
        panelBorder: '#2a2d3e',
        surface: '#22263a',
        surfaceHover: '#2d3149',
        accent: '#5b6af0',
        accentHover: '#6b7af5',
      },
    },
  },
  plugins: [],
}
