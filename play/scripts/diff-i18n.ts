import fs from "fs";
import path from "path";

// Usage: tsx scripts/diff-i18n.ts <target-locale> [source-locale]
// Defaults: source = en-US; target is required
const args = process.argv.slice(2);
if (!args[0]) {
    console.error("Error: target locale is required.");
    console.error("Usage: tsx ./scripts/diff-i18n.ts <target-locale> [source-locale]");
    console.error("Example: npm run i18n:diff:locale -- fr-FR");
    process.exit(1);
}
const targetLocale = args[0];
const sourceLocale = args[1] || "en-US";

const srcDir = path.resolve(__dirname, `../src/i18n/${sourceLocale}`);
const tgtDir = path.resolve(__dirname, `../src/i18n/${targetLocale}`);

async function loadModule(file: string): Promise<unknown> {
    const mod = await import(file);
    // return default export when available, fallback to the module namespace
    return (mod as { default?: unknown }).default ?? mod;
}

function listFiles(dir: string) {
    return fs.readdirSync(dir).filter((f) => f.endsWith(".ts"));
}

function deepKeys(obj: unknown, prefix = ""): string[] {
    if (obj == null || typeof obj !== "object") return [];
    const rec = obj as Record<string, unknown>;
    const keys: string[] = [];
    for (const k of Object.keys(rec)) {
        const v = rec[k];
        const full = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object" && !Array.isArray(v)) {
            keys.push(...deepKeys(v, full));
        } else {
            keys.push(full);
        }
    }
    return keys;
}

async function run() {
    if (!fs.existsSync(srcDir)) {
        console.error(`Source locale folder not found: ${srcDir}`);
        process.exitCode = 1;
        return;
    }
    if (!fs.existsSync(tgtDir)) {
        console.error(`Target locale folder not found: ${tgtDir}`);
        process.exitCode = 1;
        return;
    }

    const srcFiles = listFiles(srcDir);
    // const tgtFiles = listFiles(tgtDir); // not needed

    const report: string[] = [];

    for (const file of srcFiles) {
        const srcPath = path.join(srcDir, file);
        //eslint-disable-next-line no-await-in-loop
        const src = await loadModule(srcPath);
        if (file === "index.ts") continue;

        const baseName = path.basename(file);
        const tgtPath = path.join(tgtDir, baseName);

        const srcKeys = deepKeys(src);
        let tgtKeys: string[] = [];
        let tgtExists = false;

        if (fs.existsSync(tgtPath)) {
            tgtExists = true;
            //eslint-disable-next-line no-await-in-loop
            const tgt = await loadModule(tgtPath);
            tgtKeys = deepKeys(tgt);
        }

        const missing = srcKeys.filter((k) => !tgtKeys.includes(k));

        if (!tgtExists) {
            report.push(`[MISSING FILE] ${baseName}`);
        } else if (missing.length) {
            report.push(`Module ${baseName}:`);
            for (const k of missing) report.push(`  - ${k}`);
        }
    }

    if (report.length === 0) {
        console.log(`No missing keys between ${sourceLocale} -> ${targetLocale}. ✅`);
    } else {
        console.log(`Diff for ${sourceLocale} -> ${targetLocale}`);
        console.log(report.join("\n"));
        process.exitCode = 2;
    }
}

void run();
