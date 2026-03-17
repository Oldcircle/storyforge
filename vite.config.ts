import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/comfyui-api": {
        target: "http://127.0.0.1:8188",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/comfyui-api/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            // Some ComfyUI setups reject proxied POST requests when a browser Origin header leaks through.
            proxyReq.removeHeader("origin");
          });
        },
      },
    },
  },
});
