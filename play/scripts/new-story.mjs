// Scaffolds a colocated Storybook story for a component, so writing one costs ~10 seconds.
//
// Usage (from play/):  npm run new-story -- src/front/Components/UI/MyComponent.svelte

import { existsSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const componentPath = process.argv[2];
if (!componentPath || !componentPath.endsWith(".svelte") || componentPath.endsWith(".stories.svelte")) {
    console.error("Usage: npm run new-story -- <path/to/Component.svelte>");
    process.exit(1);
}
if (!existsSync(componentPath)) {
    console.error(`Component not found: ${componentPath}`);
    process.exit(1);
}

const name = basename(componentPath, ".svelte");
const dir = dirname(componentPath);
const storyPath = join(dir, `${name}.stories.svelte`);

if (existsSync(storyPath)) {
    console.error(`A story already exists: ${storyPath}`);
    process.exit(1);
}

// Title taxonomy (see play/AGENTS.md) derived from the component's folder.
function groupFor(folder) {
    if (folder.includes("/Components/UI")) return "Design System";
    if (folder.includes("/Components/Input")) return "Forms";
    if (/Toast|PopUp|Modal|Menu|Warning|Notification/.test(folder)) return "Feedback";
    return "Feature";
}

const title = `${groupFor(dir)}/${name.replace(/([a-z0-9])([A-Z])/g, "$1 $2")}`;

const template = `<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import ${name} from "./${name}.svelte";

    const { Story } = defineMeta({
        title: "${title}",
        component: ${name},
        tags: ["autodocs"],
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.firstElementChild).toBeInTheDocument();
    }}
/>
`;

writeFileSync(storyPath, template);
console.log(`Created ${storyPath}\nTitle: ${title}\nNow fill in argTypes / args / play assertions.`);
