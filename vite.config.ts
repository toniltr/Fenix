import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // rapier3d-compat ships wasm inlined (base64); no special plugin needed.
  server: { open: true },
});
