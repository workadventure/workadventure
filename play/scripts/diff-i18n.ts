import fs from "fs";
import path from "path";

// Usage:
//  - Single comparison: tsx scripts/diff-i18n.ts <target-locale> [source-locale]
//  - Summary mode (no args): tsx scripts/diff-i18n.ts
//  - Detailed check mode (CI/CD): tsx scripts/diff-i18n.ts --check
// Defaults: source = en-US
const args = process.argv.slice(2);
const isCheckMode = args.includes("--check");
// Filter out flags to get locale arguments
const localeArgs = args.filter((arg) => !arg.startsWith("--"));
const targetLocale = localeArgs[0];
const sourceLocale = localeArgs[1] || "en-US";

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
    // Use Object.keys() to only get own enumerable properties, not inherited ones
    for (const k of Object.keys(rec)) {
        // Skip prototype properties and functions
        if (typeof rec[k] === "function") continue;
        const v = rec[k];
        const full = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object" && !Array.isArray(v) && v.constructor === Object) {
            // Only recurse into plain objects, not class instances
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
        // Ensure we're working with a plain object, not a class instance or merged object
        const modObj = mod && typeof mod === "object" && mod.constructor === Object ? mod : {};
        const keys = deepKeys(modObj);
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
        // Ensure we're working with a plain object, not a class instance or merged object
        const tgtObj = tgt && typeof tgt === "object" && tgt.constructor === Object ? tgt : {};
        const tgtKeys = deepKeys(tgtObj);
        const missing = srcKeys.filter((k) => !tgtKeys.includes(k));
        missingKeys += missing.length;
    }
    return { missingKeys, missingFiles };
}

async function runDetailedCheck() {
    const baseDir = path.resolve(__dirname, "../src/i18n");
    let hasErrors = 0;

    console.log("=== RECENSEMENT COMPLET DES FICHIERS INCOMPLETS ===");
    console.log("");
    console.log("📁 Détection automatique des langues dans src/i18n/...");

    const languages = listLocaleDirs(baseDir, sourceLocale);
    const langCount = languages.length;
    console.log(`✅ Langues détectées: ${langCount}`);
    console.log(`   ${languages.join(" ")}`);
    console.log("");
    console.log("📄 Fichier de référence: en-US");
    console.log("");

    // Get all reference files
    const referenceFiles = listFiles(srcDir).filter((f) => f !== "index.ts");

    // Preload all source modules
    const srcModules = await preloadSourceModules(srcDir);

    // Process each reference file
    for (const file of referenceFiles) {
        const { keys: refKeys, count: refKeyCount } = srcModules.get(file) || { keys: [], count: 0 };

        if (refKeyCount === 0) {
            continue;
        }

        console.log(`📄 ${file} (en-US: ${refKeyCount} clés):`);
        let incompleteFound = false;

        // Check each language
        for (const lang of languages) {
            const langFile = path.join(baseDir, lang, file);

            if (!fs.existsSync(langFile)) {
                console.log(`  ❌ ${lang}: FICHIER MANQUANT`);
                incompleteFound = true;
                hasErrors = 1;
            } else {
                // eslint-disable-next-line no-await-in-loop
                const langMod = await loadModule(langFile);
                // Ensure we're working with a plain object, not a class instance or merged object
                const langObj = langMod && typeof langMod === "object" && langMod.constructor === Object ? langMod : {};
                const langKeys = deepKeys(langObj);
                const langKeyCount = langKeys.length;

                // Find missing keys
                const missingKeys = refKeys.filter((k) => !langKeys.includes(k));
                const missingCount = missingKeys.length;

                if (missingCount > 0 && refKeyCount > 0) {
                    const percentage = Math.floor((langKeyCount * 100) / refKeyCount);
                    console.log(
                        `  ⚠️  ${lang}: ${langKeyCount}/${refKeyCount} clés (${percentage}% complet, ${missingCount} clé(s) manquante(s))`
                    );
                    // Show first 15 missing keys
                    const keysToShow = missingKeys.slice(0, 15);
                    for (const key of keysToShow) {
                        console.log(`     - ${key}`);
                    }
                    if (missingCount > 15) {
                        const remaining = missingCount - 15;
                        console.log(`     ... et ${remaining} autre(s) clé(s)`);
                    }
                    incompleteFound = true;
                    hasErrors = 1;
                } else {
                    console.log(`  ✅ ${lang}: Toutes les clés présentes`);
                }
            }
        }

        if (!incompleteFound) {
            console.log("  ✅ Toutes les langues complètes");
        }
        console.log("");
    }

    // Summary by language
    console.log("=== RÉSUMÉ PAR LANGUE ===");
    console.log("");

    for (const lang of languages) {
        let totalFiles = 0;
        let completeFiles = 0;
        let missingFiles = 0;
        let incompleteFiles = 0;
        const incompleteFileNames: string[] = [];

        for (const file of referenceFiles) {
            const { keys: refKeys, count: refKeyCount } = srcModules.get(file) || {
                keys: [],
                count: 0,
            };

            if (refKeyCount === 0) {
                continue;
            }

            totalFiles += 1;

            const langFile = path.join(baseDir, lang, file);

            if (!fs.existsSync(langFile)) {
                missingFiles += 1;
            } else {
                // eslint-disable-next-line no-await-in-loop
                const langMod = await loadModule(langFile);
                // Ensure we're working with a plain object, not a class instance or merged object
                const langObj = langMod && typeof langMod === "object" && langMod.constructor === Object ? langMod : {};
                const langKeys = deepKeys(langObj);
                const missingKeys = refKeys.filter((k) => !langKeys.includes(k));
                const missingCount = missingKeys.length;

                if (missingCount > 0) {
                    incompleteFiles += 1;
                    incompleteFileNames.push(file);
                } else {
                    completeFiles += 1;
                }
            }
        }

        if (totalFiles > 0) {
            const completionRate = Math.floor((completeFiles * 100) / totalFiles);
            console.log(`🌍 ${lang}: ${completeFiles}/${totalFiles} fichiers complets (${completionRate}%)`);
            if (missingFiles > 0) {
                console.log(`   ❌ ${missingFiles} fichier(s) manquant(s)`);
                hasErrors = 1;
            }
            if (incompleteFiles > 0) {
                console.log(`   ⚠️  ${incompleteFiles} fichier(s) incomplet(s): ${incompleteFileNames.join(", ")}`);
                hasErrors = 1;
            }
        }
    }

    console.log("");
    if (hasErrors === 1) {
        console.log("❌ ERREUR: Des traductions sont incomplètes ou manquantes !");
        console.log("   Veuillez compléter les fichiers de traduction avant de continuer.");
        process.exitCode = 1;
    } else {
        console.log("✅ Toutes les traductions sont complètes !");
    }
}

async function run() {
    if (!fs.existsSync(srcDir)) {
        console.error(`Source locale folder not found: ${srcDir}`);
        process.exitCode = 1;
        return;
    }

    // Detailed check mode (CI/CD format)
    if (isCheckMode) {
        await runDetailedCheck();
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

        // Ensure we're working with a plain object, not a class instance or merged object
        const srcObj = src && typeof src === "object" && src.constructor === Object ? src : {};
        const srcKeys = deepKeys(srcObj);
        let tgtKeys: string[] = [];
        let tgtExists = false;

        if (fs.existsSync(tgtPath)) {
            tgtExists = true;
            //eslint-disable-next-line no-await-in-loop
            const tgt = await loadModule(tgtPath);
            // Ensure we're working with a plain object, not a class instance or merged object
            const tgtObj = tgt && typeof tgt === "object" && tgt.constructor === Object ? tgt : {};
            tgtKeys = deepKeys(tgtObj);
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
