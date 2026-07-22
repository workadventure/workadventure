// Story gate: every NEW component in the design-system layer (Components/UI and Components/Input)
// must ship with a colocated `*.stories.svelte`. Keeps Storybook coverage from regressing as the
// codebase grows. Runs in CI on pull requests; a no-op outside a PR (no base ref).
//
// Usage: node play/scripts/check-stories.mjs <base-sha>
// (run from the repository root)

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const base = process.argv[2];
if (!base) {
    console.log("Story gate: no base ref provided (not a pull request) — skipping.");
    process.exit(0);
}

// Components in these folders are the typed design-system layer and must always be story-ised.
const WATCHED = /^play\/src\/front\/Components\/(UI|Input)\/[^/]+\.svelte$/;

const addedFiles = execSync(`git diff --name-only --diff-filter=A ${base}...HEAD`, { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);

const newComponents = addedFiles.filter((file) => WATCHED.test(file) && !file.endsWith(".stories.svelte"));

const missing = newComponents.filter((file) => !existsSync(file.replace(/\.svelte$/, ".stories.svelte")));

if (missing.length > 0) {
    console.error("Story gate: the following new design-system components have no Storybook story:\n");
    for (const file of missing) {
        console.error(`  - ${file}`);
        console.error(`    add ${file.replace(/\.svelte$/, ".stories.svelte")} (scaffold: cd play && npm run new-story -- <path>)`);
    }
    console.error("\nEvery new component in Components/UI or Components/Input must ship with a colocated *.stories.svelte.");
    process.exit(1);
}

console.log(`Story gate: OK — ${newComponents.length} new design-system component(s), all with a story.`);
