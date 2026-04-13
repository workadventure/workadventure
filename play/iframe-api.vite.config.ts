import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
    publicDir: false,
    build: {
        outDir: "public",
        emptyOutDir: false,
        sourcemap: true,
        lib: {
            entry: resolve(__dirname, "src/iframe_api.ts"),
            name: "iframe_api",
            formats: ["iife"],
            fileName: () => "iframe_api.js",
        },
    },
});
