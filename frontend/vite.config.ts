import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Em desenvolvimento, /api vai para o Spring Boot na porta 8080.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // A apresentação vira uma página única hospedada fora do servidor: caminhos relativos.
  base: mode === "apresentacao" ? "./" : "/",
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8080" },
  },
  build: {
    outDir: mode === "apresentacao" ? "dist-apresentacao" : "dist",
    emptyOutDir: true,
  },
}));
