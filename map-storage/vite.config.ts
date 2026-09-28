import { defineConfig } from "vite";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
export default defineConfig((/*{ mode }*/) => {
    // Load env file based on `mode` in the current working directory.
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    //const env = loadEnv(mode, process.cwd(), "");
    const config = {
        publicDir: "./src-ui/public/",
        base: `${process.env.PATH_PREFIX || ""}/ui/`,
        server: {
            host: "0.0.0.0",
            // Overridable for Docker-free setups where several dev servers share one host
            // (see ../no-docker/). Default keeps the Docker behaviour.
            port: Number(process.env.MAP_STORAGE_UI_PORT) || 8080,
            ...(process.env.WA_DEV_ALLOWED_HOSTS === "true" ? { allowedHosts: true } : {}),
            hmr:
                process.env.WA_DEV_HMR === "false"
                    ? false
                    : {
                          // workaround for development in docker
                          clientPort: Number(process.env.WA_DEV_HMR_CLIENT_PORT) || 80,
                      },
            /*watch: {
                ignored: ["./src/pusher"],
            },*/
        },
        build: {
            sourcemap: true,
            outDir: "./dist-ui",
        },
        plugins: [
            svelte({
                preprocess: vitePreprocess(),
                onwarn(warning, defaultHandler) {
                    // don't warn on:
                    if (warning.code === "a11y-click-events-have-key-events") return;
                    if (warning.code === "security-anchor-rel-noreferrer") return;

                    // handle all other warnings normally
                    if (defaultHandler) {
                        defaultHandler(warning);
                    }
                },
            }),
        ],
    };

    return config;
});
