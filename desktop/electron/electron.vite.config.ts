import { fileURLToPath } from "url";
import { defineConfig } from "electron-vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";

// `npm run dev` starts `electron dist/main.js` rather than `electron .`, as before electron-vite: Electron
// then names the profile "Electron" instead of reading package.json, so a dev run keeps its own settings
// and logins and does not take the installed app's single-instance lock.
process.env.ELECTRON_ENTRY ??= "dist/main.js";

// Same layout as the former tsup build: dist/main.js, dist/preload-*/preload.js, and the Landing in
// dist/landing. Main runs first and empties dist, so the next builds must not empty it again.
export default defineConfig({
    main: {
        build: {
            outDir: "dist",
            rolldownOptions: { input: { main: "src/main.ts" } },
        },
    },
    preload: {
        build: {
            outDir: "dist",
            emptyOutDir: false,
            // The views are sandboxed: each preload must be one file that requires nothing but electron.
            isolatedEntries: true,
            externalizeDeps: false,
            rolldownOptions: {
                input: {
                    "preload-app/preload": "src/preload-app/preload.ts",
                    "preload-tabs/preload": "src/preload-tabs/preload.ts",
                    "preload-screen-identify/preload": "src/preload-screen-identify/preload.ts",
                },
            },
        },
    },
    renderer: {
        root: "src/landing",
        plugins: [svelte(), tailwindcss()],
        build: {
            outDir: "dist/landing",
            // Absolute: the dev server resolves it against `root`, the build against the project.
            rolldownOptions: { input: fileURLToPath(new URL("./src/landing/index.html", import.meta.url)) },
        },
    },
});
