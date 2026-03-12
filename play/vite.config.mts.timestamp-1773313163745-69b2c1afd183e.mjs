// vite.config.mts
import { basename } from "path";
import fs from "fs";
import { defineConfig, loadEnv } from "file:///usr/src/app/play/node_modules/vite/dist/node/index.js";
import { svelte } from "file:///usr/src/app/play/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import { sveltePreprocess } from "file:///usr/src/app/play/node_modules/svelte-preprocess/dist/index.js";
import legacy from "file:///usr/src/app/play/node_modules/@vitejs/plugin-legacy/dist/index.mjs";
import { sentryVitePlugin } from "file:///usr/src/app/node_modules/@sentry/vite-plugin/dist/esm/index.mjs";
import Icons from "file:///usr/src/app/node_modules/unplugin-icons/dist/vite.js";
import tsconfigPaths from "file:///usr/src/app/play/node_modules/vite-tsconfig-paths/dist/index.mjs";
import { nodePolyfills } from "file:///usr/src/app/node_modules/vite-plugin-node-polyfills/dist/index.js";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const config = {
    server: {
      host: "0.0.0.0",
      port: 8080,
      hmr: {
        // workaround for development in docker
        clientPort: 80
      },
      watch: {
        ignored: ["./src/pusher"]
      }
    },
    build: {
      sourcemap: env.GENERATE_SOURCEMAP !== "false",
      outDir: "./dist/public",
      rollupOptions: {
        plugins: [mediapipe_workaround()]
        // external: ["@mediapipe/tasks-vision"],
        //plugins: [inject({ Buffer: ["buffer/", "Buffer"] })],
      },
      assetsInclude: ["**/*.tflite", "**/*.wasm"]
    },
    plugins: [
      nodePolyfills({
        include: ["events", "buffer"],
        globals: {
          Buffer: true
        }
      }),
      svelte({
        preprocess: sveltePreprocess(),
        onwarn(warning, defaultHandler) {
          if (warning.code === "a11y-click-events-have-key-events") return;
          if (warning.code === "security-anchor-rel-noreferrer") return;
          if (warning.code === "Unknown at rule @container (css)") return;
          if (warning.message.includes("Unknown at rule @container")) return;
          if (defaultHandler) {
            defaultHandler(warning);
          }
        }
      }),
      Icons({
        compiler: "svelte"
      }),
      // Conditional plugin inclusion
      ...env.DISABLE_LEGACY_BROWSERS === "true" ? [] : [
        legacy({
          //targets: ['defaults', 'not IE 11', 'iOS > 14.3']
          // Structured clone is needed for Safari < 15.4
          polyfills: ["web.structured-clone"],
          modernPolyfills: ["web.structured-clone"]
        })
      ],
      tsconfigPaths()
    ],
    resolve: {
      alias: {
        events: "events"
      }
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./tests/setup/vitest.setup.ts"],
      coverage: {
        all: true,
        include: ["src/*.ts", "src/**/*.ts"],
        exclude: ["src/i18n", "src/enum"]
      }
    },
    optimizeDeps: {
      include: ["olm"],
      exclude: ["svelte-modals"],
      esbuildOptions: {
        define: {
          global: "globalThis"
        }
      }
    }
  };
  if (env.SENTRY_ORG && env.SENTRY_PROJECT && env.SENTRY_AUTH_TOKEN && env.SENTRY_RELEASE && env.SENTRY_ENVIRONMENT) {
    console.info("Sentry plugin enabled");
    config.plugins.push(
      sentryVitePlugin({
        url: env.SENTRY_URL || "https://sentry.io/",
        org: env.SENTRY_ORG,
        project: env.SENTRY_PROJECT,
        // Specify the directory containing build artifacts
        sourcemaps: {
          assets: "./dist/public/**"
        },
        // Auth tokens can be obtained from https://sentry.io/settings/account/api/auth-tokens/
        // and needs the `project:releases` and `org:read` scopes
        authToken: env.SENTRY_AUTH_TOKEN,
        // Optionally uncomment the line below to override automatic release name detection
        release: {
          name: env.SENTRY_RELEASE,
          deploy: {
            env: env.SENTRY_ENVIRONMENT
          },
          finalize: true
        }
      })
    );
  } else {
    console.info("Sentry plugin disabled");
  }
  return config;
});
function mediapipe_workaround() {
  return {
    name: "mediapipe_workaround",
    load(id) {
      if (basename(id) === "selfie_segmentation.js") {
        let code = fs.readFileSync(id, "utf-8");
        code += "exports.SelfieSegmentation = SelfieSegmentation;";
        return { code };
      } else {
        return null;
      }
    }
  };
}
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcubXRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL3Vzci9zcmMvYXBwL3BsYXlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi91c3Ivc3JjL2FwcC9wbGF5L3ZpdGUuY29uZmlnLm10c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vdXNyL3NyYy9hcHAvcGxheS92aXRlLmNvbmZpZy5tdHNcIjtpbXBvcnQgeyBiYXNlbmFtZSB9IGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgZnMgZnJvbSBcImZzXCI7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHsgc3ZlbHRlIH0gZnJvbSBcIkBzdmVsdGVqcy92aXRlLXBsdWdpbi1zdmVsdGVcIjtcbmltcG9ydCB7IHN2ZWx0ZVByZXByb2Nlc3MgfSBmcm9tIFwic3ZlbHRlLXByZXByb2Nlc3NcIjtcbmltcG9ydCBsZWdhY3kgZnJvbSBcIkB2aXRlanMvcGx1Z2luLWxlZ2FjeVwiO1xuaW1wb3J0IHsgc2VudHJ5Vml0ZVBsdWdpbiB9IGZyb20gXCJAc2VudHJ5L3ZpdGUtcGx1Z2luXCI7XG5pbXBvcnQgSWNvbnMgZnJvbSBcInVucGx1Z2luLWljb25zL3ZpdGVcIjtcbmltcG9ydCB0c2NvbmZpZ1BhdGhzIGZyb20gXCJ2aXRlLXRzY29uZmlnLXBhdGhzXCI7XG5pbXBvcnQgeyBub2RlUG9seWZpbGxzIH0gZnJvbSBcInZpdGUtcGx1Z2luLW5vZGUtcG9seWZpbGxzXCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gICAgLy8gTG9hZCBlbnYgZmlsZSBiYXNlZCBvbiBgbW9kZWAgaW4gdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkuXG4gICAgLy8gU2V0IHRoZSB0aGlyZCBwYXJhbWV0ZXIgdG8gJycgdG8gbG9hZCBhbGwgZW52IHJlZ2FyZGxlc3Mgb2YgdGhlIGBWSVRFX2AgcHJlZml4LlxuICAgIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgcHJvY2Vzcy5jd2QoKSwgXCJcIik7XG4gICAgY29uc3QgY29uZmlnID0ge1xuICAgICAgICBzZXJ2ZXI6IHtcbiAgICAgICAgICAgIGhvc3Q6IFwiMC4wLjAuMFwiLFxuICAgICAgICAgICAgcG9ydDogODA4MCxcbiAgICAgICAgICAgIGhtcjoge1xuICAgICAgICAgICAgICAgIC8vIHdvcmthcm91bmQgZm9yIGRldmVsb3BtZW50IGluIGRvY2tlclxuICAgICAgICAgICAgICAgIGNsaWVudFBvcnQ6IDgwLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHdhdGNoOiB7XG4gICAgICAgICAgICAgICAgaWdub3JlZDogW1wiLi9zcmMvcHVzaGVyXCJdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgYnVpbGQ6IHtcbiAgICAgICAgICAgIHNvdXJjZW1hcDogZW52LkdFTkVSQVRFX1NPVVJDRU1BUCAhPT0gXCJmYWxzZVwiLFxuICAgICAgICAgICAgb3V0RGlyOiBcIi4vZGlzdC9wdWJsaWNcIixcbiAgICAgICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBwbHVnaW5zOiBbbWVkaWFwaXBlX3dvcmthcm91bmQoKV0sXG4gICAgICAgICAgICAgICAgLy8gZXh0ZXJuYWw6IFtcIkBtZWRpYXBpcGUvdGFza3MtdmlzaW9uXCJdLFxuICAgICAgICAgICAgICAgIC8vcGx1Z2luczogW2luamVjdCh7IEJ1ZmZlcjogW1wiYnVmZmVyL1wiLCBcIkJ1ZmZlclwiXSB9KV0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYXNzZXRzSW5jbHVkZTogW1wiKiovKi50ZmxpdGVcIiwgXCIqKi8qLndhc21cIl0sXG4gICAgICAgIH0sXG4gICAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgICAgIG5vZGVQb2x5ZmlsbHMoe1xuICAgICAgICAgICAgICAgIGluY2x1ZGU6IFtcImV2ZW50c1wiLCBcImJ1ZmZlclwiXSxcbiAgICAgICAgICAgICAgICBnbG9iYWxzOiB7XG4gICAgICAgICAgICAgICAgICAgIEJ1ZmZlcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBzdmVsdGUoe1xuICAgICAgICAgICAgICAgIHByZXByb2Nlc3M6IHN2ZWx0ZVByZXByb2Nlc3MoKSxcbiAgICAgICAgICAgICAgICBvbndhcm4od2FybmluZywgZGVmYXVsdEhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZG9uJ3Qgd2FybiBvbjpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHdhcm5pbmcuY29kZSA9PT0gXCJhMTF5LWNsaWNrLWV2ZW50cy1oYXZlLWtleS1ldmVudHNcIikgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICBpZiAod2FybmluZy5jb2RlID09PSBcInNlY3VyaXR5LWFuY2hvci1yZWwtbm9yZWZlcnJlclwiKSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIGlmICh3YXJuaW5nLmNvZGUgPT09IFwiVW5rbm93biBhdCBydWxlIEBjb250YWluZXIgKGNzcylcIikgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICBpZiAod2FybmluZy5tZXNzYWdlLmluY2x1ZGVzKFwiVW5rbm93biBhdCBydWxlIEBjb250YWluZXJcIikpIHJldHVybjtcblxuICAgICAgICAgICAgICAgICAgICAvLyBoYW5kbGUgYWxsIG90aGVyIHdhcm5pbmdzIG5vcm1hbGx5XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZWZhdWx0SGFuZGxlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdEhhbmRsZXIod2FybmluZyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBJY29ucyh7XG4gICAgICAgICAgICAgICAgY29tcGlsZXI6IFwic3ZlbHRlXCIsXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIC8vIENvbmRpdGlvbmFsIHBsdWdpbiBpbmNsdXNpb25cbiAgICAgICAgICAgIC4uLihlbnYuRElTQUJMRV9MRUdBQ1lfQlJPV1NFUlMgPT09IFwidHJ1ZVwiXG4gICAgICAgICAgICAgICAgPyBbXVxuICAgICAgICAgICAgICAgIDogW1xuICAgICAgICAgICAgICAgICAgICAgIGxlZ2FjeSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vdGFyZ2V0czogWydkZWZhdWx0cycsICdub3QgSUUgMTEnLCAnaU9TID4gMTQuMyddXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFN0cnVjdHVyZWQgY2xvbmUgaXMgbmVlZGVkIGZvciBTYWZhcmkgPCAxNS40XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHBvbHlmaWxsczogW1wid2ViLnN0cnVjdHVyZWQtY2xvbmVcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG1vZGVyblBvbHlmaWxsczogW1wid2ViLnN0cnVjdHVyZWQtY2xvbmVcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICBdKSxcbiAgICAgICAgICAgIHRzY29uZmlnUGF0aHMoKSxcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgYWxpYXM6IHtcbiAgICAgICAgICAgICAgICBldmVudHM6IFwiZXZlbnRzXCIsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICB0ZXN0OiB7XG4gICAgICAgICAgICBlbnZpcm9ubWVudDogXCJqc2RvbVwiLFxuICAgICAgICAgICAgZ2xvYmFsczogdHJ1ZSxcbiAgICAgICAgICAgIHNldHVwRmlsZXM6IFtcIi4vdGVzdHMvc2V0dXAvdml0ZXN0LnNldHVwLnRzXCJdLFxuICAgICAgICAgICAgY292ZXJhZ2U6IHtcbiAgICAgICAgICAgICAgICBhbGw6IHRydWUsXG4gICAgICAgICAgICAgICAgaW5jbHVkZTogW1wic3JjLyoudHNcIiwgXCJzcmMvKiovKi50c1wiXSxcbiAgICAgICAgICAgICAgICBleGNsdWRlOiBbXCJzcmMvaTE4blwiLCBcInNyYy9lbnVtXCJdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgb3B0aW1pemVEZXBzOiB7XG4gICAgICAgICAgICBpbmNsdWRlOiBbXCJvbG1cIl0sXG4gICAgICAgICAgICBleGNsdWRlOiBbXCJzdmVsdGUtbW9kYWxzXCJdLFxuICAgICAgICAgICAgZXNidWlsZE9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBkZWZpbmU6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsOiBcImdsb2JhbFRoaXNcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICB9O1xuXG4gICAgaWYgKGVudi5TRU5UUllfT1JHICYmIGVudi5TRU5UUllfUFJPSkVDVCAmJiBlbnYuU0VOVFJZX0FVVEhfVE9LRU4gJiYgZW52LlNFTlRSWV9SRUxFQVNFICYmIGVudi5TRU5UUllfRU5WSVJPTk1FTlQpIHtcbiAgICAgICAgY29uc29sZS5pbmZvKFwiU2VudHJ5IHBsdWdpbiBlbmFibGVkXCIpO1xuICAgICAgICBjb25maWcucGx1Z2lucy5wdXNoKFxuICAgICAgICAgICAgc2VudHJ5Vml0ZVBsdWdpbih7XG4gICAgICAgICAgICAgICAgdXJsOiBlbnYuU0VOVFJZX1VSTCB8fCBcImh0dHBzOi8vc2VudHJ5LmlvL1wiLFxuICAgICAgICAgICAgICAgIG9yZzogZW52LlNFTlRSWV9PUkcsXG4gICAgICAgICAgICAgICAgcHJvamVjdDogZW52LlNFTlRSWV9QUk9KRUNULFxuICAgICAgICAgICAgICAgIC8vIFNwZWNpZnkgdGhlIGRpcmVjdG9yeSBjb250YWluaW5nIGJ1aWxkIGFydGlmYWN0c1xuICAgICAgICAgICAgICAgIHNvdXJjZW1hcHM6IHtcbiAgICAgICAgICAgICAgICAgICAgYXNzZXRzOiBcIi4vZGlzdC9wdWJsaWMvKipcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIEF1dGggdG9rZW5zIGNhbiBiZSBvYnRhaW5lZCBmcm9tIGh0dHBzOi8vc2VudHJ5LmlvL3NldHRpbmdzL2FjY291bnQvYXBpL2F1dGgtdG9rZW5zL1xuICAgICAgICAgICAgICAgIC8vIGFuZCBuZWVkcyB0aGUgYHByb2plY3Q6cmVsZWFzZXNgIGFuZCBgb3JnOnJlYWRgIHNjb3Blc1xuICAgICAgICAgICAgICAgIGF1dGhUb2tlbjogZW52LlNFTlRSWV9BVVRIX1RPS0VOLFxuICAgICAgICAgICAgICAgIC8vIE9wdGlvbmFsbHkgdW5jb21tZW50IHRoZSBsaW5lIGJlbG93IHRvIG92ZXJyaWRlIGF1dG9tYXRpYyByZWxlYXNlIG5hbWUgZGV0ZWN0aW9uXG4gICAgICAgICAgICAgICAgcmVsZWFzZToge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBlbnYuU0VOVFJZX1JFTEVBU0UsXG4gICAgICAgICAgICAgICAgICAgIGRlcGxveToge1xuICAgICAgICAgICAgICAgICAgICAgICAgZW52OiBlbnYuU0VOVFJZX0VOVklST05NRU5ULFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBmaW5hbGl6ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmluZm8oXCJTZW50cnkgcGx1Z2luIGRpc2FibGVkXCIpO1xuICAgIH1cbiAgICByZXR1cm4gY29uZmlnO1xufSk7XG5cbi8vIHVzZSB0byBmaXggdGhlIGJ1aWxkIGlzc3VlIHdpdGggbWVkaWFwaXBlID09PiBodHRwczovL2dpdGh1Yi5jb20vdGVuc29yZmxvdy90ZmpzL2lzc3Vlcy83MTY1XG4vLyBUT0RPOiByZW1vdmUgdGhpcyB3aGVuIHdlIG1pZ3JhdGUgdG8gbWVkaWFwaXBlL3Rhc2tzLXZpc2lvblxuZnVuY3Rpb24gbWVkaWFwaXBlX3dvcmthcm91bmQoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZTogXCJtZWRpYXBpcGVfd29ya2Fyb3VuZFwiLFxuICAgICAgICBsb2FkKGlkOiBzdHJpbmcpIHtcbiAgICAgICAgICAgIGlmIChiYXNlbmFtZShpZCkgPT09IFwic2VsZmllX3NlZ21lbnRhdGlvbi5qc1wiKSB7XG4gICAgICAgICAgICAgICAgbGV0IGNvZGUgPSBmcy5yZWFkRmlsZVN5bmMoaWQsIFwidXRmLThcIik7XG4gICAgICAgICAgICAgICAgY29kZSArPSBcImV4cG9ydHMuU2VsZmllU2VnbWVudGF0aW9uID0gU2VsZmllU2VnbWVudGF0aW9uO1wiO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGNvZGUgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBdU8sU0FBUyxnQkFBZ0I7QUFDaFEsT0FBTyxRQUFRO0FBQ2YsU0FBUyxjQUFjLGVBQWU7QUFDdEMsU0FBUyxjQUFjO0FBQ3ZCLFNBQVMsd0JBQXdCO0FBQ2pDLE9BQU8sWUFBWTtBQUNuQixTQUFTLHdCQUF3QjtBQUNqQyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxtQkFBbUI7QUFDMUIsU0FBUyxxQkFBcUI7QUFHOUIsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFHdEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBQzNDLFFBQU0sU0FBUztBQUFBLElBQ1gsUUFBUTtBQUFBLE1BQ0osTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sS0FBSztBQUFBO0FBQUEsUUFFRCxZQUFZO0FBQUEsTUFDaEI7QUFBQSxNQUNBLE9BQU87QUFBQSxRQUNILFNBQVMsQ0FBQyxjQUFjO0FBQUEsTUFDNUI7QUFBQSxJQUNKO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDSCxXQUFXLElBQUksdUJBQXVCO0FBQUEsTUFDdEMsUUFBUTtBQUFBLE1BQ1IsZUFBZTtBQUFBLFFBQ1gsU0FBUyxDQUFDLHFCQUFxQixDQUFDO0FBQUE7QUFBQTtBQUFBLE1BR3BDO0FBQUEsTUFDQSxlQUFlLENBQUMsZUFBZSxXQUFXO0FBQUEsSUFDOUM7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNMLGNBQWM7QUFBQSxRQUNWLFNBQVMsQ0FBQyxVQUFVLFFBQVE7QUFBQSxRQUM1QixTQUFTO0FBQUEsVUFDTCxRQUFRO0FBQUEsUUFDWjtBQUFBLE1BQ0osQ0FBQztBQUFBLE1BQ0QsT0FBTztBQUFBLFFBQ0gsWUFBWSxpQkFBaUI7QUFBQSxRQUM3QixPQUFPLFNBQVMsZ0JBQWdCO0FBRTVCLGNBQUksUUFBUSxTQUFTLG9DQUFxQztBQUMxRCxjQUFJLFFBQVEsU0FBUyxpQ0FBa0M7QUFDdkQsY0FBSSxRQUFRLFNBQVMsbUNBQW9DO0FBQ3pELGNBQUksUUFBUSxRQUFRLFNBQVMsNEJBQTRCLEVBQUc7QUFHNUQsY0FBSSxnQkFBZ0I7QUFDaEIsMkJBQWUsT0FBTztBQUFBLFVBQzFCO0FBQUEsUUFDSjtBQUFBLE1BQ0osQ0FBQztBQUFBLE1BQ0QsTUFBTTtBQUFBLFFBQ0YsVUFBVTtBQUFBLE1BQ2QsQ0FBQztBQUFBO0FBQUEsTUFFRCxHQUFJLElBQUksNEJBQTRCLFNBQzlCLENBQUMsSUFDRDtBQUFBLFFBQ0ksT0FBTztBQUFBO0FBQUE7QUFBQSxVQUdILFdBQVcsQ0FBQyxzQkFBc0I7QUFBQSxVQUNsQyxpQkFBaUIsQ0FBQyxzQkFBc0I7QUFBQSxRQUM1QyxDQUFDO0FBQUEsTUFDTDtBQUFBLE1BQ04sY0FBYztBQUFBLElBQ2xCO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDTCxPQUFPO0FBQUEsUUFDSCxRQUFRO0FBQUEsTUFDWjtBQUFBLElBQ0o7QUFBQSxJQUNBLE1BQU07QUFBQSxNQUNGLGFBQWE7QUFBQSxNQUNiLFNBQVM7QUFBQSxNQUNULFlBQVksQ0FBQywrQkFBK0I7QUFBQSxNQUM1QyxVQUFVO0FBQUEsUUFDTixLQUFLO0FBQUEsUUFDTCxTQUFTLENBQUMsWUFBWSxhQUFhO0FBQUEsUUFDbkMsU0FBUyxDQUFDLFlBQVksVUFBVTtBQUFBLE1BQ3BDO0FBQUEsSUFDSjtBQUFBLElBQ0EsY0FBYztBQUFBLE1BQ1YsU0FBUyxDQUFDLEtBQUs7QUFBQSxNQUNmLFNBQVMsQ0FBQyxlQUFlO0FBQUEsTUFDekIsZ0JBQWdCO0FBQUEsUUFDWixRQUFRO0FBQUEsVUFDSixRQUFRO0FBQUEsUUFDWjtBQUFBLE1BQ0o7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUVBLE1BQUksSUFBSSxjQUFjLElBQUksa0JBQWtCLElBQUkscUJBQXFCLElBQUksa0JBQWtCLElBQUksb0JBQW9CO0FBQy9HLFlBQVEsS0FBSyx1QkFBdUI7QUFDcEMsV0FBTyxRQUFRO0FBQUEsTUFDWCxpQkFBaUI7QUFBQSxRQUNiLEtBQUssSUFBSSxjQUFjO0FBQUEsUUFDdkIsS0FBSyxJQUFJO0FBQUEsUUFDVCxTQUFTLElBQUk7QUFBQTtBQUFBLFFBRWIsWUFBWTtBQUFBLFVBQ1IsUUFBUTtBQUFBLFFBQ1o7QUFBQTtBQUFBO0FBQUEsUUFHQSxXQUFXLElBQUk7QUFBQTtBQUFBLFFBRWYsU0FBUztBQUFBLFVBQ0wsTUFBTSxJQUFJO0FBQUEsVUFDVixRQUFRO0FBQUEsWUFDSixLQUFLLElBQUk7QUFBQSxVQUNiO0FBQUEsVUFDQSxVQUFVO0FBQUEsUUFDZDtBQUFBLE1BQ0osQ0FBQztBQUFBLElBQ0w7QUFBQSxFQUNKLE9BQU87QUFDSCxZQUFRLEtBQUssd0JBQXdCO0FBQUEsRUFDekM7QUFDQSxTQUFPO0FBQ1gsQ0FBQztBQUlELFNBQVMsdUJBQXVCO0FBQzVCLFNBQU87QUFBQSxJQUNILE1BQU07QUFBQSxJQUNOLEtBQUssSUFBWTtBQUNiLFVBQUksU0FBUyxFQUFFLE1BQU0sMEJBQTBCO0FBQzNDLFlBQUksT0FBTyxHQUFHLGFBQWEsSUFBSSxPQUFPO0FBQ3RDLGdCQUFRO0FBQ1IsZUFBTyxFQUFFLEtBQUs7QUFBQSxNQUNsQixPQUFPO0FBQ0gsZUFBTztBQUFBLE1BQ1g7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUNKOyIsCiAgIm5hbWVzIjogW10KfQo=
