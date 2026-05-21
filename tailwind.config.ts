import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Georgia", "Cambria", '"Times New Roman"', "Times", "serif"],
      },
      colors: {
        "dark-navy": "#1a1a2e",
        "dark-navy-light": "#16213e",
        "accent-gold": "#e8b84b",
        "whatsapp-green": "#25D366",
      },
    },
  },
  plugins: [],
};

export default config;
