import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // <-- Cette ligne indispensable permet d'activer le mode sombre par classe HTML
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;