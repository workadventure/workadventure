import { fileURLToPath } from "url";
import { defineConfig } from "vite";

export default defineConfig({
    publicDir: false,
    build: {
        outDir: "public",
        emptyOutDir: false,
        sourcemap: true,
        lib: {
            entry: fileURLToPath(new URL("src/iframe_api.ts", import.meta.url)),
            name: "iframe_api",
            formats: ["iife"],
            fileName: () => "iframe_api.js",
        },
    },
});
