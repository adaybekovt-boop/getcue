import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxy /api to the Express backend during local dev.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
