import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 백엔드 CORS 허용 origin이 단일 값(http://localhost:5173)이라, 포트가 밀리면
  // 로그인이 통째로 막힌다. 자동으로 다른 포트를 잡지 않고 실패하게 둔다.
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
