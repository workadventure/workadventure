import fs from "fs";
import path from "path";

// Usage:
//  - Single comparison: tsx scripts/diff-i18n.ts <target-locale> [source-locale]
//  - Summary mode (no args): tsx scripts/diff-i18n.ts
// Defaults: source = en-US
const args = process.argv.slice(2);
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

function listLocaleDirs(baseDir: string, exclude?: string): string[] {
    if (!fs.existsSync(baseDir)) return [];
    return fs
        .readdirSync(baseDir)
        .map((name) => path.join(baseDir, name))
        .filter((p) => {
            try {
                return fs.statSync(p).isDirectory();
            } catch {
                return false;
            }
        })
        .map((p) => path.basename(p))
        .filter((name) => (exclude ? name !== exclude : true));
}

async function preloadSourceModules(dir: string) {
    const files = listFiles(dir).filter((f) => f !== "index.ts");
    const map = new Map<string, { keys: string[]; count: number }>();
    for (const file of files) {
        const srcPath = path.join(dir, file);
        // eslint-disable-next-line no-await-in-loop
        const mod = await loadModule(srcPath);
        const keys = deepKeys(mod);
        map.set(file, { keys, count: keys.length });
    }
    return map;
}

async function computeMissingCountsForLocale(
    srcModules: Map<string, { keys: string[]; count: number }>,
    srcDir: string,
    localeDir: string
) {
    let missingKeys = 0;
    let missingFiles = 0;
    for (const [file, { keys: srcKeys, count }] of srcModules.entries()) {
        const tgtPath = path.join(localeDir, file);
        if (!fs.existsSync(tgtPath)) {
            missingKeys += count;
            missingFiles += 1;
            continue;
        }
        // eslint-disable-next-line no-await-in-loop
        const tgt = await loadModule(tgtPath);
        const tgtKeys = deepKeys(tgt);
        const missing = srcKeys.filter((k) => !tgtKeys.includes(k));
        missingKeys += missing.length;
    }
    return { missingKeys, missingFiles };
}

async function run() {
    if (!fs.existsSync(srcDir)) {
        console.error(`Source locale folder not found: ${srcDir}`);
        process.exitCode = 1;
        return;
    }
    // Summary mode when no target locale is provided
    if (!targetLocale) {
        const baseDir = path.resolve(__dirname, "../src/i18n");
        const locales = listLocaleDirs(baseDir, sourceLocale);

        if (locales.length === 0) {
            console.log(`No locales found to compare against ${sourceLocale}.`);
            return;
        }

        const srcModules = await preloadSourceModules(srcDir);

        const results: Array<{ locale: string; missingKeys: number; missingFiles: number }> = [];
        for (const locale of locales) {
            const localeDir = path.join(baseDir, locale);
            // eslint-disable-next-line no-await-in-loop
            const { missingKeys, missingFiles } = await computeMissingCountsForLocale(srcModules, srcDir, localeDir);
            results.push({ locale, missingKeys, missingFiles });
        }

        // Sort by missing keys desc
        results.sort((a, b) => b.missingKeys - a.missingKeys);

        console.log(`i18n diff summary (source: ${sourceLocale})`);
        for (const r of results) {
            console.log(
                `${r.locale}: ${r.missingKeys} missing keys${r.missingFiles ? `, ${r.missingFiles} missing files` : ""}`
            );
        }
        const totalMissing = results.reduce((acc, r) => acc + r.missingKeys, 0);
        if (totalMissing === 0) console.log("All locales are fully translated. ✅");
        console.log("\nTip: to view detailed missing keys for one locale, run: npm run i18n:diff -- <language-code>");
        return;
    }

    if (!fs.existsSync(tgtDir)) {
        console.error(`Target locale folder not found: ${tgtDir}`);
        process.exitCode = 1;
        return;
    }

    const srcFiles = listFiles(srcDir);
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
