/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Sahel Pharma palette: clinical, trustworthy
        brand: {
          green: {
            50: '#f0f7f3',
            100: '#dceee4',
            500: '#1a8a5c',
            600: '#157049',
            700: '#0f5a3c',
            800: '#0c4a31',
          },
          blue: {
            500: '#3a8bd9',
            600: '#1e66b8',
            700: '#184f8d',
          },
          neutral: {
            50: '#f8f9fa',
            100: '#f1f3f5',
            500: '#6b7280',
            900: '#111827',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif Pro"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
