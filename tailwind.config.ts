import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@coinbase/onchainkit/**/*.js",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
