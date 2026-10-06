import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Two builds into dist/, one after the other (see package.json):
// - content.js: content script, a single IIFE (content scripts can't be ES modules)
// - popup.html: the toolbar popup, a regular page
// TARGET=popup selects the second one.
const popup = process.env.TARGET === "popup"
const src = resolve(import.meta.dirname, "src")
const dist = resolve(import.meta.dirname, "dist")

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": src } },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  root: popup ? resolve(src, "popup") : import.meta.dirname,
  base: "./",
  // Only the content build copies public/ (manifest, icons, fonts).
  publicDir: popup ? false : resolve(import.meta.dirname, "public"),
  build: {
    outDir: dist,
    // Both builds share dist/; `npm run build` cleans it first.
    emptyOutDir: false,
    minify: mode !== "development",
    ...(popup
      ? { rollupOptions: { input: resolve(src, "popup/popup.html") } }
      : {
          lib: {
            entry: resolve(src, "content/main.tsx"),
            name: "WhatsAppLocalTime",
            formats: ["iife" as const],
            fileName: () => "content.js",
          },
        }),
  },
}))
