// electron-builder's deb.afterInstall and deb.afterRemove replace its own scripts (/usr/bin link, chrome-sandbox,
// AppArmor profile) instead of adding to them. So the deb gets electron-builder's template followed by ours (the
// APT repository), written to build/deb-scripts/. Run after `npm run build` (postbuild).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const templates = join(dirname(createRequire(import.meta.url).resolve("app-builder-lib/package.json")), "templates/linux");
const out = new URL("../build/deb-scripts/", import.meta.url);

mkdirSync(out, { recursive: true });
for (const name of ["after-install.tpl", "after-remove.tpl"]) {
    // trimEnd: electron-builder's after-remove.tpl has no final newline.
    const theirs = readFileSync(join(templates, name), "utf8").trimEnd();
    const ours = readFileSync(new URL(name, import.meta.url), "utf8");
    writeFileSync(new URL(name, out), `${theirs}\n\n${ours}`);
}
