import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Static build served to LiveKit Egress (Chromium). Base can be overridden at build time.
export default defineConfig({
    plugins: [react()],
    base: "./",
    build: {
        outDir: "dist",
        sourcemap: true,
        // livekit-client alone is ~600+ kB minified; this template is loaded entirely by egress anyway.
        chunkSizeWarningLimit: 1200,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes("node_modules")) {
                        return;
                    }
                    if (id.includes("livekit-client") || id.includes("@livekit/egress-sdk")) {
                        return "livekit-recording-vendor";
                    }
                    if (id.includes("react-dom") || id.includes("/react/")) {
                        return "react-vendor";
                    }
                },
            },
        },
    },
});
