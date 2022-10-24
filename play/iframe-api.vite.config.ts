import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    publicDir: false,
    build: {
        outDir: "public",
        emptyOutDir: false,
        sourcemap: true,
        lib: {
            entry: resolve(__dirname, "src/iframe_api.ts"),
            name: "iframe_api",
            formats: ["cjs"],
            fileName: () => "iframe_api.js",
        },
    },
});
