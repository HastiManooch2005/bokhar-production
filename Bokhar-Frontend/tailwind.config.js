module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#4A90E2",
        danger: "#FF6B6B",
        dark: "#222831",

        bouquet: {
          50: "#f9f6f8",
          100: "#f5eef3",
          200: "#ecdee8",
          300: "#ddc4d5",
          400: "#c79fb9",
          500: "#af7a9b",
          600: "#9d6585",
          700: "#84526d",
          800: "#6f455b",
          900: "#5e3d4e",
          950: "#37202c",
        },
      },

      keyframes: {
        fadeInUp: {
          "0%": { opacity: 0, transform: "translateY(10px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        fadeInUp: "fadeInUp 0.3s ease-in-out forwards",
      },
    },
  },
  plugins: [],
  safelist: [
  'bg-orange-50', 'bg-orange-100', 'bg-orange-200', 'bg-orange-500', 'text-orange-600', 'border-orange-200', 'peer-focus:ring-orange-300', 'peer-checked:bg-orange-500',
  'bg-blue-50', 'bg-blue-100', 'bg-blue-200', 'bg-blue-500', 'text-blue-600', 'border-blue-200', 'peer-focus:ring-blue-300', 'peer-checked:bg-blue-500',
  'bg-red-50', 'text-red-600', 'border-red-200'
]

};
