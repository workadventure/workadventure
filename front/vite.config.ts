import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { envConfig } from "@geprog/vite-plugin-env-config";
import sveltePreprocess from "svelte-preprocess";
import pluginRewriteAll from "vite-plugin-rewrite-all";

export default defineConfig({
    server: {
        port: 8080,
        hmr: {
            // workaround for development in docker
            clientPort: 80,
        },
    },
    build: {
        sourcemap: true,
    },
    plugins: [
        tsconfigPaths(),
        svelte({
            preprocess: sveltePreprocess(),
        }),
        envConfig({
            variables: [
                "SKIP_RENDER_OPTIMIZATIONS",
                "DISABLE_NOTIFICATIONS",
                "PUSHER_URL",
                "UPLOADER_URL",
                "ADMIN_URL",
                "CONTACT_URL",
                "ICON_URL",
                "DEBUG_MODE",
                "STUN_SERVER",
                "TURN_SERVER",
                "TURN_USER",
                "TURN_PASSWORD",
                "JITSI_URL",
                "JITSI_PRIVATE_MODE",
                "ENABLE_FEATURE_MAP_EDITOR",
                "START_ROOM_URL",
                "MAX_USERNAME_LENGTH",
                "MAX_PER_GROUP",
                "DISPLAY_TERMS_OF_USE",
                "POSTHOG_API_KEY",
                "POSTHOG_URL",
                "NODE_ENV",
                "DISABLE_ANONYMOUS",
                "ENABLE_OPENID",
                "OPID_PROFILE_SCREEN_PROVIDER",
                "FALLBACK_LOCALE",
                "CHAT_URL",
            ],
        }),
        pluginRewriteAll(),
    ],
});
