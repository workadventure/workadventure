import type { Preview } from "@storybook/svelte-vite";

import "../src/front/style/index.css";

const preview: Preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },

        // The app is a dark UI: default the canvas to dark so light-on-dark components
        // (the whole design system) render on a realistic surface.
        backgrounds: {
            options: {
                dark: { name: "Dark", value: "#14161c" },
                light: { name: "Light", value: "#ffffff" },
            },
        },

        // WorkAdventure UI ships both full-screen and embedded in narrow side panels;
        // expose those sizes so overlays and menus can be checked where they actually run.
        viewport: {
            options: {
                embedded: { name: "Embedded panel", styles: { width: "420px", height: "720px" } },
                mobile: { name: "Mobile", styles: { width: "375px", height: "812px" } },
                desktop: { name: "Desktop", styles: { width: "1280px", height: "800px" } },
            },
        },

        a11y: {
            // 'todo' - show a11y violations in the test UI only
            // 'error' - fail CI on a11y violations
            // 'off' - skip a11y checks entirely
            test: "todo",
        },
    },

    initialGlobals: {
        backgrounds: { value: "dark" },
    },
};

export default preview;
